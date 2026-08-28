import { describe, expect, it } from "vitest";

import { SharedRing, sharedMemoryAvailable } from "@/kernel/shared-ring";
import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";

const hasSab = typeof SharedArrayBuffer !== "undefined";

describe.skipIf(!hasSab)("SharedRing", () => {
  it("yazılan kaydı aynen okur", () => {
    const ring = SharedRing.create(4096);
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    expect(ring.push(payload)).toBe(true);
    expect(Array.from(ring.pop()!)).toEqual([1, 2, 3, 4, 5]);
    expect(ring.pop()).toBeNull();
  });

  it("sarma (wrap-around) sonrası veri bozulmaz", () => {
    const ring = SharedRing.create(256);
    const chunk = new Uint8Array(60).fill(7);
    for (let i = 0; i < 40; i++) {
      expect(ring.push(chunk)).toBe(true);
      const out = ring.pop();
      expect(out).not.toBeNull();
      expect(out!.byteLength).toBe(60);
      expect(out!.every((b) => b === 7)).toBe(true);
    }
    expect(ring.usedBytes()).toBe(0);
  });

  it("kapasite dolduğunda false döner (çağıran postMessage'a düşer)", () => {
    const ring = SharedRing.create(128);
    expect(ring.push(new Uint8Array(200))).toBe(false);
  });

  it("ikili çerçeveyi uçtan uca taşır", () => {
    const ring = SharedRing.create(4096);
    const frame = encodeFrame(OP.DIGEST, 42, new Uint8Array([9, 9]).buffer);
    expect(ring.push(new Uint8Array(frame))).toBe(true);
    const raw = ring.pop()!;
    const decoded = decodeFrame(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
    );
    expect(decoded?.op).toBe(OP.DIGEST);
    expect(decoded?.corrId).toBe(42);
    expect(new Uint8Array(decoded!.payload)).toEqual(new Uint8Array([9, 9]));
  });

  it("yalıtım kapalıyken paylaşımlı bellek kullanılmaz", () => {
    expect(sharedMemoryAvailable()).toBe(
      (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true,
    );
  });
});
