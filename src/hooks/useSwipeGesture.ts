/**
 * KAYDIRMA (SWIPE) JESTLERİ
 * ------------------------------------------------------------------
 * İki jest yardımcısı:
 *  - useSwipeGesture: yatay eksende kilitlenen, en az 30 px eşikli
 *    ayrık kaydırma (sağ/sol). Dikey sayfa kaydırmasıyla çakışmaz.
 *  - useEdgeBackGesture: ekranın sol %5'lik şeridinden başlayan
 *    sürüklemede pencereyi parmakla birlikte kaydırıp şeffaflaştırır;
 *    eşiği aşarsa geri (kapat) eylemini tetikler.
 *
 * Tüm görsel güncellemeler requestAnimationFrame içinde translate3d ile
 * yapılır; React durumu yalnızca jest bittiğinde değişir.
 */

import { useCallback, useEffect, useRef, type TouchEvent as ReactTouchEvent } from "react";

/** Yatay hareketin jest sayılması için gereken en küçük mesafe (px). */
export const SWIPE_THRESHOLD = 30;

export type SwipeDirection = "left" | "right";

type Point = { x: number; y: number };

/** Ayrık yatay kaydırma: eşik + eksen kilidi. */
export function useSwipeGesture(
  onSwipe: (dir: SwipeDirection) => void,
  threshold: number = SWIPE_THRESHOLD,
) {
  const start = useRef<Point | null>(null);
  const locked = useRef(false);

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    start.current = { x: t.clientX, y: t.clientY };
    locked.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const s = start.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      // Dikey hareket baskınsa jest iptal edilir; sayfa normal kayar.
      if (!locked.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
        start.current = null;
        return;
      }
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy)) locked.current = true;
    },
    [threshold],
  );

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      const s = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!s || !t || !locked.current) return;
      const dx = t.clientX - s.x;
      if (Math.abs(dx) < threshold) return;
      onSwipe(dx < 0 ? "left" : "right");
    },
    [onSwipe, threshold],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: () => (start.current = null) };
}

/**
 * Sol kenardan geri kaydırma. Verilen elemana doğrudan transform
 * uygulanır; bırakıldığında eşik aşılmışsa onBack çağrılır.
 */
export function useEdgeBackGesture(onBack: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const start = useRef<Point | null>(null);
  const dx = useRef(0);
  const locked = useRef(false);
  const frame = useRef(0);
  const backRef = useRef(onBack);
  backRef.current = onBack;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const paint = useCallback(() => {
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const w = window.innerWidth || 1;
      const p = Math.min(1, Math.max(0, dx.current / w));
      el.style.transition = "none";
      el.style.transform = `translate3d(${dx.current}px,0,0)`;
      el.style.opacity = String(1 - p * 0.6);
    });
  }, []);

  const reset = useCallback((animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? "transform 180ms ease-out, opacity 180ms ease-out" : "none";
    el.style.transform = "translate3d(0,0,0)";
    el.style.opacity = "1";
  }, []);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      const edge = (window.innerWidth || 0) * 0.05;
      if (t.clientX > edge) return;
      start.current = { x: t.clientX, y: t.clientY };
      dx.current = 0;
      locked.current = false;
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const s = start.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const mx = t.clientX - s.x;
      const my = t.clientY - s.y;
      if (!locked.current) {
        if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > SWIPE_THRESHOLD) {
          start.current = null;
          return;
        }
        if (mx < SWIPE_THRESHOLD || Math.abs(mx) <= Math.abs(my)) return;
        locked.current = true;
      }
      dx.current = Math.max(0, mx);
      paint();
    },
    [paint],
  );

  const finish = useCallback(() => {
    const wasLocked = locked.current;
    const moved = dx.current;
    start.current = null;
    locked.current = false;
    dx.current = 0;
    if (!wasLocked) return;
    if (moved > (window.innerWidth || 0) * 0.35) {
      reset(false);
      backRef.current();
      return;
    }
    reset(true);
  }, [reset]);

  return {
    ref,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: finish,
      onTouchCancel: finish,
    },
  };
}
