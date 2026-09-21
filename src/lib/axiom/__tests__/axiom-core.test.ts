/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM ÇEKİRDEK TESTLERİ
 * ------------------------------------------------------------------
 * Sanal RAM sert sınırı + LRU tahliyesi, bayt özeti, renk ayrıştırma ve
 * çizim geometrisi sözleşmeleri.
 */

import { describe, expect, it } from "vitest";

import { buildScene } from "@/lib/axiom/canvas/geometry";
import { parseColor } from "@/lib/axiom/canvas/renderer";
import { byteDigest } from "@/lib/axiom/digest";
import { formatBytes, overThreshold } from "@/lib/axiom/profiler";
import { AxiomRam } from "@/lib/axiom/ram";

const MB = 1024 * 1024;

describe("AxiomRam", () => {
  it("eşik aşıldığında en eski kayıtları atar", () => {
    const ram = new AxiomRam(10 * MB, 0.8); // tavan 8 MB
    ram.set("a", 3 * MB);
    ram.set("b", 3 * MB);
    ram.get("a"); // "a" tazelendi → "b" daha eski
    ram.set("c", 3 * MB);
    expect(ram.stats().used).toBeLessThanOrEqual(8 * MB);
    expect(ram.has("c")).toBe(true);
    expect(ram.has("b")).toBe(false);
    expect(ram.stats().evicted).toBe(1);
  });

  it("yeni kayıt tek başına eşiği aşsa bile korunur", () => {
    const ram = new AxiomRam(10 * MB, 0.8);
    ram.set("büyük", 9 * MB);
    expect(ram.has("büyük")).toBe(true);
  });

  it("aynı anahtar iki kez sayılmaz", () => {
    const ram = new AxiomRam(10 * MB, 0.8);
    ram.set("a", 1 * MB);
    ram.set("a", 2 * MB);
    expect(ram.stats().used).toBe(2 * MB);
    expect(ram.stats().entries).toBe(1);
  });
});

describe("byteDigest", () => {
  it("UTF-8 çok baytlı girdiyi ASCII saymaz", () => {
    const d = byteDigest("çekirdek");
    expect(d.ascii).toBe(false);
    expect(d.bytes).toBeGreaterThan(d.chars);
  });

  it("aynı girdi aynı parmak izini üretir (deterministik)", () => {
    expect(byteDigest("E = mc^2").fingerprint).toBe(byteDigest("E = mc^2").fingerprint);
    expect(byteDigest("a").fingerprint).not.toBe(byteDigest("b").fingerprint);
  });
});

describe("profiler", () => {
  it("eşik karşılaştırması", () => {
    expect(overThreshold(8, 10, 0.8)).toBe(true);
    expect(overThreshold(7, 10, 0.8)).toBe(false);
    expect(overThreshold(1, 0, 0.8)).toBe(false);
  });

  it("bayt biçimleme", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(50 * MB)).toBe("50.0 MB");
  });
});

describe("parseColor", () => {
  it("hex ve rgba biçimlerini çözer", () => {
    expect(parseColor("#ffffff")).toEqual([1, 1, 1, 1]);
    expect(parseColor("#000")).toEqual([0, 0, 0, 1]);
    const [r, g, b, a] = parseColor("rgba(255, 0, 0, 0.5)");
    expect([r, g, b]).toEqual([1, 0, 0]);
    expect(a).toBeCloseTo(0.5);
  });
});

describe("buildScene", () => {
  it("geometri ekran içinde kalır ve uyarı tonuna geçer", () => {
    const scene = buildScene({
      w: 800,
      h: 400,
      ratio: 0.95,
      fps: 60,
      status: "test",
      mode: "GPU",
    });
    expect(scene.rects.length).toBeGreaterThan(4);
    for (const r of scene.rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(800);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
    expect(scene.rects.some((r) => r.tone === "warn")).toBe(true);
    expect(scene.labels.some((l) => l.text.includes("GPU"))).toBe(true);
  });
});
