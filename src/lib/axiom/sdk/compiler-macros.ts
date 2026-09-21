/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * DERLEYİCİ MAKRO / ANNOTATION ŞABLONLARI
 * ------------------------------------------------------------------
 * Kaynak kodda işaretlenen birimlerin derleme/CI sırasında AXIOM MCP
 * uç noktasına gönderilmesini sağlayan işaret yapıları. Şablonlar
 * kopyalanabilir metindir; burada gerçek bir derleyici eklentisi
 * kurulmaz.
 */

export type MacroId = "rust" | "typescript" | "python" | "java" | "csharp";

export type MacroTemplate = {
  id: MacroId;
  label: string;
  /** Kaynakta görünen işaret. */
  marker: string;
  /** Kullanım örneği. */
  usage: string;
  /** İşaretin derleme sırasında ne yaptığı (tek satır). */
  behaviour: string;
};

export const MACROS: MacroTemplate[] = [
  {
    id: "rust",
    label: "Rust",
    marker: "#[axiom_verify]",
    behaviour: "Fonksiyon sözleşmesi derleme öncesi MCP'ye gönderilir; 409 kararı derlemeyi durdurur.",
    usage: `#[axiom_verify(invariant = "enerji_korunumu")]
pub fn batarya_akisi(giris_wh: f64, cikis_wh: f64) -> f64 {
    assert!(cikis_wh <= giris_wh);
    giris_wh - cikis_wh
}`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    marker: "@axiom_proof",
    behaviour: "Dekoratör, yapı ağacını CI adımında doğrular; mühür derleme çıktısına yazılır.",
    usage: `class EnerjiButcesi {
  @axiom_proof({ invariant: "enerji_korunumu" })
  akis(girisWh: number, cikisWh: number): number {
    return girisWh - cikisWh;
  }
}`,
  },
  {
    id: "python",
    label: "Python",
    marker: "@axiom_proof",
    behaviour: "Dekoratör çağrı imzasını ve doküman dizesini MCP'ye gönderir.",
    usage: `@axiom_proof(invariant="enerji_korunumu")
def akis(giris_wh: float, cikis_wh: float) -> float:
    """Çıkış girişi aşamaz."""
    return giris_wh - cikis_wh`,
  },
  {
    id: "java",
    label: "Java",
    marker: "@AxiomVerify",
    behaviour: "Annotation processor derleme sırasında kararı okur; 409 kararı derlemeyi kırar.",
    usage: `@AxiomVerify(invariant = "enerji_korunumu")
public double akis(double girisWh, double cikisWh) {
  return girisWh - cikisWh;
}`,
  },
  {
    id: "csharp",
    label: "C#",
    marker: "[AxiomProof]",
    behaviour: "Roslyn analizörü kararı derleme uyarısı/hatası olarak yüzeye çıkarır.",
    usage: `[AxiomProof(Invariant = "enerji_korunumu")]
public double Akis(double girisWh, double cikisWh) => girisWh - cikisWh;`,
  },
];

export function macroById(id: MacroId): MacroTemplate {
  return MACROS.find((m) => m.id === id) ?? MACROS[0]!;
}
