/**
 * PENCERE UYKU MODU
 * Küçültülen pencere DOM'dan sökülmez (arka plan işleri sürsün diye);
 * gövde çizimi durdurulur ve animasyon döngüleri bu bağlamla duraklar.
 */
import { createContext, useContext, useEffect, useRef } from "react";

export const WindowSleepContext = createContext(false);

/** Pencere uykudaysa true. */
export function useWindowSuspended(): boolean {
  return useContext(WindowSleepContext);
}

/** Pencere uyanık ve sekme görünürken çalışan rAF döngüsü. */
export function useActiveFrame(cb: (dt: number) => void, fps = 60) {
  const sleeping = useWindowSuspended();
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (sleeping) return;
    let raf = 0;
    let last = 0;
    const min = 1000 / fps;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || t - last < min) return;
      ref.current(last ? t - last : min);
      last = t;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sleeping, fps]);
}
