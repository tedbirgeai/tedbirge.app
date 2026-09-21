/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import { describe, expect, it } from "vitest";

import { adapterSource, SDK_MCP_PATH, SDK_TARGETS } from "@/lib/axiom/sdk/adapters";
import { CI_ACTION_NAME, simulateCiRun, workflowYaml } from "@/lib/axiom/sdk/ci-bot";
import { MACROS } from "@/lib/axiom/sdk/compiler-macros";
import { makeBadge, REGISTRIES } from "@/lib/axiom/sdk/provenance";

describe("SDK adaptörleri", () => {
  it("yedi hedef için MCP yolunu taşıyan şablon üretir", () => {
    expect(SDK_TARGETS).toHaveLength(8);
    for (const target of SDK_TARGETS) {
      const src = adapterSource(target.id, "https://tedbirge.app");
      expect(src).toContain(SDK_MCP_PATH);
      expect(src).toContain("axiom.verify");
      expect(src).not.toContain("http://");
    }
  });
});

describe("derleyici makroları", () => {
  it("emirdeki işaretleri kapsar", () => {
    const markers = MACROS.map((m) => m.marker);
    expect(markers).toContain("#[axiom_verify]");
    expect(markers).toContain("@axiom_proof");
    expect(markers).toContain("@AxiomVerify");
    expect(markers).toContain("[AxiomProof]");
  });
});

describe("CI denetim botu", () => {
  it("iş akışı adı ve uç noktası taşır", () => {
    const yaml = workflowYaml("https://tedbirge.app");
    expect(yaml).toContain(CI_ACTION_NAME);
    expect(yaml).toContain(SDK_MCP_PATH);
  });

  it("çürütülen dosyada denetim başarısız olur", () => {
    const ok = simulateCiRun([{ path: "a.rs", verdict: "200_PROVEN", ms: 10 }]);
    expect(ok.passed).toBe(true);
    const bad = simulateCiRun([
      { path: "a.rs", verdict: "200_PROVEN", ms: 10 },
      { path: "b.rs", verdict: "409_REFUTED", ms: 12 },
    ]);
    expect(bad.passed).toBe(false);
    expect(bad.refuted).toBe(1);
    expect(bad.comment).toContain("409_REFUTED");
  });
});

describe("köken rozeti", () => {
  it("altı depo için kanıtlanmış kararda rozet üretir", () => {
    expect(REGISTRIES).toHaveLength(6);
    for (const r of REGISTRIES) {
      const badge = makeBadge(r.id, "paket", "200_PROVEN", "TEDBİRGE-WEBOS-ZKP:abc");
      expect(badge?.status).toBe("STATUS: 200_PROVEN");
      expect(badge?.svg).toContain("currentColor");
    }
  });

  it("kanıtsız kararda rozet üretmez", () => {
    expect(makeBadge("npm", "paket", "409_REFUTED", null)).toBeNull();
    expect(makeBadge("npm", "paket", "200_PROVEN", null)).toBeNull();
  });
});
