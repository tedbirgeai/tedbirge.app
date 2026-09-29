import { describe, expect, it } from "vitest";

import { classifyIntent } from "@/lib/studio/intent";

describe("evrensel niyet eşlemesi", () => {
  it("günlük konuşma dilindeki şikâyetleri doğru katmana bağlar", () => {
    const cases: Array<[string, string]> = [
      ["gözlerim yanıyor akşam çalışırken", "gecelsigi"],
      ["ekran çok parlak", "parlaklik"],
      ["sistem çok yavaş, sürekli takılıyor", "performans"],
      ["hiç cihaz bulunamıyor, bağlantı kopuyor", "ag"],
      ["dosya sistemi kotası ne kadar", "vfs"],
      ["izin ve yalıtım sınırları nedir", "guvenlik"],
      ["çekirdek zaman aşımı nasıl çalışıyor", "cekirdek"],
      ["pencere düzeni dağınık", "arayuz"],
      ["çok gürültü çıkarıyor", "ses"],
      ["renkleri değiştir, ferah bir görünüm olsun", "tema"],
    ];
    for (const [prompt, target] of cases) {
      const i = classifyIntent(prompt);
      expect(i.mode, prompt).toBe("sistem");
      if (i.mode === "sistem") expect(i.patch.target, prompt).toBe(target);
    }
  });

  it("sistem isteklerinde asla uygulama üretimine geçmez", () => {
    for (const p of ["performans kasıyor", "mesh gecikmesi yüksek", "depolama dolu"]) {
      expect(classifyIntent(p).mode, p).not.toBe("uygulama");
    }
  });
});
