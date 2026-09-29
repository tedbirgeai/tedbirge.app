/**
 * AXIOMSTUDIO PROJE BİÇİMİ
 * /repo/<slug>/tbapp.json + assembly/index.ts
 */

import { ALL_CAPABILITIES, type Capability } from "@/kernel/capabilities";

export type StudioManifest = {
  id: string;
  name: string;
  version: string;
  capabilities: Capability[];
  entry: string;
  description?: string;
};

export class StudioError extends Error {}

const ID_RE = /^[a-z0-9][a-z0-9.\-_]{2,63}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function isSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function parseStudioManifest(text: string): StudioManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new StudioError("tbapp.json geçerli JSON değil.");
  }
  const m = raw as Partial<StudioManifest>;
  if (!m || typeof m.id !== "string" || !ID_RE.test(m.id))
    throw new StudioError("Proje kimliği geçersiz.");
  if (typeof m.name !== "string" || !m.name.trim()) throw new StudioError("Proje adı eksik.");
  if (typeof m.version !== "string" || !/^\d+\.\d+\.\d+$/.test(m.version))
    throw new StudioError("Sürüm x.y.z biçiminde olmalı.");
  const caps = Array.isArray(m.capabilities) ? m.capabilities : [];
  const unknown = caps.filter((c) => !ALL_CAPABILITIES.includes(c as Capability));
  if (unknown.length) throw new StudioError(`Tanınmayan yetki: ${unknown.join(", ")}`);
  const entry = typeof m.entry === "string" && m.entry ? m.entry : "assembly/index.ts";
  if (entry.includes("..") || entry.startsWith("/"))
    throw new StudioError("Giriş dosyası proje dışında olamaz.");
  return {
    id: m.id,
    name: m.name.trim(),
    version: m.version,
    capabilities: caps as Capability[],
    entry,
    ...(m.description ? { description: String(m.description) } : {}),
  };
}

export type ProjectFile = { path: string; text: string };

const HOST = `// Tedbirge host arayüzü (yalnız bu içe aktarımlar vardır)
@external("tedbirge", "log") declare function host_log(ptr: usize, len: i32): void;
@external("tedbirge", "status_peers") declare function host_peers(): i32;
@external("tedbirge", "status_online") declare function host_online(): i32;

function log(msg: string): void {
  const buf = String.UTF8.encode(msg);
  host_log(changetype<usize>(buf), buf.byteLength);
}
`;

export type TemplateId = "merhaba" | "sayac" | "bos";

export const TEMPLATES: Record<TemplateId, { label: string; caps: Capability[]; code: string }> = {
  merhaba: {
    label: "Merhaba",
    caps: [],
    code: `${HOST}
export function start(): void {
  log("Merhaba, Tedbirge!");
}
`,
  },
  sayac: {
    label: "Eş sayacı",
    caps: ["status.read"],
    code: `${HOST}
export function start(): void {
  log("Çevrimiçi: " + (host_online() == 1 ? "evet" : "hayır"));
  log("Bağlı eş: " + host_peers().toString());
}
`,
  },
  bos: {
    label: "Boş",
    caps: [],
    code: `${HOST}
export function start(): void {}
`,
  },
};

export function templateFiles(slug: string, name: string, tpl: TemplateId): ProjectFile[] {
  if (!isSlug(slug))
    throw new StudioError("Proje adı yalnız küçük harf, rakam ve tire içerebilir.");
  const t = TEMPLATES[tpl];
  const manifest: StudioManifest = {
    id: `yerel.${slug}`,
    name,
    version: "0.1.0",
    capabilities: t.caps,
    entry: "assembly/index.ts",
  };
  return [
    { path: `${slug}/tbapp.json`, text: `${JSON.stringify(manifest, null, 2)}\n` },
    { path: `${slug}/assembly/index.ts`, text: t.code },
    {
      path: `${slug}/README.md`,
      text: `# ${name}\n\nAxiomStudio ile oluşturuldu. Derle → Çalıştır → Kur.\n`,
    },
  ];
}

/** Studio'nun kendini anlatan örnek projesi (düzenlenip yeniden paketlenebilir). */
export function seedStudioProject(): ProjectFile[] {
  const files = templateFiles("axiom-studio", "AxiomStudio Örnek", "sayac");
  return files.map((f) =>
    f.path.endsWith("README.md")
      ? {
          ...f,
          text: "# AxiomStudio örnek projesi\n\nBu proje Studio'nun kendi paket akışını gösterir: kodu düzenleyin, derleyin, yeni sürümü kurun.\nÇalışan WebOS'un derlenmiş kodu değiştirilmez.\n\n// @claim 2 = 2\n",
        }
      : f,
  );
}

/** `// @claim ...` satırlarını çıkarır. */
export function extractClaims(text: string): string[] {
  return [...text.matchAll(/\/\/\s*@claim\s+(.+)$/gm)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean);
}
