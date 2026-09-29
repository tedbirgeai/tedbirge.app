import { useEffect, useState } from "react";

/** Son 1 sn'deki kare sayısı ve en uzun kare süresi (ms). */
export function useFps(): { fps: number; worst: number } {
  const [v, setV] = useState({ fps: 0, worst: 0 });
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let worst = 0;
    let prev = performance.now();
    let start = prev;
    const tick = (t: number) => {
      frames++;
      worst = Math.max(worst, t - prev);
      prev = t;
      if (t - start >= 1000) {
        setV({ fps: Math.round((frames * 1000) / (t - start)), worst: Math.round(worst) });
        frames = 0;
        worst = 0;
        start = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return v;
}
