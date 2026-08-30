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
  /** Aynı içeriği gösteren, gömmeye izin veren eşdeğer adres (önce denenir). */
  embedUrl?: string;
  /** Tedbirge Geçidi üzerinden aktarılacak adres (true → `url` kullanılır). */
  proxy?: string | true;
  /** Marka logosunun çekileceği alan adı (adres farklıysa gerekir). */
  iconDomain?: string;
};

export const WEB_APPS: WebAppEntry[] = [
  {
    id: "web.search",
    category: "araclar",
    label: "Arama",
    hint: "Web araması",
    url: "https://duckduckgo.com/",
    embed: "auto",
    proxy: "https://lite.duckduckgo.com/lite/",
  },
  {
    id: "web.search.g",
    category: "araclar",
    label: "Google",
    hint: "Pencere içinde Google araması",
    url: "https://www.google.com/",
    embedUrl: "https://www.google.com/search?igu=1",
    embed: "popup",
    proxy: "https://lite.duckduckgo.com/lite/",
  },
  {
    id: "web.video",
    category: "sosyal",
    label: "Video",
    hint: "Pencere içinde video akışı",
    url: "https://www.youtube.com/",
    embedUrl: "https://yewtu.be/",
    embed: "auto",
  },
  {
    id: "web.social.x",
    category: "sosyal",
    label: "X",
    hint: "Pencere içinde zaman tüneli",
    url: "https://x.com/",
    iconDomain: "x.com",
    embedUrl: "https://syndication.twitter.com/srv/timeline-profile/screen-name/X",
    embed: "popup",
    proxy: "https://nitter.net/",
  },
  {
    id: "web.social.li",
    category: "sosyal",
    label: "LinkedIn",
    hint: "Profesyonel ağ",
    url: "https://www.linkedin.com/",
    embed: "popup",
  },
  {
    id: "web.social.tt",
    category: "sosyal",
    label: "TikTok",
    hint: "Pencere içinde kısa video",
    url: "https://www.tiktok.com/",
    embedUrl: "https://www.tiktok.com/embed/@tiktok",
    embed: "popup",
  },
  {
    id: "web.maps",
    category: "araclar",
    label: "Harita",
    hint: "Açık kaynak harita",
    url: "https://www.openstreetmap.org/",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.docs",
    category: "uretkenlik",
    label: "Bilgi",
    hint: "Ansiklopedi",
    url: "https://tr.wikipedia.org/",
    iconDomain: "wikipedia.org",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.mail",
    label: "Posta",
    hint: "Web posta istemcisi",
    url: "https://app.tuta.com/",
    iconDomain: "tuta.com",
    embed: "auto",
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
    iconDomain: "mozilla.org",
    category: "araclar",
  },
  {
    id: "web3.explorer",
    label: "Zincir Gezgini",
    hint: "Blok zinciri işlem sorgusu",
    url: "https://blockscout.com/",
    embed: "auto",
    proxy: true,
    category: "web3",
  },
  {
    id: "web3.ipfs",
    label: "IPFS Ağ Geçidi",
    hint: "Dağıtık dosya ağ geçidi",
    url: "https://ipfs.io/",
    embed: "auto",
    proxy: true,
    category: "web3",
  },
  {
    id: "web3.market",
    label: "Piyasa",
    hint: "Varlık fiyat takibi",
    url: "https://www.coingecko.com/",
    embed: "auto",
    proxy: true,
    category: "web3",
  },
  {
    id: "web.code",
    category: "uretkenlik",
    label: "GitHub",
    hint: "Kod depoları",
    url: "https://github.com/",
    embed: "popup",
    iconDomain: "github.com",
  },
  {
    id: "web.music",
    category: "sosyal",
    label: "Spotify",
    hint: "Müzik akışı",
    url: "https://open.spotify.com/",
    embed: "popup",
    iconDomain: "spotify.com",
  },
  {
    id: "web.wa",
    category: "sosyal",
    label: "WhatsApp Web",
    hint: "Tarayıcı istemcisi",
    url: "https://web.whatsapp.com/",
    embed: "popup",
    iconDomain: "whatsapp.com",
  },

  // --- Geçit üzerinden pencere içi çalışan kamusal servisler ---
  {
    id: "web.mdn",
    category: "uretkenlik",
    label: "Geliştirici Kılavuzu",
    hint: "Web teknolojileri belgeleri",
    url: "https://developer.mozilla.org/tr/",
    iconDomain: "mozilla.org",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.news.hn",
    category: "sosyal",
    label: "Teknoloji Haberleri",
    hint: "Topluluk haber akışı",
    url: "https://news.ycombinator.com/",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.topo",
    category: "araclar",
    label: "Topoğrafya",
    hint: "Yükselti ve arazi haritası",
    url: "https://opentopomap.org/",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.library",
    category: "uretkenlik",
    label: "Kütüphane",
    hint: "Açık kitap arşivi",
    url: "https://openlibrary.org/",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.papers",
    category: "uretkenlik",
    label: "Makaleler",
    hint: "Açık erişim bilimsel arşiv",
    url: "https://arxiv.org/",
    embed: "auto",
    proxy: true,
  },
  {
    id: "web.dict",
    category: "uretkenlik",
    label: "Sözlük",
    hint: "Açık sözlük",
    url: "https://tr.wiktionary.org/",
    iconDomain: "wiktionary.org",
    embed: "auto",
    proxy: true,
  },
];



export function webApp(id: string): WebAppEntry | undefined {
  return WEB_APPS.find((a) => a.id === id);
}
