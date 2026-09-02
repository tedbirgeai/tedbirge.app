/**
 * SAYFA NOKTALARI
 * ------------------------------------------------------------------
 * iOS tarzı yarı saydam sayfa göstergesi. Tek sayfa varsa gizlenir.
 */

export function PageDots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  if (count < 2) return null;
  return (
    <div
      className="pointer-events-auto flex items-center justify-center gap-2 py-2"
      role="tablist"
      aria-label="Masaüstü sayfaları"
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={`${i + 1}. sayfa`}
          onClick={() => onSelect(i)}
          className="grid h-6 w-6 place-items-center rounded-full"
        >
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[var(--tb-text)] transition-opacity"
            style={{ opacity: i === active ? 0.9 : 0.3 }}
          />
        </button>
      ))}
    </div>
  );
}
