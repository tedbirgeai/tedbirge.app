// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createRenderer } from "@/lib/axiom/canvas/renderer";

function fakeCanvas(gl: unknown) {
  const c = document.createElement("canvas");
  const ctx2d = { setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
  (c as unknown as { getContext: (k: string) => unknown }).getContext = (k: string) =>
    k === "2d" ? ctx2d : gl;
  return { c, ctx2d };
}

describe("WebGL → 2D yedeği", () => {
  it("WebGL2 yoksa doğrudan 2D", () => {
    const host = document.createElement("div");
    const { c: g } = fakeCanvas(null);
    const { c: t } = fakeCanvas(null);
    const r = createRenderer(host, g, t);
    expect(r.mode).toBe("canvas2d");
    expect(g.style.visibility).toBe("hidden");
  });
  it("WebGL başlatma hatası 2D'ye düşer", () => {
    const host = document.createElement("div");
    const g = document.createElement("canvas");
    (g as unknown as { getContext: () => never }).getContext = () => {
      throw new Error("gpu");
    };
    const { c: t } = fakeCanvas(null);
    expect(createRenderer(host, g, t).mode).toBe("canvas2d");
  });
});
