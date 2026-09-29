import { describe, expect, it } from "vitest";

import { classifyIntent } from "@/lib/studio/intent";

describe("niyet sınıflandırıcı", () => {
  it("sistem bileşeni isteklerini Mod B'ye yönlendirir", () => {
    for (const p of [
      "Tema panelini geliştir",
      "Duvar kağıtlarını artır",
      "Ayarları güncelle",
      "Gece ışığını aç",
      "Sistem seslerini kapat",
    ]) {
      expect(classifyIntent(p).mode, p).toBe("sistem");
    }
  });

  it("açık uygulama taleplerini Mod A'ya yönlendirir", () => {
    for (const p of [
      "Yeni bir hesap makinesi uygulaması yap",
      "sıfırdan bağımsız bir program oluştur",
      "bana bir pano uygulaması üret",
    ]) {
      expect(classifyIntent(p).mode, p).toBe("uygulama");
    }
  });

  it("belirsiz istekte üretim yapmaz", () => {
    expect(classifyIntent("eş sayısı nedir").mode).toBe("belirsiz");
    expect(classifyIntent("").mode).toBe("belirsiz");
  });

  it("tema isteğinden doğru temayı çıkarır", () => {
    const i = classifyIntent("koyu temaya geç");
    expect(i.mode).toBe("sistem");
    if (i.mode === "sistem" && i.patch.target === "tema") expect(i.patch.theme).toBe("night");
  });

  it("duvar kâğıdı adını ve otomatik kipi tanır", () => {
    const a = classifyIntent("duvar kağıdını okyanus yap");
    if (a.mode === "sistem" && a.patch.target === "duvarkagidi") expect(a.patch.wallpaper).toBe("ocean");
    const b = classifyIntent("duvar kağıdı otomatik değişsin");
    if (b.mode === "sistem" && b.patch.target === "duvarkagidi") expect(b.patch.auto).toBe(true);
  });

  it("sistem bileşeni istekleri uygulama üretimi ile karıştırılmaz", () => {
    const i = classifyIntent("tema ayarlarını geliştir");
    expect(i.mode).toBe("sistem");
  });
});
