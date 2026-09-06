/**
 * TARİH · GÜN · SAAT WIDGET'I
 * ------------------------------------------------------------------
 * Ana ekranda cam kart üzerinde duran büyük saat. Telefonda tam
 * genişlik, masaüstünde sol üstte. Tüm renkler `--tb-*` token'larından.
 */

import { useTick } from "@/lib/shell/telemetry-store";

function parts(now: Date) {
  return {
    time: now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    day: now.toLocaleDateString("tr-TR", { weekday: "long" }),
    date: now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export function ClockWidget() {
  // Paylaşımlı zamanlayıcı: ayrı interval açılmaz.
  useTick(1);
  const p = parts(new Date());

  return (
    <section
      aria-label="Tarih ve saat"
      className="tbos-clock pointer-events-none absolute top-4 left-1/2 z-[5] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-3xl px-5 py-4 text-center sm:left-6 sm:w-auto sm:translate-x-0 sm:text-left"
    >
      <p className="font-osmono text-5xl leading-none font-semibold text-[var(--tb-text)] tabular-nums sm:text-6xl">
        {p.time}
      </p>
      <p className="mt-2 text-[15px] font-medium text-[var(--tb-text)]">{p.day}</p>
      <p className="font-osmono text-[12px] text-[var(--tb-muted)]">{p.date}</p>
    </section>
  );
}
