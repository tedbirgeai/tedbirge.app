/**
 * Hesap tablosu içe/dışa aktarma: CSV ve XLSX (bağımlılıksız).
 * XLSX yazımı sıkıştırmasız ZIP, okuması tarayıcının deflate-raw çözücüsüyle.
 */

import { colIndex, colName, parseRef } from "./formula";

export type Cells = Record<string, string>;

function bounds(cells: Cells) {
  let maxC = -1;
  let maxR = 0;
  for (const [ref, v] of Object.entries(cells)) {
    if (!v) continue;
    const p = parseRef(ref);
    if (!p) continue;
    maxC = Math.max(maxC, p.c);
    maxR = Math.max(maxR, p.r);
  }
  return { maxC, maxR };
}

/** Formül enjeksiyonunu önlemek için tehlikeli önekleri kaçışlar. */
export function csvEscape(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+([.,]\d+)?$/.test(v)) v = `'${v}`;
  return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(cells: Cells, evaluated: (ref: string) => string): string {
  const { maxC, maxR } = bounds(cells);
  const rows: string[] = [];
  for (let r = 1; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) row.push(csvEscape(evaluated(`${colName(c)}${r}`)));
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

export function parseCsv(text: string): Cells {
  const cells: Cells = {};
  const delim = (text.split("\n")[0] ?? "").split(";").length > (text.split("\n")[0] ?? "").split(",").length ? ";" : ",";
  let r = 1;
  let c = 0;
  let cur = "";
  let q = false;
  const push = () => {
    if (cur !== "") cells[`${colName(c)}${r}`] = cur;
    cur = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) {
      push();
      c++;
    } else if (ch === "\n") {
      push();
      r++;
      c = 0;
    } else if (ch !== "\r") cur += ch;
  }
  push();
  return cells;
}

/* ---------------- ZIP ---------------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: Array<{ name: string; data: string }>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of all) {
    out.set(b, p);
    p += b.length;
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(buf: Uint8Array): Promise<Map<string, string>> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("Geçersiz XLSX");
  const count = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    const lstart = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = buf.subarray(lstart, lstart + csize);
    const data = method === 8 ? await inflateRaw(raw) : raw;
    out.set(name, dec.decode(data));
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/* ---------------- XLSX ---------------- */
const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toXlsx(cells: Cells, sheetName = "Sheet1"): Uint8Array {
  const { maxC, maxR } = bounds(cells);
  const rows: string[] = [];
  for (let r = 1; r <= maxR; r++) {
    const cs: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const ref = `${colName(c)}${r}`;
      const v = cells[ref];
      if (!v) continue;
      if (v.startsWith("=")) cs.push(`<c r="${ref}"><f>${xml(v.slice(1))}</f></c>`);
      else if (/^-?\d+(\.\d+)?$/.test(v)) cs.push(`<c r="${ref}"><v>${v}</v></c>`);
      else cs.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`);
    }
    rows.push(`<row r="${r}">${cs.join("")}</row>`);
  }
  const NS = "http://schemas.openxmlformats.org";
  return zipStore([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${NS}/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`,
    },
  ]);
}

const unxml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export async function parseXlsx(buf: Uint8Array): Promise<Cells> {
  const files = await unzip(buf);
  const shared: string[] = [];
  const ss = files.get("xl/sharedStrings.xml");
  if (ss)
    for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g))
      shared.push(unxml([...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const sheetKey = [...files.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const sheet = sheetKey ? files.get(sheetKey)! : "";
  const cells: Cells = {};
  for (const m of sheet.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1]!;
    const body = m[2] ?? "";
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    if (!ref || colIndex(ref.replace(/\d+/g, "")) < 0) continue;
    const t = /\bt="(\w+)"/.exec(attrs)?.[1];
    const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
    const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let val = "";
    if (f) val = `=${unxml(f)}`;
    else if (t === "s" && v !== undefined) val = shared[Number(v)] ?? "";
    else if (t === "inlineStr") val = unxml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
    else if (v !== undefined) val = unxml(v);
    if (val) cells[ref] = val;
  }
  return cells;
}
