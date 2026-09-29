/**
 * Spotlight için sistem ayarları dizini ve puanlı bulanık eşleşme.
 */

export type SettingEntry = { key: string; label: string; keywords: string[]; app: string };

export const SETTINGS_INDEX: SettingEntry[] = [
  { key: "theme", label: "Tema (Kristal · Yumuşak · Gece)", keywords: ["tema", "karanlık", "gece", "açık", "görünüm"], app: "wallpaper" },
  { key: "wallpaper", label: "Duvar kâğıdı", keywords: ["arka plan", "resim", "masaüstü"], app: "wallpaper" },
  { key: "sound", label: "Sistem sesleri / sessiz", keywords: ["ses", "sessiz", "mute", "bildirim"], app: "settings" },
  { key: "network", label: "Ağ ve mesh taşıyıcıları", keywords: ["ağ", "wifi", "mesh", "röle", "bağlantı"], app: "mesh" },
  { key: "security", label: "Güvenlik ve gizlilik", keywords: ["güvenlik", "gizlilik", "izin", "kilit"], app: "settings" },
  { key: "account", label: "Hesap ve profil", keywords: ["hesap", "profil", "kimlik", "telefon"], app: "settings" },
  { key: "device", label: "Cihaz ve donanım bilgisi", keywords: ["donanım", "cihaz", "iso", "düğüm"], app: "computer" },
  { key: "language", label: "Dil ve bölge", keywords: ["dil", "bölge", "saat", "tarih"], app: "settings" },
];

const norm = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "");

/** 0 = eşleşme yok. Önek > sözcük başı > içerme > sırasal alt dizi. */
export function fuzzyScore(query: string, text: string): number {
  const q = norm(query.trim());
  const t = norm(text);
  if (!q) return 1;
  if (t.startsWith(q)) return 100 - Math.min(40, t.length - q.length);
  if (t.split(/[\s·/().-]+/).some((w) => w.startsWith(q))) return 70;
  if (t.includes(q)) return 50;
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 20 : 0;
}

export function searchSettings(query: string): SettingEntry[] {
  return SETTINGS_INDEX.map((s) => ({
    s,
    score: Math.max(fuzzyScore(query, s.label), ...s.keywords.map((k) => fuzzyScore(query, k) - 5)),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}
