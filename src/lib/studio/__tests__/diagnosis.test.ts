import { describe, expect, it } from "vitest";

import { classifyIntent } from "@/lib/studio/intent";
import { openingLine, reportForApp, reportForPatch } from "@/lib/studio/diagnosis";
import type { PatchResult } from "@/lib/studio/system-patch";

const patch: PatchResult = {
  component: "Tema motoru",
  summary: 'Tema "Gece" olarak güncellendi.',
  applied: true,
  kind: "mudahale",
};

describe("teşhis & tedavi protokolü", () => {
  it("Mod B raporunda teşhis, tedavi ve sağlık alanları dolu gelir", () => {
    const intent = classifyIntent("koyu temaya geç");
    const r = reportForPatch("koyu temaya geç", intent, patch);
    expect(r.mode).toBe("Mod B - Yerinde Sistem Müdahalesi");
    expect(r.verbalResponse.length).toBeGreaterThan(5);
    expect(r.diagnosis).toContain("Tema motoru");
    expect(r.treatment).toContain("yerinde");
    expect(r.systemHealth.memoryShield).toContain("1500");
    expect(r.id).toBeTruthy();
  });

  it("inceleme raporunda değişiklik yapıldığı iddia edilmez", () => {
    const intent = classifyIntent("ağ katmanı neden kopuyor");
    const r = reportForPatch("ağ katmanı neden kopuyor", intent, {
      component: "Ağ / Mesh katmanı",
      summary: "Ağ Kapalı.",
      applied: false,
      kind: "inceleme",
    });
    expect(r.treatment).toContain("değiştirilmedi");
  });

  it("Mod A raporu sandbox üretimini işaretler", () => {
    const r = reportForApp("yeni bir sayaç uygulaması yap", "Sayaç", true, "Yalıtılmış alana kuruldu.");
    expect(r.mode).toBe("Mod A - Sandbox Üretimi");
    expect(r.systemHealth.stability).toContain("Kararlı");
  });

  it("insani ilk tepki isteğe göre değişir", () => {
    expect(openingLine("tema çok karanlık")).toContain("palet");
    expect(openingLine("sistem çok yavaş")).toContain("yük");
  });
});
