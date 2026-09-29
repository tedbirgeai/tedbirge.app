import { beforeEach, describe, expect, it } from "vitest";

import {
  isSystemMuted,
  playSystemSound,
  setSystemMuted,
  systemSoundNames,
  toggleSystemMuted,
} from "@/os/system/audio";

describe("OS ses sistemi", () => {
  beforeEach(() => {
    setSystemMuted(false);
  });

  it("tüm sistem efektleri tanımlıdır", () => {
    expect(systemSoundNames().sort()).toEqual(
      [
        "alert",
        "dock-click",
        "trash",
        "window-close",
        "window-minimize",
        "window-open",
        "window-restore",
      ].sort(),
    );
  });

  it("sessize alma durumu tersinirdir", () => {
    expect(isSystemMuted()).toBe(false);
    expect(toggleSystemMuted()).toBe(true);
    expect(isSystemMuted()).toBe(true);
    expect(toggleSystemMuted()).toBe(false);
    expect(isSystemMuted()).toBe(false);
  });


  it("sessizken hiçbir ses üretilmez", () => {
    setSystemMuted(true);
    expect(playSystemSound("window-open")).toBe(false);
  });

  it("Web Audio bulunmayan ortamda çökmez, sessizce geçer", () => {
    // jsdom'da AudioContext yoktur: sahte ses üretmek yerine false döner.
    expect(() => playSystemSound("alert")).not.toThrow();
  });
});
