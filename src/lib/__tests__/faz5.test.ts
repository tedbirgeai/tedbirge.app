import { describe, expect, it } from "vitest";
import { autoPick, dayPhase, nightLightDue } from "@/lib/ui/wallpaper";
import { isoDay, monthGrid } from "@/lib/shell/calendar";
import { createServiceManager } from "@/shell/services/registry";

describe("faz 5", () => {
  it("gün evresi ve otomatik duvar kâğıdı", () => {
    expect(dayPhase(8)).toBe("gunduz");
    expect(dayPhase(18)).toBe("aksam");
    expect(dayPhase(2)).toBe("gece");
    expect(autoPick(12)).toEqual({ id: "crystal", theme: "crystal" });
    expect(autoPick(19).theme).toBe("night");
    expect(autoPick(6).id).toBe("night");
    expect(nightLightDue(21)).toBe(true);
    expect(nightLightDue(12)).toBe(false);
  });
  it("takvim ızgarası pazartesi başlar", () => {
    const g = monthGrid(2026, 8); // Eylül 2026, 1'i salı
    expect(g).toHaveLength(42);
    expect(g[0]!.getDay()).toBe(1);
    expect(isoDay(g[1]!)).toBe("2026-09-01");
  });
  it("servis elle durdurulur ve başlatılır", async () => {
    let live = 0;
    const m = createServiceManager([{ name: "x", start: () => { live++; return () => void live--; } }]);
    await m.startAll();
    expect(live).toBe(1);
    m.stop("x");
    expect(live).toBe(0);
    expect(m.list().find((s) => s.name === "x")?.status).toBe("stopped");
    await m.start("x");
    expect(m.list().find((s) => s.name === "x")?.status).toBe("running");
    m.stopAll();
  });
});
