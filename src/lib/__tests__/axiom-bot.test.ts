import { describe, expect, it } from "vitest";
import { looksLikeClaim, verdictLabel } from "@/lib/axiom-bot";
import { dockAction } from "@/shell/dock-action";
import { TEMPLATES, templateFiles } from "@/lib/studio/project";

describe("Axiom Bot", () => {
  it("iddiaları algılar, sohbeti algılamaz", () => {
    expect(looksLikeClaim("1 = 2")).toBe(true);
    expect(looksLikeClaim("x >= 3")).toBe(true);
    expect(looksLikeClaim("Merhaba nasılsın?")).toBe(false);
    expect(looksLikeClaim("a == b")).toBe(false);
  });
  it("kararları etiketler; sahte onay üretmez", () => {
    expect(verdictLabel("409_REFUTED")).toBe("çelişki bulundu");
    expect(verdictLabel("422_UNDECIDED")).toBe("karar verilemedi");
  });
});

describe("Dock tıklama", () => {
  it("küçültülmüş → geri getir, arkada → öne al, önde → küçült, yok → aç", () => {
    expect(dockAction([], 10)).toEqual({ kind: "launch" });
    expect(dockAction([{ id: "a", minimized: true, z: 1 }], 5)).toEqual({ kind: "restore", id: "a" });
    expect(dockAction([{ id: "a", minimized: false, z: 1 }], 5)).toEqual({ kind: "focus", id: "a" });
    expect(dockAction([{ id: "a", minimized: false, z: 5 }], 5)).toEqual({ kind: "minimize", id: "a" });
  });
});

describe("Studio şablonları", () => {
  it("widget, mesh botu ve wasm şablonları geçerli proje üretir", () => {
    for (const id of ["widget", "meshbot", "wasm"] as const) {
      const files = templateFiles(`t-${id}`, "Deneme", id);
      expect(files.map((f) => f.path)).toContain(`t-${id}/assembly/index.ts`);
      expect(TEMPLATES[id].code).toContain("export function start");
    }
  });
});
