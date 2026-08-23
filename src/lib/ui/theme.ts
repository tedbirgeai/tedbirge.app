/**
 * Tedbirge® WebOS arayüz teması.
 *
 * Tema yalnızca `document.documentElement.dataset.theme` üzerine yazılır;
 * tüm renkler CSS Custom Property'den okunduğu için tema değişimi saf CSS
 * yeniden boyamadır (sıfır React re-render).
 */

export const THEME_STORAGE_KEY = "tedbirge.theme";

export type ThemeId = "crystal" | "soft" | "night";

export const THEMES: ReadonlyArray<{ id: ThemeId; label: string; hint: string }> = [
  { id: "crystal", label: "Açık Kristal", hint: "Cam yüzey, yüksek okunabilirlik" },
  { id: "soft", label: "Açık Soft Minimal", hint: "Düşük kontrast, sade gri" },
  { id: "night", label: "Gece Modu", hint: "Saha ve düşük ışık" },
];

export const DEFAULT_THEME: ThemeId = "crystal";

function isTheme(value: string | null | undefined): value is ThemeId {
  return value === "crystal" || value === "soft" || value === "night";
}

/** Kayıtlı tercihi okur; okunamazsa varsayılana döner. */
export function getTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const active = document.documentElement.dataset["theme"];
  if (isTheme(active)) return active;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* depolama kapalı olabilir */
  }
  return DEFAULT_THEME;
}

/** Temayı uygular ve tercihi kalıcılaştırır. */
export function setTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["theme"] = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* depolama kapalı olabilir */
  }
}

/** İlk boyamadan önce çalışan senkron betik (FOUC önleyici). */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='crystal'&&t!=='soft'&&t!=='night'){t='${DEFAULT_THEME}';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='${DEFAULT_THEME}';}})();`;
