/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * BELLEK VE DEPOLAMA GÖSTERGESİ
 * ------------------------------------------------------------------
 * Sanal RAM (LRU ispat önbelleği), sanal ROM (değişmez aksiyon tabanı)
 * ve gerçek/tahmini yığın ölçümü tek satırda gösterilir. Tahmini değer
 * asla ölçüm gibi sunulmaz.
 */

import { formatBytes, type MemorySample } from "@/lib/axiom/profiler";
import type { RamStats } from "@/lib/axiom/ram";
import type { RomStatus } from "@/lib/axiom/rom";

type Props = {
  ram: RamStats;
  rom: RomStatus | null;
  heap: MemorySample;
  mode: string;
};

function Cell({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel)] px-3 py-2">
      <div className="truncate font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-muted)]">
        {label}
      </div>
      <div
        className={`truncate font-osmono text-[12px] ${
          warn ? "text-[var(--tb-rose-400)]" : "text-[var(--tb-text)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function MemoryProfiler({ ram, rom, heap, mode }: Props) {
  const pct = Math.round(ram.ratio * 100);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Cell
        label="Sanal RAM"
        value={`${formatBytes(ram.used)} / ${formatBytes(ram.limit)} (%${pct})`}
        warn={ram.ratio >= 0.8}
      />
      <Cell label="LRU tahliyesi" value={`${ram.evicted} kayıt · ${ram.entries} etkin`} />
      <Cell
        label="Sanal ROM"
        value={
          rom
            ? `${rom.blocks} blok · ${rom.persistent ? "kalıcı" : "geçici"}`
            : "hazırlanıyor…"
        }
        warn={!!rom && !rom.persistent}
      />
      <Cell
        label={heap.measured ? "Yığın (ölçüm)" : "Yığın (tahmini)"}
        value={`${formatBytes(heap.usedBytes)} / ${formatBytes(heap.limitBytes)}`}
      />
      <Cell label="Çizim kipi" value={mode} />
    </div>
  );
}
