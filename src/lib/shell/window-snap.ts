/**
 * KENARA YAPIŞMA (snap) HESABI
 * ------------------------------------------------------------------
 * İmleç ekran kenarına yaklaştığında pencerenin alacağı kutuyu döndürür.
 * Sürükleme sırasında önizleme, bırakıldığında yerleştirme için kullanılır.
 */

export type SnapBox = { x: number; y: number; w: number; h: number };

const EDGE = 24;

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
  return null;
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
