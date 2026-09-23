/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * VEKTÖR SAAT (Vector Clock)
 * ------------------------------------------------------------------
 * Her düğüm kendi sayacını tutar; paketler görülen tüm sayaçları taşır.
 * Böylece iki kayıt arasında "önce/sonra/eşzamanlı" ilişkisi sunucu
 * otoritesi olmadan belirlenir. Ağ parçalandığında (partition) iki taraf
 * da bağımsız ilerler; birleşme anında eşzamanlı (concurrent) kayıtlar
 * deterministik bir kuralla çözülür — aynı veri her düğümde aynı sonucu
 * verir.
 */

export type VectorClock = Readonly<Record<string, number>>;

export type ClockOrder = "equal" | "ahead" | "behind" | "concurrent";

export function emptyClock(): VectorClock {
  return {};
}

/** Düğümün kendi sayacını bir artırır. */
export function tick(clock: VectorClock, node: string): VectorClock {
  return { ...clock, [node]: (clock[node] ?? 0) + 1 };
}

/** İki saatin düğüm bazında en yükseği (birleşim). */
export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const out: Record<string, number> = { ...a };
  for (const [node, value] of Object.entries(b)) {
    out[node] = Math.max(out[node] ?? 0, value);
  }
  return out;
}

/** a, b'ye göre nerede duruyor? */
export function compareClocks(a: VectorClock, b: VectorClock): ClockOrder {
  let aGreater = false;
  let bGreater = false;
  const nodes = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const node of nodes) {
    const left = a[node] ?? 0;
    const right = b[node] ?? 0;
    if (left > right) aGreater = true;
    else if (right > left) bGreater = true;
  }
  if (aGreater && bGreater) return "concurrent";
  if (aGreater) return "ahead";
  if (bGreater) return "behind";
  return "equal";
}

/** Karşı taraf bizden geride kalan düğümler — gönderilecek delta kapsamı. */
export function missingFrom(mine: VectorClock, theirs: VectorClock): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [node, value] of Object.entries(mine)) {
    const seen = theirs[node] ?? 0;
    if (value > seen) out[node] = seen;
  }
  return out;
}

/** Ağ parçalanması göstergesi: iki taraf birbirinden habersiz ilerlemiş. */
export function isPartitioned(a: VectorClock, b: VectorClock): boolean {
  return compareClocks(a, b) === "concurrent";
}

/** Saatin toplam ilerlemesi — özet/telemetri için. */
export function clockWeight(clock: VectorClock): number {
  return Object.values(clock).reduce((sum, value) => sum + value, 0);
}

/**
 * Eşzamanlı iki kayıt için deterministik kazanan.
 * Sıra: daha ağır saat → daha yüksek zaman → sözlük sırasında büyük özet.
 * Hiçbir adımda rastgelelik yoktur; her düğüm aynı kararı verir.
 */
export function resolveConcurrent<T extends { clock: VectorClock; at: number; digest: string }>(
  left: T,
  right: T,
): T {
  const lw = clockWeight(left.clock);
  const rw = clockWeight(right.clock);
  if (lw !== rw) return lw > rw ? left : right;
  if (left.at !== right.at) return left.at > right.at ? left : right;
  return left.digest >= right.digest ? left : right;
}
