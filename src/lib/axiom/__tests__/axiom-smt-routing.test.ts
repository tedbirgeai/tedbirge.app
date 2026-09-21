import { describe, expect, it } from "vitest";

import { detectLanguage, isSmtLib } from "@/lib/axiom/lang/detect";

describe("SMT-LIB yönlendirmesi", () => {
  const smt = "(set-logic QF_NRA)\n(declare-const x Real)\n(assert (> x 0))\n(check-sat)";

  it("SMT girdisini tanır", () => {
    expect(isSmtLib(smt)).toBe(true);
    expect(isSmtLib("Bu bir Türkçe cümledir ve enerji için yazıldı.")).toBe(false);
  });

  it("dil tanımayı atlayıp SMT-LIB olarak işaretler", () => {
    const guess = detectLanguage(smt);
    expect(guess.id).toBe("smt");
    expect(guess.kind).toBe("code");
  });

  it("insan dili girdisini SMT saymaz", () => {
    expect(detectLanguage("Enerji korunumu bir sistem için geçerlidir.").id).not.toBe("smt");
  });
});
