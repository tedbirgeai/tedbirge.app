/**
 * Writer belge dışa aktarımı — HTML temizleme, Word (.doc) paketi, A4 yazdırma/PDF.
 * Bağımlılık yoktur; hiçbir içerik ağa gönderilmez.
 */

const ALLOWED = new Set([
  "P", "BR", "H1", "H2", "H3", "H4", "B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI",
  "TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "IMG", "HR", "DIV", "SPAN", "FONT", "BLOCKQUOTE",
]);
const SAFE_ATTR = new Set(["style", "width", "height", "src", "colspan", "rowspan", "align", "face"]);

/** Betik, olay işleyicisi ve tehlikeli URL'leri ayıklar. DOM gerektirir. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (!ALLOWED.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META"].includes(child.tagName)) child.remove();
        else child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase();
        const v = attr.value.trim().toLowerCase();
        if (!SAFE_ATTR.has(name)) child.removeAttribute(attr.name);
        else if (name === "src" && !(v.startsWith("data:image/") || v.startsWith("blob:"))) child.removeAttribute(attr.name);
        else if (name === "style" && /expression|url\s*\(|javascript:/.test(v)) child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const escapeTitle = (t: string) => t.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function buildPrintableHtml(body: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeTitle(title)}</title><style>
@page{size:A4;margin:25mm 20mm}body{font-family:Georgia,serif;font-size:12pt;line-height:1.6;color:#111}
table{border-collapse:collapse}td,th{border:1px solid #999;padding:6px}img{max-width:100%}
</style></head><body>${sanitizeHtml(body)}</body></html>`;
}

/** Word'ün açtığı HTML tabanlı .doc belgesi. */
export function buildWordDoc(body: string, title: string): Blob {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeTitle(title)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>@page Section1{size:21cm 29.7cm;margin:2.5cm 2cm}div.Section1{page:Section1}</style></head><body><div class="Section1">${sanitizeHtml(body)}</div></body></html>`;
  return new Blob(["\ufeff", html], { type: "application/msword" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gizli iframe ile sistem yazdırma iletişim kutusunu açar (PDF olarak kaydet). */
export function printAsPdf(body: string, title: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return frame.remove();
  doc.open();
  doc.write(buildPrintableHtml(body, title));
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1500);
  }, 150);
}
