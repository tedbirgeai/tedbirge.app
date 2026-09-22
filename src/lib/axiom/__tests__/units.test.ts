import { describe, expect, it } from "vitest";

import { matchInvariants } from "@/lib/axiom/invariants";
import { askAscii } from "@/lib/axiom/lang/ask-ascii";
import { toIr } from "@/lib/axiom/lang/axiom-ir";
import { dimensionLabel, dimensionMismatch, sameDimension, unitDimension } from "@/lib/axiom/units";
import { evaluateLocalRules } from "@/lib/axiom/live/fallback-verifier";

function irOf(text: string) {
  return toIr(askAscii(text).tokens);
}

describe("SI boyut matrisi", () => {
  it("enerji ve güç boyutları farklıdır", () => {
    const j = unitDimension("J");
    const w = unitDimension("W");
    expect(j).not.toBeNull();
    expect(w).not.toBeNull();
    expect(sameDimension(j!, w!)).toBe(false);
    expect(dimensionLabel(j!)).toBe("M·L²·T⁻²");
  });

  it("ön ekli birimler çekirdek boyuta indirgenir", () => {
    expect(unitDimension("kJ")).toEqual(unitDimension("J"));
    expect(unitDimension("MW")).toEqual(unitDimension("W"));
    expect(unitDimension("kWh")).toEqual(unitDimension("J"));
  });

  it("Joule = Watt iddiası boyut uyuşmazlığı verir", () => {
    const text = "100 J = 100 W";
    const mismatch = dimensionMismatch(irOf(text), text);
    expect(mismatch).not.toBeNull();
  });

  it("aynı boyutlu eşitlik uyuşmazlık üretmez", () => {
    const text = "1000 J = 1 kJ";
    expect(dimensionMismatch(irOf(text), text)).toBeNull();
  });
});

describe("boyut uyuşmazlığı kesin reddedilir", () => {
  it("canlı ikili olmadan 409_REFUTED döner", () => {
    const text = "5 kWh eşittir 5 kW";
    const ir = irOf(text);
    const matches = matchInvariants(ir, text);
    expect(matches.some((m) => m.invariant.id === "si.dimension" && m.verdict === "celiski")).toBe(
      true,
    );
    expect(evaluateLocalRules(ir, matches, false).verdict).toBe("409_REFUTED");
  });
});
