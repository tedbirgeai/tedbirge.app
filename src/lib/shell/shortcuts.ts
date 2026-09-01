/**
 * KABUK KISAYOL YARDIMCILARI (Nielsen #7 — Esneklik ve Kısayollar)
 * ------------------------------------------------------------------
 * Klavyeyle pencere hizalama kutularını hesaplar ve kısayol listesini
 * arayüzde göstermek için tek kaynaktan sunar.
 */

export type Half = "left" | "right" | "full";

/** Klavye ile hizalamada pencerenin alacağı kutu. */
export function keyboardSnapBox(half: Half, area: { width: number; height: number }) {
  const halfW = Math.round(area.width / 2);
  if (half === "left") return { x: 0, y: 0, w: halfW, h: area.height };
  if (half === "right") return { x: halfW, y: 0, w: area.width - halfW, h: area.height };
  return { x: 0, y: 0, w: area.width, h: area.height };
}

export type Shortcut = { keys: string; label: string };

/** Ayarlar ekranında listelenen sistem kısayolları. */
export const SHELL_SHORTCUTS: Shortcut[] = [
  { keys: "Ctrl / ⌘ + Boşluk", label: "Evrensel arama" },
  { keys: "Alt + Tab", label: "Pencereler arasında geçiş" },
  { keys: "Ctrl + Z", label: "Son işlemi geri al" },
  { keys: "Super + ←", label: "Pencereyi sola yasla" },
  { keys: "Super + →", label: "Pencereyi sağa yasla" },
  { keys: "Super + ↑", label: "Pencereyi tam ekran yap" },
  { keys: "Super + D", label: "Masaüstünü göster / geri getir" },
  { keys: "Esc", label: "Açık paneli veya onay kutusunu kapat" },
];
