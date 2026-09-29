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

/** Yerinde müdahale edilebilen ya da incelenebilen OS katmanları. */
export type SystemTarget =
  | "tema"
  | "duvarkagidi"
  | "parlaklik"
  | "gecelsigi"
  | "ses"
  | "ayarlar"
  | "ag"
  | "cekirdek"
  | "vfs"
  | "guvenlik"
  | "performans"
  | "arayuz";

/** Salt inceleme (müdahale değil) yapılan katmanlar. */
export type InspectTarget = "ag" | "cekirdek" | "vfs" | "guvenlik" | "performans" | "arayuz";

export type SystemPatch =
  | { target: "tema"; theme?: "crystal" | "soft" | "night" }
  | { target: "duvarkagidi"; wallpaper?: string; auto?: boolean }
  | { target: "parlaklik"; delta: number }
  | { target: "gecelsigi"; on: boolean }
  | { target: "ses"; muted: boolean }
  | { target: "ayarlar" }
  | { target: InspectTarget };

export type Intent =
  | { mode: "uygulama"; reason: string }
  | { mode: "sistem"; patch: SystemPatch; reason: string }
  | { mode: "belirsiz"; reason: string };


const FOLD: Record<string, string> = {
  ı: "i",
  İ: "i",
  I: "i",
  ç: "c",
  ğ: "g",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Türkçe aksanları sadeleştirir; eşleşme deseni ASCII üzerinden yürür. */
const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/[ıİIçğöşüâîû]/g, (c) => FOLD[c] ?? c)
    .replace(/\s+/g, " ")

    .trim();

/** Bağımsız program talebini gösteren açık kalıplar. */
const APP_PATTERNS: RegExp[] = [
  /(yeni|sifirdan|bagimsiz|ayri)\s+(bir\s+)?(uygulama|app|program|pano|arac)/,
  /(uygulama|app|program|pano|arac)\s*(olustur|yap|uret|kur|yaz|gelistir|ekle)/,
  /(uygulamasi|programi|panosu)\s*(olustur|yap|uret|yaz)/,
  /\bapp\s*(olustur|yap)\b/,
];

/**
 * Semantik sözlük — günlük konuşma dili, şikâyet ve arzu kalıpları dahil.
 * Sıralama önemlidir: daha özgül katmanlar üstte yer alır.
 */
const TARGET_WORDS: Array<{ target: SystemTarget; words: string[] }> = [
  {
    target: "duvarkagidi",
    words: ["duvar kagidi", "duvar kagitlari", "wallpaper", "arka plan gorseli", "masaustu gorseli", "masaustu resmi"],
  },
  {
    target: "gecelsigi",
    words: ["gece isigi", "gece modu", "amber filtre", "gozum yaniyor", "gozlerim yaniyor", "mavi isik", "gece rahatsiz"],
  },
  {
    target: "parlaklik",
    words: ["parlaklik", "ekran isigi", "cok parlak", "cok karanlik", "ekran soluk", "isik fazla", "gozumu aliyor"],
  },
  {
    target: "ses",
    words: ["sistem sesi", "sistem sesleri", "ses efekti", "ses efektleri", "sessiz", "gurultu", "cok ses cikariyor", "bip sesi", "ses kisilsin"],
  },
  {
    target: "tema",
    words: ["tema", "gorunum", "renk paleti", "koyu mod", "acik mod", "karanlik mod", "renkler agir", "ferah bir gorunum", "renkleri degistir"],
  },
  {
    target: "ag",
    words: ["ag katmani", "mesh", "baglanti", "internet", "cihaz bulunamiyor", "cihaz gorunmuyor", "eslesme", "gecikme", "ping", "kopuyor", "webrtc", "topoloji"],
  },
  {
    target: "performans",
    words: ["yavas", "takiliyor", "donuyor", "kasiyor", "bellek", "ram", "performans", "fps", "akici degil", "hizlandir", "optimize"],
  },
  {
    target: "vfs",
    words: ["dosya sistemi", "vfs", "klasor", "depolama", "disk", "cop kutusu", "indirilenler", "dosyalarim", "kota"],
  },
  {
    target: "guvenlik",
    words: ["guvenlik", "izin", "yetki", "sandbox", "yalitim", "imza", "sifreleme", "gizlilik", "kalkan"],
  },
  {
    target: "cekirdek",
    words: ["cekirdek", "kernel", "wasm", "worker", "hakikat motoru", "dogrulama motoru", "zaman asimi", "watchdog"],
  },
  {
    target: "arayuz",
    words: ["pencere", "ikon", "dock", "gorev cubugu", "yazi boyutu", "arayuz", "masaustu duzeni", "izgara", "ust bar"],
  },
  { target: "ayarlar", words: ["ayarlar", "ayar paneli", "denetim merkezi", "sistem paneli"] },
];

const INSPECT_TARGETS: InspectTarget[] = ["ag", "cekirdek", "vfs", "guvenlik", "performans", "arayuz"];

const isInspect = (t: SystemTarget): t is InspectTarget => (INSPECT_TARGETS as SystemTarget[]).includes(t);


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

const OFF_RE = /\b(kapat|kapa|iptal|sustur|sessiz)\b/;
const ON_RE = /\b(ac|acik|etkinlestir|baslat|aktif)\b/;


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
    ag: "Ağ/mesh katmanı canlı ölçümlerle incelenir.",
    cekirdek: "Çekirdek ve WASM çalışma zamanı incelenir.",
    vfs: "Dosya sistemi (VFS) kotası ve ağacı incelenir.",
    guvenlik: "Güvenlik, izin ve yalıtım sınırları incelenir.",
    performans: "Bellek ve akıcılık göstergeleri incelenir.",
    arayuz: "Pencere ve masaüstü düzeni katmanı incelenir.",
  };
  return `${labels[target]} Yeni uygulama klasörü veya masaüstü ikonu oluşturulmaz.`;
}


function patchFor(target: SystemTarget, t: string): SystemPatch {
  if (isInspect(target)) return { target };
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
      return { target: "gecelsigi", on: !OFF_RE.test(t) };
    case "ses": {
      if (OFF_RE.test(t)) return { target: "ses", muted: true };
      if (ON_RE.test(t)) return { target: "ses", muted: false };
      return { target: "ses", muted: false };

    }
    case "ayarlar":
      return { target: "ayarlar" };
  }
}

export default classifyIntent;
