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

export type WebAppEntry = {
  id: string;
  label: string;
  hint: string;
  url: string;
  embed: EmbedPolicy;
};

export const WEB_APPS: WebAppEntry[] = [
  {
    id: "web.search",
    label: "Arama",
    hint: "Web araması",
    url: "https://duckduckgo.com/",
    embed: "auto",
  },
  {
    id: "web.search.g",
    label: "Google",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.google.com/",
    embed: "popup",
  },
  {
    id: "web.video",
    label: "Video",
    hint: "Video platformu",
    url: "https://www.youtube.com/",
    embed: "auto",
  },
  {
    id: "web.social.x",
    label: "X",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://x.com/",
    embed: "popup",
  },
  {
    id: "web.social.li",
    label: "LinkedIn",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.linkedin.com/",
    embed: "popup",
  },
  {
    id: "web.social.tt",
    label: "TikTok",
    hint: "Gömmeye kapalı — yeni sekmede açılır",
    url: "https://www.tiktok.com/",
    embed: "popup",
  },
  {
    id: "web.maps",
    label: "Harita",
    hint: "Açık kaynak harita",
    url: "https://www.openstreetmap.org/",
    embed: "auto",
  },
  {
    id: "web.docs",
    label: "Bilgi",
    hint: "Ansiklopedi",
    url: "https://tr.wikipedia.org/",
    embed: "auto",
  },
];

export function webApp(id: string): WebAppEntry | undefined {
  return WEB_APPS.find((a) => a.id === id);
}
