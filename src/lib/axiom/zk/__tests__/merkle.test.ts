import { describe, expect, it } from "vitest";

import {
  EMPTY_ROOT,
  buildTree,
  leafDigest,
  merkleRoot,
  proofPath,
  verifyProof,
} from "@/lib/axiom/zk/merkle";

const leaf = (n: number) => leafDigest("durum.yaz", `ozet-${n}`);

describe("Merkle durum ağacı", () => {
  it("boş ağaç sabit kök verir", () => {
    expect(merkleRoot([])).toBe(EMPTY_ROOT);
    expect(buildTree([])).toEqual([[EMPTY_ROOT]]);
  });

  it("aynı yapraklar aynı kökü verir (determinizm)", () => {
    const leaves = [leaf(1), leaf(2), leaf(3)];
    expect(merkleRoot(leaves)).toBe(merkleRoot([leaf(1), leaf(2), leaf(3)]));
  });

  it("yaprak sırası değişince kök değişir", () => {
    expect(merkleRoot([leaf(1), leaf(2)])).not.toBe(merkleRoot([leaf(2), leaf(1)]));
  });

  it("tek yapraklı ağacın kökü yaprağın kendisidir", () => {
    expect(merkleRoot([leaf(9)])).toBe(leaf(9));
  });

  it("kanıt yolu her yaprak için köke ulaşır", () => {
    const leaves = [leaf(1), leaf(2), leaf(3), leaf(4), leaf(5)];
    const root = merkleRoot(leaves);
    leaves.forEach((item, index) => {
      expect(verifyProof(item, proofPath(leaves, index), root)).toBe(true);
    });
  });

  it("yabancı yaprak kanıt yolundan geçmez", () => {
    const leaves = [leaf(1), leaf(2), leaf(3)];
    const root = merkleRoot(leaves);
    expect(verifyProof(leaf(99), proofPath(leaves, 0), root)).toBe(false);
  });

  it("aralık dışı indis boş yol döner", () => {
    expect(proofPath([leaf(1)], 5)).toEqual([]);
  });

  it("yaprak özeti ham gövdeyi taşımaz", () => {
    const digest = leafDigest("belge.kaydet", "gizli-icerik-ozeti");
    expect(digest).not.toContain("gizli");
    expect(digest.startsWith("zk:")).toBe(true);
  });
});
