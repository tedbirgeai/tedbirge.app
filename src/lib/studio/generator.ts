/**
 * DOĞAL DİL → UYGULAMA ÜRETECİ (AxiomStudio)
 * ------------------------------------------------------------------
 * Kullanıcının serbest metinle yazdığı isteği çözümler ve cihazda
 * çalıştırılabilir bir uygulama tarifi üretir. Üretim tamamen yereldir:
 * hiçbir istek dışarıya çıkmaz, hiçbir kod `eval` ile çalıştırılmaz.
 *
 * Üretilen tarif üç parçadan oluşur:
 *  · bloklar    → arayüzün doğrulanmış yapı taşları (serbest JSX değil)
 *  · assembly   → AssemblyScript kaynağı (mevcut derleyici işçisiyle Wasm'a çevrilir)
 *  · manifest   → kimlik, sürüm ve istenen yetkiler
 *
 * Arayüz yalnız bilinen bloklardan kurulduğu için üretilen uygulama
 * kabuğun DOM'una, ağına veya depolamasına doğrudan erişemez.
 */

import type { Capability } from "@/kernel/capabilities";

export type UiBlock =
  | { kind: "baslik"; text: string }
  | { kind: "metin"; text: string }
  | { kind: "durum" }
  | { kind: "sayac"; label: string }
  | { kind: "hesap"; label: string; fn: string }
  | { kind: "not"; label: string }
  | { kind: "bildirim"; label: string; text: string }
  | { kind: "gunluk" };

export type GeneratedSpec = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  capabilities: Capability[];
  blocks: UiBlock[];
  /** AssemblyScript kaynağı (Wasm çekirdeği). */
  assembly: string;
  /** İsteği yazan kişinin özgün metni (kısaltılmış). */
  prompt: string;
  createdAt: number;
};

export class GeneratorError extends Error {}

/* ------------------------------ dil analizi ------------------------------ */

const WORDS = {
  durum: ["durum", "status", ["ağ", "ag"], "network", "mesh", "eş", "es", "peer", "çevrimiçi", "online", "bağlant", "connect"],
  hesap: ["hesap", "calc", "topla", "sum", "çarp", "carp", "multiply", "dönüş", "convert", "çevir", "cevir", "kur", "rate", "matematik", "math"],
  not: ["not", "note", "todo", "görev", "gorev", "task", "liste", "list", "hatırlat", "hatirlat", "memo"],
  bildirim: ["bildirim", "notification", "uyar", "alert", "alarm", "hatırlatıcı"],
  sayac: ["sayaç", "sayac", "counter", "count", "tekrar", "tally", "puan", "score"],
  gunluk: ["günlük", "gunluk", "log", "kayıt", "kayit", "çıktı", "cikti", "konsol", "console", "izle", "trace"],
} as const;

function normalize(text: string): string {
  return text.toLocaleLowerCase("tr-TR");
}

function mentions(text: string, keys: readonly (string | readonly string[])[]): boolean {
  const t = normalize(text);
  return keys.some((k) => (Array.isArray(k) ? k.some((x) => t.includes(x)) : t.includes(k as string)));
}

/** İstem metninden okunabilir bir uygulama adı türetir. */
export function nameFromPrompt(prompt: string): string {
  const clean = prompt
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) throw new GeneratorError("İstem boş; ne yapmasını istediğinizi yazın.");
  const words: string[] = [];
  for (const w of clean.split(" ")) {
    if (words.join(" ").length + w.length > 32) break;
    words.push(w);
    if (words.length === 4) break;
  }
  const base = words.join(" ") || clean.slice(0, 32);
  return base.charAt(0).toLocaleUpperCase("tr-TR") + base.slice(1);
}

const TR_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
};

export function slugify(text: string): string {
  const s = normalize(text)
    .split("")
    .map((c) => TR_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!s || !/^[a-z0-9]/.test(s)) throw new GeneratorError("İstemden geçerli bir uygulama adı çıkarılamadı.");
  return s;
}

/* ----------------------------- kod üretimi ------------------------------ */

const HOST_HEADER = `// Tedbirge çekirdek köprüsü — yalnız bu içe aktarımlar vardır.
@external("tedbirge", "log") declare function host_log(ptr: usize, len: i32): void;
@external("tedbirge", "status_peers") declare function host_peers(): i32;
@external("tedbirge", "status_online") declare function host_online(): i32;

function log(msg: string): void {
  const buf = String.UTF8.encode(msg);
  host_log(changetype<usize>(buf), buf.byteLength);
}
`;

function assemblyFor(blocks: readonly UiBlock[], name: string): string {
  const parts: string[] = [HOST_HEADER];
  const hesap = blocks.find((b) => b.kind === "hesap");
  if (hesap && hesap.kind === "hesap") {
    parts.push(`export function ${hesap.fn}(a: f64, b: f64): f64 {
  return a + b;
}
`);
  }
  if (blocks.some((b) => b.kind === "sayac")) {
    parts.push(`let sayac: i32 = 0;

export function artir(adim: i32): i32 {
  sayac += adim;
  return sayac;
}

export function sifirla(): i32 {
  sayac = 0;
  return sayac;
}
`);
  }
  parts.push(`export function start(): void {
  log("${name.replace(/"/g, "'")} başlatıldı.");
  log("Çevrimiçi: " + (host_online() == 1 ? "evet" : "hayır"));
  log("Bağlı eş: " + host_peers().toString());
}
`);
  return parts.join("\n");
}

/** Blok listesinden okunabilir React kaynağı üretir (editörde gösterilir). */
export function tsxFor(spec: GeneratedSpec): string {
  const lines = spec.blocks.map((b) => {
    switch (b.kind) {
      case "baslik":
        return `      <Baslik>${b.text}</Baslik>`;
      case "metin":
        return `      <Metin>${b.text}</Metin>`;
      case "durum":
        return `      <CekirdekDurumu />   {/* host_online() · host_peers() */}`;
      case "sayac":
        return `      <Sayac label="${b.label}" wasm="artir" />`;
      case "hesap":
        return `      <Hesap label="${b.label}" wasm="${b.fn}" />`;
      case "not":
        return `      <NotDefteri label="${b.label}" />   {/* /apps/${spec.slug}/veri */}`;
      case "bildirim":
        return `      <BildirimDugmesi label="${b.label}" metin="${b.text}" />`;
      case "gunluk":
        return `      <WasmGunlugu />`;
    }
  });
  return `/**
 * ${spec.name} — AxiomStudio tarafından üretildi.
 * İstem: ${spec.prompt.slice(0, 120)}
 *
 * Bileşenler kabuk tarafından sağlanır; içe aktarma gerekmez.
 */
export default function ${spec.slug.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase())}() {
  return (
    <Pencere baslik="${spec.name}">
${lines.join("\n")}
    </Pencere>
  );
}
`;
}

/* ------------------------------- üretim --------------------------------- */

export const MAX_PROMPT = 600;

/** İstemi çözümler ve uygulama tarifini üretir. */
export function generateApp(prompt: string, now = Date.now()): GeneratedSpec {
  const text = prompt.trim();
  if (text.length < 4) throw new GeneratorError("İstem çok kısa; en az birkaç kelime yazın.");
  if (text.length > MAX_PROMPT) throw new GeneratorError(`İstem ${MAX_PROMPT} karakteri aşamaz.`);

  const name = nameFromPrompt(text);
  const slug = slugify(name);
  const blocks: UiBlock[] = [
    { kind: "baslik", text: name },
    { kind: "metin", text: text.slice(0, 220) },
  ];

  const wantDurum = mentions(text, WORDS.durum);
  if (wantDurum) blocks.push({ kind: "durum" });
  if (mentions(text, WORDS.hesap)) blocks.push({ kind: "hesap", label: "Hesapla", fn: "hesapla" });
  if (mentions(text, WORDS.sayac)) blocks.push({ kind: "sayac", label: "Sayaç" });
  if (mentions(text, WORDS.not)) blocks.push({ kind: "not", label: "Notlar" });
  if (mentions(text, WORDS.bildirim))
    blocks.push({ kind: "bildirim", label: "Bildir", text: `${name} hazır.` });

  // Hiçbir işlev anlaşılamadıysa temel pano üretilir (boş uygulama verilmez).
  if (blocks.length === 2) {
    blocks.push({ kind: "durum" }, { kind: "sayac", label: "Sayaç" });
  }
  blocks.push({ kind: "gunluk" });

  const capabilities: Capability[] = ["status.read"];
  const spec: GeneratedSpec = {
    id: `uretim.${slug}`,
    slug,
    name,
    description: text.slice(0, 160),
    version: "1.0.0",
    capabilities,
    blocks,
    assembly: assemblyFor(blocks, name),
    prompt: text.slice(0, MAX_PROMPT),
    createdAt: now,
  };
  return spec;
}

/** VFS'e yazılacak dosya listesi: /repo/apps/<slug>/… */
export function generatedFiles(spec: GeneratedSpec): Array<{ path: string; text: string }> {
  const dir = `apps/${spec.slug}`;
  return [
    {
      path: `${dir}/manifest.json`,
      text: JSON.stringify(
        {
          id: spec.id,
          name: spec.name,
          version: spec.version,
          description: spec.description,
          capabilities: spec.capabilities,
          entry: "assembly/index.ts",
          ui: spec.blocks,
          prompt: spec.prompt,
        },
        null,
        2,
      ),
    },
    { path: `${dir}/index.tsx`, text: tsxFor(spec) },
    { path: `${dir}/assembly/index.ts`, text: spec.assembly },
  ];
}

/** Manifest metnini tarifine geri çevirir (yeniden açılışta). */
export function parseGeneratedManifest(text: string): Pick<GeneratedSpec, "blocks"> {
  const raw = JSON.parse(text) as { ui?: unknown };
  const ui = Array.isArray(raw.ui) ? (raw.ui as UiBlock[]) : [];
  return { blocks: ui };
}
