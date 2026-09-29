/** Seçili aralıktan bağımlılıksız SVG çubuk/çizgi grafik. */

import { X } from "lucide-react";

import { colName } from "./formula";

export type ChartKind = "bar" | "line";
type Rect = { c1: number; r1: number; c2: number; r2: number };

export function chartSeries(rect: Rect, value: (c: number, r: number) => string) {
  const labelled = Number.isNaN(Number(value(rect.c1, rect.r1))) && rect.c2 > rect.c1;
  const firstCol = labelled ? rect.c1 + 1 : rect.c1;
  const points: { label: string; v: number }[] = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    const v = Number(value(firstCol, r));
    if (!Number.isFinite(v)) continue;
    points.push({ label: labelled ? value(rect.c1, r) : `${colName(firstCol)}${r}`, v });
  }
  return points;
}

export function SheetChart({
  kind,
  rect,
  value,
  onClose,
}: {
  kind: ChartKind;
  rect: Rect;
  value: (c: number, r: number) => string;
  onClose: () => void;
}) {
  const pts = chartSeries(rect, value);
  const W = 420;
  const H = 200;
  const pad = 28;
  const max = Math.max(1, ...pts.map((p) => p.v));
  const min = Math.min(0, ...pts.map((p) => p.v));
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const step = pts.length ? (W - pad * 2) / pts.length : 0;

  return (
    <div
      className="absolute bottom-12 right-4 z-20 rounded-xl p-3 shadow-xl"
      style={{ background: "var(--tb-panel-solid)", border: "1px solid var(--border)" }}
      role="figure"
      aria-label="Tablo grafiği"
    >
      <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--tb-muted)]">
        <span>{kind === "bar" ? "Çubuk grafik" : "Çizgi grafik"} · {pts.length} değer</span>
        <button type="button" aria-label="Grafiği kapat" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {pts.length === 0 ? (
        <p className="px-4 py-8 text-[12px] text-[var(--tb-muted)]">Seçili aralıkta sayı yok.</p>
      ) : (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="var(--border)" />
          {kind === "bar"
            ? pts.map((p, i) => (
                <rect
                  key={i}
                  x={pad + i * step + step * 0.15}
                  width={step * 0.7}
                  y={Math.min(y(p.v), y(0))}
                  height={Math.abs(y(0) - y(p.v))}
                  fill="var(--tb-accent)"
                  rx={3}
                />
              ))
            : (
              <polyline
                fill="none"
                stroke="var(--tb-accent)"
                strokeWidth={2}
                points={pts.map((p, i) => `${pad + i * step + step / 2},${y(p.v)}`).join(" ")}
              />
            )}
          {pts.map((p, i) => (
            <text key={i} x={pad + i * step + step / 2} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--tb-muted)">
              {p.label.slice(0, 8)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
