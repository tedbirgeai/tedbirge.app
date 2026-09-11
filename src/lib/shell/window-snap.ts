/**
 * KENARA YAPIŞMA (snap) VE AKILLI YERLEŞİM IZGARALARI
 * ------------------------------------------------------------------
 * İmleç ekran kenarına yaklaştığında pencerenin alacağı kutuyu döndürür.
 * Sürükleme sırasında önizleme, bırakıldığında yerleştirme için kullanılır.
 *
 * Kenar bölgeleri:
 *  - sol / sağ kenar        → yarım ekran (%50)
 *  - köşeler                → çeyrek ekran
 *  - üst kenar orta         → tam ekran
 *  - alt kenar (üç bölge)   → üçlü dikey yerleşim (%33)
 *  - alt kenar (dört bölge) → dörtlü dikey yerleşim (%25), geniş ekranda
 */

export type SnapBox = { x: number; y: number; w: number; h: number };

const EDGE = 24;
/** Dörtlü ızgaranın devreye girdiği en küçük yüzey genişliği. */
const QUAD_MIN_WIDTH = 1400;

export function snapBoxFor(
  clientX: number,
  clientY: number,
  area: { left: number; top: number; width: number; height: number },
): SnapBox | null {
  const relX = clientX - area.left;
  const relY = clientY - area.top;
  if (relX < 0 || relY < 0 || relX > area.width || relY > area.height) return null;

  const nearLeft = relX <= EDGE;
  const nearRight = relX >= area.width - EDGE;
  const nearTop = relY <= EDGE;
  const nearBottom = relY >= area.height - EDGE;
  const halfW = area.width / 2;
  const halfH = area.height / 2;

  if (nearTop && nearLeft) return { x: 0, y: 0, w: halfW, h: halfH };
  if (nearTop && nearRight) return { x: halfW, y: 0, w: halfW, h: halfH };
  if (nearBottom && nearLeft) return { x: 0, y: halfH, w: halfW, h: halfH };
  if (nearBottom && nearRight) return { x: halfW, y: halfH, w: halfW, h: halfH };
  if (nearTop) return { x: 0, y: 0, w: area.width, h: area.height };
  if (nearLeft) return { x: 0, y: 0, w: halfW, h: area.height };
  if (nearRight) return { x: halfW, y: 0, w: halfW, h: area.height };
  // Alt kenar: ekran genişliğine göre üçlü ya da dörtlü dikey ızgara.
  if (nearBottom) {
    const cols = area.width >= QUAD_MIN_WIDTH ? 4 : 3;
    const colW = area.width / cols;
    const index = Math.min(cols - 1, Math.max(0, Math.floor(relX / colW)));
    return { x: index * colW, y: 0, w: colW, h: area.height };
  }
  return null;
}

/** Ekranı eşit dikey sütunlara böler (klavye kısayolu ile yerleşim). */
export function gridColumns(count: number, area: { width: number; height: number }): SnapBox[] {
  const cols = Math.max(1, Math.min(4, Math.round(count)));
  const colW = area.width / cols;
  return Array.from({ length: cols }, (_, i) => ({
    x: i * colW,
    y: 0,
    w: colW,
    h: area.height,
  }));
}

/** Dokunsal geri bildirim (destekleyen cihazlarda). */
export function haptic(ms = 8) {
  if (typeof navigator === "undefined") return;
  const vibrate = (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate;
  try {
    vibrate?.call(navigator, ms);
  } catch {
    /* titreşim desteklenmiyorsa sessizce geçilir */
  }
}
