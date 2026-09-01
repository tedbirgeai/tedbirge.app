import { describe, expect, it, beforeEach } from "vitest";

import { clearUndo, popUndo, pushUndo, undoDepth } from "@/lib/shell/undo-stack";
import { keyboardSnapBox, SHELL_SHORTCUTS } from "@/lib/shell/shortcuts";

describe("geri alma yığını", () => {
  beforeEach(() => clearUndo());

  it("son işlemi geri alır (LIFO)", () => {
    const order: string[] = [];
    pushUndo({ label: "bir", undo: () => { order.push("bir"); } });
    pushUndo({ label: "iki", undo: () => { order.push("iki"); } });
    expect(undoDepth()).toBe(2);
    popUndo()?.undo();
    expect(order).toEqual(["iki"]);
  });

  it("boş yığında null döner", () => {
    expect(popUndo()).toBeNull();
  });

  it("20 kayıttan fazlasını tutmaz", () => {
    for (let i = 0; i < 25; i += 1) pushUndo({ label: String(i), undo: () => {} });
    expect(undoDepth()).toBe(20);
  });
});

describe("klavye ile pencere hizalama", () => {
  const area = { width: 1000, height: 600 };

  it("sol yarıya yaslar", () => {
    expect(keyboardSnapBox("left", area)).toEqual({ x: 0, y: 0, w: 500, h: 600 });
  });

  it("sağ yarı ekranı tam kaplar", () => {
    const box = keyboardSnapBox("right", area);
    expect(box.x + box.w).toBe(area.width);
  });

  it("tam ekran kutusu alanın tamamıdır", () => {
    expect(keyboardSnapBox("full", area)).toEqual({ x: 0, y: 0, w: 1000, h: 600 });
  });

  it("kısayol listesi kullanıcıya sunulur", () => {
    expect(SHELL_SHORTCUTS.length).toBeGreaterThanOrEqual(6);
    expect(SHELL_SHORTCUTS.every((s) => s.keys && s.label)).toBe(true);
  });
});
