import { describe, expect, it } from "vitest";

import { COMPACT_RATIO, planCompaction, quotaPressure } from "@/lib/vfs/compaction";
import type { VfsEntry } from "@/lib/vfs/store";

function entry(name: string, at: number, folder: VfsEntry["folder"] = "repo"): VfsEntry {
  return { id: `${folder}:${name}:${at}`, name, mime: "text/plain", size: 10, at, folder };
}

describe("anlık görüntü birleştirme", () => {
  it("delta dizininde yalnız en güncel görüntüleri korur", () => {
    const entries = [
      entry("axiom/delta/durum.txt", 5),
      entry("axiom/delta/durum-4.txt", 4),
      entry("axiom/delta/durum-3.txt", 3),
      entry("axiom/delta/durum-2.txt", 2),
      entry("axiom/delta/durum-1.txt", 1),
    ];
    const plan = planCompaction(entries);
    expect(plan.keep).toHaveLength(3);
    expect(plan.drop).toHaveLength(2);
    expect(plan.keep).toContain(entries[0]!.id);
  });

  it("kota baskısında tek görüntüye iner", () => {
    const entries = [
      entry("axiom/delta/a.txt", 3),
      entry("axiom/delta/b.txt", 2),
      entry("axiom/delta/c.txt", 1),
    ];
    expect(planCompaction(entries, 1).drop).toHaveLength(2);
  });

  it("kullanıcı dosyalarına ve bildirimlere dokunmaz", () => {
    const entries = [
      entry("rapor.txt", 3, "Belgeler"),
      entry("foto.jpg", 2, "Görseller"),
      entry("axiom/limen.json", 1),
      entry("axiom/src/BRANCH", 1),
    ];
    const plan = planCompaction(entries);
    expect(plan.drop).toEqual([]);
    expect(plan.keep).toEqual([]);
  });

  it("kota baskısını eşiğe göre bildirir", () => {
    expect(quotaPressure({ bytes: 90, quota: 100 })).toBe(true);
    expect(quotaPressure({ bytes: 10, quota: 100 })).toBe(false);
    expect(quotaPressure({ bytes: 10, quota: null })).toBe(false);
    expect(COMPACT_RATIO).toBeGreaterThan(0.5);
  });
});
