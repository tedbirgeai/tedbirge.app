/**
 * NİYET SINIFLANDIRICI (INTENT ROUTING)
 * ------------------------------------------------------------------
 * AxiomStudio ve sohbet konsolu iki modda çalışır:
 *
 *  Mod A — "uygulama": kullanıcı AÇIKÇA bağımsız yeni bir program istediğinde.
 *          Yalnız bu modda /repo/apps/<slug>/ açılır ve masaüstü/Dock kaydı yapılır.
 *  Mod B — "sistem": kullanıcı mevcut sistem bileşenlerini geliştirmek istediğinde.
 *          Yeni ikon üretilmez; ilgili çekirdek modül yerinde güncellenir.
 *
 * Belirsiz istekler "belirsiz" döner; kabuk kullanıcıdan onay ister.
 * Sınıflandırma tamamen yereldir ve deterministiktir (metin cihazdan çıkmaz).
 */

export type IntentMode = "uygulama" | "sistem" | "belirsiz";

export type SystemTarget = "tema" | "duvarkagidi" | "parlaklik" | "gecelsigi" | "ses" | "ayarlar";

export type SystemPatch =
  | { target: "tema"; theme?: "crystal" | "soft" | "night" }
  | { target: "duvarkagidi"; wallpaper?: string; auto?: boolean }
  | { target: "parlaklik"; delta: number }
  | { target: "gecelsigi"; on: boolean }
  | { target: "ses"; muted: boolean }
  | { target: "ayarlar" };

export type Intent =
  | { mode: "uygulama"; reason: string }
  | { mode: "sistem"; patch: SystemPatch; reason: string }
  | { mode: "belirsiz"; reason: string };

const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/[İI]/g, "i")
    .replace(/\s+/g, " ")
    .trim();

/** Bağımsız program talebini gösteren açık kalıplar. */
const APP_PATTERNS: RegExp[] = [
  /(yeni|sifirdan|bagimsiz|ayri)\s+(bir\s+)?(uygulama|app|program|pano|arac)/,
  /(uygulama|app|program|pano|arac)\s*(olustur|yap|uret|kur|yaz|gelistir|ekle)/,
  /(uygulamasi|programi|panosu)\s*(olustur|yap|uret|yaz)/,
  /\bapp\s*(olustur|yap)\b/,
];

/** Sistem bileşeni anahtar kelimeleri. */
const TARGET_WORDS: Array<{ target: SystemTarget; words: string[] }> = [
  { target: "duvarkagidi", words: ["duvar kagidi", "duvar kagitlari", "wallpaper", "arka plan gorseli", "masaustu gorseli"] },
  { target: "tema", words: ["tema", "gorunum", "renk paleti", "koyu mod", "acik mod", "karanlik mod"] },
  { target: "parlaklik", words: ["parlaklik", "ekran isigi"] },
  { target: "gecelsigi", words: ["gece isigi", "gece modu", "amber filtre"] },
  { target: "ses", words: ["sistem sesi", "sistem sesleri", "ses efekti", "ses efektleri", "sessiz"] },
  { target: "ayarlar", words: ["ayarlar", "ayar paneli", "denetim merkezi", "sistem paneli"] },
];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

function detectTarget(t: string): SystemTarget | null {
  for (const entry of TARGET_WORDS) if (has(t, entry.words)) return entry.target;
  return null;
}

function themeFrom(t: string): "crystal" | "soft" | "night" | undefined {
  if (has(t, ["koyu", "karanlik", "gece", "night"])) return "night";
  if (has(t, ["soft", "sade", "minimal", "gri"])) return "soft";
  if (has(t, ["kristal", "acik", "aydinlik", "crystal"])) return "crystal";
  return undefined;
}

const OFF_WORDS = ["kapat", "kapa", "iptal", "sessize alma", "ac sesi", "sesi ac"];
const ON_WORDS = ["ac", "etkinlestir", "baslat", "aktif"];

/** İstemi Mod A / Mod B / belirsiz olarak sınıflandırır. */
export function classifyIntent(prompt: string): Intent {
  const t = norm(prompt);
  if (!t) return { mode: "belirsiz", reason: "İstem boş." };

  const appAsk = APP_PATTERNS.some((re) => re.test(t));
  const target = detectTarget(t);

  if (target && !appAsk) {
    return { mode: "sistem", patch: patchFor(target, t), reason: reasonFor(target) };
  }
  if (appAsk) {
    return {
      mode: "uygulama",
      reason: "İstem açıkça bağımsız yeni bir program üretimi istiyor.",
    };
  }
  return {
    mode: "belirsiz",
    reason:
      "İstem ne mevcut bir sistem bileşenini ne de açıkça yeni bir programı işaret ediyor. Masaüstü kirlenmesin diye üretim yapılmadı.",
  };
}

function reasonFor(target: SystemTarget): string {
  const labels: Record<SystemTarget, string> = {
    tema: "Tema motoru yerinde güncellenir.",
    duvarkagidi: "Duvar kâğıdı motoru yerinde güncellenir.",
    parlaklik: "Ekran parlaklığı yerinde ayarlanır.",
    gecelsigi: "Gece ışığı katmanı yerinde ayarlanır.",
    ses: "Sistem ses motoru yerinde ayarlanır.",
    ayarlar: "Ayarlar paneli yerinde güncellenir.",
  };
  return `${labels[target]} Yeni uygulama klasörü veya masaüstü ikonu oluşturulmaz.`;
}

function patchFor(target: SystemTarget, t: string): SystemPatch {
  switch (target) {
    case "tema": {
      const theme = themeFrom(t);
      return theme ? { target: "tema", theme } : { target: "tema" };
    }
    case "duvarkagidi": {
      if (has(t, ["otomatik", "gun/gece", "gun gece", "saate gore"])) return { target: "duvarkagidi", auto: true };
      const named = ["ocean", "okyanus", "doga", "nature", "kristal", "crystal", "gece", "night", "neon", "mesh", "koyu", "dark"];
      const found = named.find((w) => t.includes(w));
      const map: Record<string, string> = {
        okyanus: "ocean",
        ocean: "ocean",
        doga: "nature",
        nature: "nature",
        kristal: "crystal",
        crystal: "crystal",
        gece: "night",
        night: "night",
        neon: "neon",
        mesh: "mesh",
        koyu: "dark",
        dark: "dark",
      };
      return found ? { target: "duvarkagidi", wallpaper: map[found] } : { target: "duvarkagidi" };
    }
    case "parlaklik":
      return { target: "parlaklik", delta: has(t, ["azalt", "dusur", "kis", "karart"]) ? -0.1 : 0.1 };
    case "gecelsigi":
      return { target: "gecelsigi", on: !has(t, OFF_WORDS) };
    case "ses": {
      if (has(t, OFF_WORDS)) return { target: "ses", muted: true };
      if (has(t, ON_WORDS)) return { target: "ses", muted: false };
      return { target: "ses", muted: true };
    }
    case "ayarlar":
      return { target: "ayarlar" };
  }
}

export default classifyIntent;
