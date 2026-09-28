import { describe, expect, it, vi } from "vitest";
import { createRenderer } from "@/lib/axiom/canvas/renderer";

vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));

type Listener = (e: Event) => void;
function fakeCanvas(getContext: (k: string) => unknown) {
  const listeners: Record<string, Listener> = {};
  const c = {
    width: 0,
    height: 0,
    style: {} as Record<string, string>,
    getContext,
    addEventListener: (n: string, f: Listener) => (listeners[n] = f),
    removeEventListener: (n: string) => delete listeners[n],
  };
  return { c: c as unknown as HTMLCanvasElement, listeners };
}
const host = { clientWidth: 100, clientHeight: 50 } as unknown as HTMLElement;
const ctx2d = { setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
const text = fakeCanvas(() => ctx2d).c;

describe("WebGL → 2D yedeği", () => {
  it("WebGL2 yoksa doğrudan 2D ve GPU katmanı gizli", () => {
    const { c } = fakeCanvas(() => null);
    const r = createRenderer(host, c, text);
    expect(r.mode).toBe("canvas2d");
    expect(c.style.visibility).toBe("hidden");
  });
  it("WebGL başlatma istisnası 2D'ye düşer", () => {
    const { c } = fakeCanvas(() => {
      throw new Error("gpu");
    });
    expect(createRenderer(host, c, text).mode).toBe("canvas2d");
  });
  it("resize ölçeği setTransform ile sıfırdan kurar", () => {
    const { c } = fakeCanvas(() => null);
    const r = createRenderer(host, c, text);
    r.resize();
    r.resize();
    r.draw({} as never);
    const calls = ctx2d.setTransform.mock.calls;
    expect(calls[calls.length - 1]).toEqual([1, 0, 0, 1, 0, 0]);
  });
});
