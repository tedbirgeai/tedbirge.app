/**
 * HARİCİ WEB UYGULAMA KATALOĞU
 * ------------------------------------------------------------------
 * Kabuk kodunda hiçbir marka adı sabitlenmez: pencere yöneticisi ve
 * uygulama ızgarası yalnız bu veri listesini okur. Yeni bir hedef
 * eklemek için tek satır yeter, bileşen kodu değişmez.
 *
 * `embed` alanı gömme politikasını belirler:
 *  - "iframe" → doğrudan çerçeve içinde açılır
 *  - "popup"  → X-Frame-Options/CSP nedeniyle gömülemez, yeni sekmede açılır
 *  - "auto"   → önce çerçeve denenir, yüklenmezse otomatik yeni sekmeye düşer
 */

export type EmbedPolicy = "iframe" | "popup" | "auto";

/** Mağaza kategorileri: arayüzde sekme olarak listelenir. */
export type AppCategory = "sistem" | "sosyal" | "uretkenlik" | "araclar" | "web3";

export type WebAppEntry = {
  id: string;
  label: string;
  hint: string;
  url: string;
  embed: EmbedPolicy;
  category: AppCategory;
};

export const WEB_APPS: WebAppEntry[] = [
  {
    id: "web.search",
    category: "araclar",
    label: "Arama",
    hint: "Web araması",
    url: "https://duckduckgo.com/",
    embed: "auto",
  },
  {
    id: "web.search.g",
    category: "araclar",
    label: "Google",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.google.com/",
    embed: "popup",
  },
  {
    id: "web.video",
    category: "sosyal",
    label: "Video",
    hint: "Video platformu",
    url: "https://www.youtube.com/",
    embed: "auto",
  },
  {
    id: "web.social.x",
    category: "sosyal",
    label: "X",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://x.com/",
    embed: "popup",
  },
  {
    id: "web.social.li",
    category: "sosyal",
    label: "LinkedIn",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.linkedin.com/",
    embed: "popup",
  },
  {
    id: "web.social.tt",
    category: "sosyal",
    label: "TikTok",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.tiktok.com/",
    embed: "popup",
  },
  {
    id: "web.maps",
    category: "araclar",
    label: "Harita",
    hint: "Açık kaynak harita",
    url: "https://www.openstreetmap.org/",
    embed: "auto",
  },
  {
    id: "web.docs",
    category: "uretkenlik",
    label: "Bilgi",
    hint: "Ansiklopedi",
    url: "https://tr.wikipedia.org/",
    embed: "auto",
  },
  {
    id: "web.mail",
    label: "Posta",
    hint: "Web posta istemcisi",
    url: "https://app.tuta.com/",
    embed: "popup",
    category: "uretkenlik",
  },
  {
    id: "web.notes",
    label: "Notlar",
    hint: "Hızlı not defteri",
    url: "https://dontpad.com/tedbirge",
    embed: "auto",
    category: "uretkenlik",
  },
  {
    id: "web.translate",
    label: "Çeviri",
    hint: "Açık kaynak çeviri",
    url: "https://translate.mozilla.org/",
    embed: "auto",
    category: "araclar",
  },
  {
    id: "web3.explorer",
    label: "Zincir Gezgini",
    hint: "Blok zinciri işlem sorgusu",
    url: "https://blockscout.com/",
    embed: "auto",
    category: "web3",
  },
  {
    id: "web3.ipfs",
    label: "IPFS Ağ Geçidi",
    hint: "Dağıtık dosya ağ geçidi",
    url: "https://ipfs.io/",
    embed: "auto",
    category: "web3",
  },
  {
    id: "web3.market",
    label: "Piyasa",
    hint: "Varlık fiyat takibi",
    url: "https://www.coingecko.com/",
    embed: "popup",
    category: "web3",
  },
];

export function webApp(id: string): WebAppEntry | undefined {
  return WEB_APPS.find((a) => a.id === id);
}
