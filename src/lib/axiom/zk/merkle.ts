/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * MERKLE DURUM AĞACI (FAZ 3)
 * ------------------------------------------------------------------
 * Her durum mutasyonu bir yaprak özetine indirilir; yapraklar ikili
 * ağaçta birleşerek tek kök özeti (state root) verir. Ham alan
 * değerleri ağaçta tutulmaz: yalnız özet taşınır, bu yüzden kanıt yolu
 * içeriği ifşa etmeden aidiyeti gösterir.
 *
 * Özetleme mevcut CID türevi (FNV-1a) ile aynıdır; kriptografik değil,
 * içerik adreslemedir ve aynı girdi her zaman aynı kökü verir.
 */

import { fnv1a64 } from "@/lib/axiom/verify/seal";

/** Boş ağacın kökü: sabit ve deterministik. */
export const EMPTY_ROOT = `zk:${fnv1a64("axiom:empty-state")}`;

/** Yaprak özeti: tür + özet gövdesi. Girdi metni burada tutulmaz. */
export function leafDigest(kind: string, payloadDigest: string): string {
  return `zk:${fnv1a64(`leaf|${kind}|${payloadDigest}`)}`;
}

/** İki kardeşi birleştirir; sıra anlamlıdır (sol|sağ). */
export function pairDigest(left: string, right: string): string {
  return `zk:${fnv1a64(`node|${left}|${right}`)}`;
}

/** Ağacın tüm katmanları: [0] yapraklar ... [n] kök. */
export function buildTree(leaves: readonly string[]): string[][] {
  if (leaves.length === 0) return [[EMPTY_ROOT]];
  const layers: string[][] = [[...leaves]];
  let current = layers[0] as string[];
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i] as string;
      // Tek sayıda düğümde son yaprak kendisiyle eşlenir (klasik Merkle dolgusu).
      const right = (current[i + 1] ?? left) as string;
      next.push(pairDigest(left, right));
    }
    layers.push(next);
    current = next;
  }
  return layers;
}

/** Kök özeti. */
export function merkleRoot(leaves: readonly string[]): string {
  const layers = buildTree(leaves);
  return (layers[layers.length - 1] as string[])[0] as string;
}

export type ProofNode = { side: "left" | "right"; digest: string };

/** Belirtilen yaprağın köke kadar kardeş özetleri. */
export function proofPath(leaves: readonly string[], index: number): ProofNode[] {
  if (index < 0 || index >= leaves.length) return [];
  const layers = buildTree(leaves);
  const path: ProofNode[] = [];
  let idx = index;
  for (let level = 0; level < layers.length - 1; level += 1) {
    const layer = layers[level] as string[];
    const isRight = idx % 2 === 1;
    const siblingIndex = isRight ? idx - 1 : idx + 1;
    const sibling = (layer[siblingIndex] ?? layer[idx]) as string;
    path.push({ side: isRight ? "left" : "right", digest: sibling });
    idx = Math.floor(idx / 2);
  }
  return path;
}

/** Kanıt yolunu yürütür: yaprak gerçekten bu köke mi ait? */
export function verifyProof(leaf: string, path: readonly ProofNode[], root: string): boolean {
  let acc = leaf;
  for (const node of path) {
    acc = node.side === "left" ? pairDigest(node.digest, acc) : pairDigest(acc, node.digest);
  }
  return acc === root;
}
