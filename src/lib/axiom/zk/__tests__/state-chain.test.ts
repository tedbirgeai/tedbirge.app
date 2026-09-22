import { beforeEach, describe, expect, it } from "vitest";

import { payloadDigest, recordVerifiedTransition } from "@/lib/axiom/zk/execute";
import { EMPTY_ROOT, verifyProof, proofPath } from "@/lib/axiom/zk/merkle";
import {
  CHAIN_KEEP,
  CHAIN_LIMIT,
  appendTransition,
  emptyChain,
  getChain,
  resetChain,
  type AppendInput,
} from "@/lib/axiom/zk/state-chain";
import type { VerifyResult } from "@/lib/axiom/verify/types";

const proven = (n: number): AppendInput => ({
  kind: "durum.yaz",
  payloadDigest: `ozet-${n}`,
  verdict: "200_PROVEN",
  seal: "TEDBİRGE-WEBOS-ZKP:0123456789abcdef",
  ms: 11,
});

describe("ardışık durum zinciri", () => {
  beforeEach(() => resetChain());

  it("boş zincir sabit kökle başlar", () => {
    expect(emptyChain().root).toBe(EMPTY_ROOT);
  });

  it("kanıtlanmış geçiş zincire bağlanır", () => {
    const first = appendTransition(emptyChain(), proven(1));
    expect(first.accepted).toBe(true);
    expect(first.transition?.previousRoot).toBe(EMPTY_ROOT);
    const second = appendTransition(first.chain, {
      ...proven(2),
      expectedPreviousRoot: first.chain.root,
    });
    expect(second.accepted).toBe(true);
    expect(second.transition?.previousRoot).toBe(first.chain.root);
    expect(second.transition?.seq).toBe(2);
  });

  it("bağ kopuksa geçiş reddedilir ve kök değişmez", () => {
    const first = appendTransition(emptyChain(), proven(1));
    const forked = appendTransition(first.chain, {
      ...proven(2),
      expectedPreviousRoot: "zk:yanlis",
    });
    expect(forked.accepted).toBe(false);
    expect(forked.chain.root).toBe(first.chain.root);
    expect(forked.chain.rejected).toBe(1);
  });

  it("çelişkili karar zinciri değiştirmez", () => {
    const out = appendTransition(emptyChain(), {
      ...proven(1),
      verdict: "409_REFUTED",
      seal: null,
    });
    expect(out.accepted).toBe(false);
    expect(out.chain.root).toBe(EMPTY_ROOT);
    expect(out.reason).toContain("çelişkili");
  });

  it("mühürsüz kararlar (kararsız, zaman aşımı, panik) zincire girmez", () => {
    for (const verdict of ["422_UNDECIDED", "504_EXECUTION_TIMEOUT", "500_PANIC"] as const) {
      const out = appendTransition(emptyChain(), { ...proven(1), verdict, seal: null });
      expect(out.accepted).toBe(false);
      expect(out.chain.root).toBe(EMPTY_ROOT);
    }
  });

  it("zincirdeki her yaprak kanıt yoluyla köke bağlanır", () => {
    let chain = emptyChain();
    for (let i = 0; i < 5; i += 1) {
      chain = appendTransition(chain, { ...proven(i), expectedPreviousRoot: chain.root }).chain;
    }
    chain.leaves.forEach((item, index) => {
      expect(verifyProof(item, proofPath(chain.leaves, index), chain.root)).toBe(true);
    });
  });

  it("sınır aşılınca geçmiş sıkıştırılır", () => {
    let chain = emptyChain();
    for (let i = 0; i < CHAIN_LIMIT + 2; i += 1) {
      chain = appendTransition(chain, { ...proven(i), expectedPreviousRoot: chain.root }).chain;
    }
    expect(chain.transitions.length).toBe(CHAIN_KEEP);
    expect(chain.compacted).toBeGreaterThan(0);
    expect(chain.transitions[chain.transitions.length - 1]?.seq).toBe(CHAIN_LIMIT + 2);
  });

  it("gövde özeti anahtar sırasından bağımsızdır ve ham değer taşımaz", () => {
    const a = payloadDigest({ ad: "Mehmet", tutar: 100 });
    const b = payloadDigest({ tutar: 100, ad: "Mehmet" });
    expect(a).toBe(b);
    expect(a).not.toContain("Mehmet");
  });

  it("doğrulama sonucu zincire yalnız mühürlüyse işlenir", () => {
    const base: VerifyResult = {
      engine: "z3",
      wasmVerified: true,
      simulated: false,
      verdict: "200_PROVEN",
      steps: [],
      ms: 12,
      cid: "cid:axiom:98b3e8680103d60d",
      seal: "TEDBİRGE-WEBOS-ZKP:98b3e8680103d60d",
      smt: "",
      lean: "",
    };
    const digest = payloadDigest({ alan: 1 });
    expect(recordVerifiedTransition("belge.kaydet", digest, base).accepted).toBe(true);
    expect(getChain().transitions.length).toBe(1);
    const refuted = recordVerifiedTransition("belge.kaydet", digest, {
      ...base,
      verdict: "409_REFUTED",
      seal: null,
    });
    expect(refuted.accepted).toBe(false);
    expect(getChain().transitions.length).toBe(1);
    expect(getChain().rejected).toBe(1);
  });
});
