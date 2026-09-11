/**
 * XDG UYGULAMA KATEGORİLERİ (freedesktop.org)
 * ------------------------------------------------------------------
 * Mağaza, başlatıcı ve evrensel arama tek kategori kaynağını okur.
 * Kategoriler freedesktop.org menü spesifikasyonundaki ana başlıklarla
 * birebir eşleşir; arayüzde Türkçe etiketleri gösterilir.
 *
 * Eski beş kategori (sistem / sosyal / uretkenlik / araclar / web3)
 * katalogda korunur; buradaki eşleme onları XDG başlıklarına taşır.
 * Böylece cihazda kayıtlı kurulu uygulama listesi bozulmaz.
 */

import type { AppCategory } from "@/shell/web-apps";

export type XdgCategory =
  | "Development"
  | "Office"
  | "System"
  | "Network"
  | "Utility"
  | "Graphics"
  | "AudioVideo"
  | "Education";

/** Arayüzde gösterilen sıra (mağaza sekmeleri bu sırayı izler). */
export const XDG_ORDER: XdgCategory[] = [
  "Development",
  "Office",
  "System",
  "Network",
  "Utility",
  "Graphics",
  "AudioVideo",
  "Education",
];

export const XDG_LABELS: Record<XdgCategory, string> = {
  Development: "Geliştirme",
  Office: "Ofis",
  System: "Sistem",
  Network: "Ağ",
  Utility: "Araçlar",
  Graphics: "Grafik",
  AudioVideo: "Medya",
  Education: "Eğitim",
};

/** Kategorinin kısa açıklaması (mağaza sekmesi ipucu). */
export const XDG_HINTS: Record<XdgCategory, string> = {
  Development: "Geliştirme, SDK ve Wasm araçları",
  Office: "Belge, tablo, sunu ve üretkenlik",
  System: "Sistem, güvenlik ve yönetim",
  Network: "P2P iletişim, mesh ve bağlantı",
  Utility: "Dosya, finans ve günlük araçlar",
  Graphics: "Grafik ve tasarım",
  AudioVideo: "Ses, video ve yayın",
  Education: "Eğitim, bilgi ve simülasyon",
};

/** Eski (v1) kategorilerin XDG karşılığı. */
const LEGACY: Record<AppCategory, XdgCategory> = {
  sistem: "System",
  sosyal: "Network",
  uretkenlik: "Office",
  araclar: "Utility",
  web3: "Network",
};

/**
 * Uygulama bazlı düzeltmeler: eski kategori kaba kalıyorsa doğru XDG
 * başlığı burada tanımlanır. Anahtar = katalog kimliği.
 */
const OVERRIDES: Record<string, XdgCategory> = {
  // Ağ / iletişim
  messenger: "Network",
  calls: "Network",
  mesh: "Network",
  relay: "Network",
  transfer: "Network",
  "web.mail": "Network",
  "web.wa": "Network",
  "web.social.x": "Network",
  "web.social.li": "Network",
  "web.social.tt": "Network",

  // Medya
  media: "AudioVideo",
  music: "AudioVideo",
  "web.video": "AudioVideo",
  "web.music": "AudioVideo",

  // Ofis
  writer: "Office",
  sheets: "Office",
  slides: "Office",
  notes: "Office",
  organizer: "Office",
  pdf: "Office",
  "web.notes": "Office",

  // Geliştirme
  terminal: "Development",
  apps: "Development",
  "web.code": "Development",
  "web.mdn": "Development",

  // Araçlar
  files: "Utility",
  "web.search": "Utility",
  "web.search.g": "Utility",
  "web.maps": "Utility",
  "web.topo": "Utility",
  "web.translate": "Utility",
  "web3.market": "Utility",
  "web3.explorer": "Utility",
  "web3.ipfs": "Utility",

  // Eğitim / bilgi
  "web.docs": "Education",
  "web.library": "Education",
  "web.papers": "Education",
  "web.dict": "Education",
  news: "Education",
  "web.news.hn": "Education",

  // Grafik
  wallpaper: "Graphics",
};

/** Bir katalog kaydının XDG kategorisi. */
export function xdgCategory(id: string, legacy: AppCategory): XdgCategory {
  return OVERRIDES[id] ?? LEGACY[legacy] ?? "Utility";
}

export function xdgLabel(category: XdgCategory): string {
  return XDG_LABELS[category];
}
