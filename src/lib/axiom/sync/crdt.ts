/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * CRDT SENKRONİZASYONU (LWW-Element-Set + vektör saat)
 * ------------------------------------------------------------------
 * Çevrimdışı üretilen mühür kayıtları ağa bağlanınca çakışmasız
 * birleşir. Birleşme sırası fark etmez (değişmeli, birleşmeli,
 * etkisiz-tekrarlı): aynı delta kümesi hangi sırayla uygulanırsa
 * uygulansın sonuç aynıdır.
 *
 * Çakışma kuralı: aynı anahtar için en yüksek (zaman, düğüm kimliği)
 * ikilisi kazanır; silme de bir yazımdır (tombstone).
 */

export type CrdtValue = {
  /** Kayıt gövdesi; yalnız klonlanabilir alanlar. */
  fields: Record<string, string | number | boolean | null>;
  /** Silindi mi (tombstone)? */
  deleted: boolean;
};

export type CrdtEntry = CrdtValue & {
  key: string;
  /** Mantıksal saat (düğüm başına artan). */
  clock: number;
  /** Eşitlikte kazananı belirleyen düğüm kimliği. */
  node: string;
};

export type CrdtState = {
  node: string;
  entries: Record<string, CrdtEntry>;
  /** Vektör saat: düğüm → görülen en yüksek saat. */
  vector: Record<string, number>;
};

export type CrdtDelta = {
  node: string;
  entries: CrdtEntry[];
};

export function createState(node: string): CrdtState {
  return { node, entries: {}, vector: { [node]: 0 } };
}

function dominates(next: CrdtEntry, current: CrdtEntry | undefined): boolean {
  if (!current) return true;
  if (next.clock !== current.clock) return next.clock > current.clock;
  return next.node > current.node;
}

/** Yerel yazım: saat bir artar, kayıt kendi düğümüne mühürlenir. */
export function put(
  state: CrdtState,
  key: string,
  fields: CrdtValue["fields"],
  deleted = false,
): CrdtState {
  const clock = (state.vector[state.node] ?? 0) + 1;
  const entry: CrdtEntry = { key, fields, deleted, clock, node: state.node };
  return {
    node: state.node,
    entries: { ...state.entries, [key]: entry },
    vector: { ...state.vector, [state.node]: clock },
  };
}

export function remove(state: CrdtState, key: string): CrdtState {
  return put(state, key, state.entries[key]?.fields ?? {}, true);
}

/** Karşı tarafın vektör saatine göre gönderilecek delta. */
export function delta(state: CrdtState, since: Record<string, number> = {}): CrdtDelta {
  const entries = Object.values(state.entries).filter((e) => e.clock > (since[e.node] ?? 0));
  return { node: state.node, entries };
}

/**
 * Delta uygulanır. Aynı delta birden çok kez uygulanabilir (idempotent);
 * eski delta yeni kaydı ezmez.
 */
export function apply(state: CrdtState, incoming: CrdtDelta): { state: CrdtState; applied: number } {
  let applied = 0;
  const entries = { ...state.entries };
  const vector = { ...state.vector };
  for (const entry of incoming.entries) {
    if (dominates(entry, entries[entry.key])) {
      entries[entry.key] = entry;
      applied += 1;
    }
    vector[entry.node] = Math.max(vector[entry.node] ?? 0, entry.clock);
  }
  return { state: { node: state.node, entries, vector }, applied };
}

/** İki durumun birleşimi; sıra bağımsızdır. */
export function merge(a: CrdtState, b: CrdtState): CrdtState {
  return apply(a, { node: b.node, entries: Object.values(b.entries) }).state;
}

/** Silinmemiş kayıtlar. */
export function live(state: CrdtState): CrdtEntry[] {
  return Object.values(state.entries).filter((e) => !e.deleted);
}

/** Aynı anahtara farklı düğümlerden gelen çakışma sayısı. */
export function conflicts(a: CrdtState, b: CrdtState): number {
  let count = 0;
  for (const [key, entry] of Object.entries(a.entries)) {
    const other = b.entries[key];
    if (other && other.node !== entry.node) count += 1;
  }
  return count;
}
