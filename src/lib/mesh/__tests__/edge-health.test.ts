import { beforeEach, describe, expect, it } from "vitest";

import {
  edgePenalty,
  isQuarantined,
  reportEdgeFailure,
  reportEdgeSuccess,
  resetEdgeHealth,
} from "@/lib/mesh/edge-health";

describe("kenar sağlığı ve karantina", () => {
  beforeEach(() => resetEdgeHealth());

  it("sağlıklı hattın cezası yoktur", () => {
    expect(edgePenalty("a")).toBe(1);
  });

  it("hata üstel ceza uygular", () => {
    const now = 1_000;
    reportEdgeFailure("a", now);
    const first = edgePenalty("a", now);
    reportEdgeFailure("a", now);
    expect(edgePenalty("a", now)).toBeGreaterThan(first);
  });

  it("dört hatadan sonra karantinaya alır", () => {
    const now = 1_000;
    for (let i = 0; i < 4; i += 1) reportEdgeFailure("b", now);
    expect(isQuarantined("b", now)).toBe(true);
    // Karantina süresi dolunca hat yeniden denenebilir.
    expect(isQuarantined("b", now + 61_000)).toBe(false);
  });

  it("başarı karantinayı kaldırır ve cezayı düşürür", () => {
    const now = 1_000;
    for (let i = 0; i < 4; i += 1) reportEdgeFailure("c", now);
    reportEdgeSuccess("c", now);
    expect(isQuarantined("c", now)).toBe(false);
    expect(edgePenalty("c", now)).toBeLessThan(16);
  });

  it("ceza zamanla erir", () => {
    const now = 1_000;
    reportEdgeFailure("d", now);
    reportEdgeFailure("d", now);
    const hot = edgePenalty("d", now);
    expect(edgePenalty("d", now + 300_000)).toBeLessThan(hot);
  });
});
