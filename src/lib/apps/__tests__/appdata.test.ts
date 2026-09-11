import { describe, expect, it } from "vitest";

import { canonicalJson } from "@/apps/tbapp-signature";
import { appDataPath } from "@/lib/apps/appdata";

describe("uygulama paketi güvenliği", () => {
  it("imza alanını kanonik gövdeye katmaz", () => {
    expect(canonicalJson({ b: 1, a: 2, sig: "x" })).toBe('{"a":2,"b":1}');
  });

  it("her uygulamaya ayrı veri alanı verir", () => {
    expect(appDataPath("a.b", "k")).toBe("/appdata/a.b/k");
    expect(appDataPath("c.d", "k")).not.toBe(appDataPath("a.b", "k"));
  });
});
