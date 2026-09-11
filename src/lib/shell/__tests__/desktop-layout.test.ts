/**
 * MASAÜSTÜ IZGARA YERLEŞİMİ TESTLERİ
 * ------------------------------------------------------------------
 * Dolan (auto-fill) yerleşim: kayıtlı konumlar korunur, diğerleri boş
 * hücrelere akar; güvenli alan sıkıştırma ve snap alt sınırı.
 */

import { describe, expect, it } from "vitest";

import {
  DOCK_CLEARANCE,
  clampToGrid,
  flowIntoGrid,
  snap,
} from "@/lib/shell/desktop-layout";

const TOP = 160;
const SIDE = 16;
const CELL = { w: 92, h: 104, gap: 8 }; // "orta" görünüm
const CW = CELL.w + CELL.gap;
const CH = CELL.h + CELL.gap;

describe("flowIntoGrid", () => {
  it("kayıtsız simgeleri sütun sütun dizer", () => {
    const rows = 4;
    const out = flowIntoGrid(["a", "b", "c", "d", "e"], {}, rows, TOP, CELL, SIDE);
    expect(out.a).toEqual({ x: SIDE, y: TOP });
    expect(out.e).toEqual({ x: SIDE + CW, y: TOP });
  });

  it("sürüklenen simgenin hücresine başka simge binmez", () => {
    const rows = 4;
    // "d" simgesi 3. satıra sürüklenmiş.
    const saved = { d: { x: SIDE, y: TOP + 2 * CH } };
    const out = flowIntoGrid(["a", "b", "c", "d", "e"], saved, rows, TOP, CELL, SIDE);
    expect(out.d).toEqual({ x: SIDE, y: TOP + 2 * CH });
    const pts = Object.values(out);
    const unique = new Set(pts.map((p) => `${p.x}:${p.y}`));
    expect(unique.size).toBe(pts.length); // hiçbir iki simge aynı hücrede değil
    // Kayıtlı hücre atlanır: "e" 4. satıra değil, bir sonraki boş hücreye akar.
    expect(out.e).toEqual({ x: SIDE + CW, y: TOP });
  });

  it("ızgara dışı kayıtlı konum yeniden akışa düşer", () => {
    const rows = 4;
    const saved = { a: { x: SIDE - CW * 3, y: TOP } };
    const out = flowIntoGrid(["a", "b"], saved, rows, TOP, CELL, SIDE);
    expect(out.a).toEqual({ x: SIDE, y: TOP });
  });
});

describe("clampToGrid", () => {
  const area = { width: 1280, height: 800 };

  it("dock alanına giren konumu yukarı iter", () => {
    const deep = { x: SIDE, y: 800 - 40 - CELL.h }; // dock payının altında
    const c = clampToGrid(deep, "orta", TOP, area);
    expect(c).not.toBeNull();
    expect(c!.y + CELL.h).toBeLessThanOrEqual(area.height - DOCK_CLEARANCE);
  });

  it("ekranın tamamen dışındaki konumu düşürür", () => {
    expect(clampToGrid({ x: 2000, y: TOP }, "orta", TOP, area)).toBeNull();
    expect(clampToGrid({ x: SIDE, y: 2000 }, "orta", TOP, area)).toBeNull();
  });

  it("üst payın üstüne çıkmaz", () => {
    const c = clampToGrid({ x: SIDE, y: 0 }, "orta", TOP, area);
    expect(c!.y).toBe(TOP);
  });
});

describe("snap", () => {
  it("alt sınır verildiğinde dock payının altına inmez", () => {
    const s = snap({ x: SIDE, y: 800 }, "orta", TOP, 800);
    expect(s.y + CELL.h).toBeLessThanOrEqual(800 - DOCK_CLEARANCE);
  });

  it("alt sınır verilmeyince eski davranış korunur", () => {
    const s = snap({ x: SIDE + CW * 2, y: TOP + CH * 3 }, "orta", TOP);
    expect(s).toEqual({ x: SIDE + CW * 2, y: TOP + CH * 3 });
  });
});
