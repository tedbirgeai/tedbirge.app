/**
 * AKILLI YERLEŞİM IZGARASI TESTLERİ
 * ------------------------------------------------------------------
 * Kenara sürükleme: yarım, çeyrek, tam ekran ve alt kenardaki üçlü /
 * dörtlü dikey ızgara davranışları.
 */

import { describe, expect, it } from "vitest";

import { gridColumns, snapBoxFor } from "@/lib/shell/window-snap";

const area = { left: 0, top: 0, width: 1200, height: 800 };
const wide = { left: 0, top: 0, width: 1600, height: 900 };

describe("snapBoxFor", () => {
  it("sol kenar yarım ekran verir", () => {
    expect(snapBoxFor(4, 400, area)).toEqual({ x: 0, y: 0, w: 600, h: 800 });
  });

  it("sağ kenar sağ yarıyı verir", () => {
    expect(snapBoxFor(1198, 400, area)).toEqual({ x: 600, y: 0, w: 600, h: 800 });
  });

  it("üst kenar tam ekran verir", () => {
    expect(snapBoxFor(600, 2, area)).toEqual({ x: 0, y: 0, w: 1200, h: 800 });
  });

  it("köşe çeyrek ekran verir", () => {
    expect(snapBoxFor(2, 2, area)).toEqual({ x: 0, y: 0, w: 600, h: 400 });
  });

  it("alt kenar dar ekranda üçlü ızgara verir", () => {
    const box = snapBoxFor(600, 798, area);
    expect(box).toEqual({ x: 400, y: 0, w: 400, h: 800 });
  });

  it("alt kenar geniş ekranda dörtlü ızgara verir", () => {
    const box = snapBoxFor(500, 898, wide);
    expect(box).toEqual({ x: 400, y: 0, w: 400, h: 900 });
  });

  it("orta alan yapışma üretmez", () => {
    expect(snapBoxFor(600, 400, area)).toBeNull();
  });
});

describe("gridColumns", () => {
  it("dört eşit sütun üretir", () => {
    const cols = gridColumns(4, { width: 1200, height: 800 });
    expect(cols).toHaveLength(4);
    expect(cols[3]).toEqual({ x: 900, y: 0, w: 300, h: 800 });
  });

  it("sütun sayısı 1–4 aralığına sıkışır", () => {
    expect(gridColumns(9, { width: 800, height: 600 })).toHaveLength(4);
    expect(gridColumns(0, { width: 800, height: 600 })).toHaveLength(1);
  });
});
