/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * BİLİM MATRİSİ VE KAYIT DEFTERLERİ
 * ------------------------------------------------------------------
 * Altı ana bilim kategorisi ve her birinin resmi doğrulama kaynakları
 * (kayıt defterleri). Bu liste yalnız kategori/defter adlarını taşır;
 * hiçbir harici çağrı yapılmaz, veri indirilmez.
 */

export type ScienceId = "formal" | "physical" | "life" | "engineering" | "earth" | "social";

export type ScienceCategory = {
  id: ScienceId;
  label: string;
  summary: string;
  ledgers: string[];
};

export const SCIENCE_CATEGORIES: ScienceCategory[] = [
  {
    id: "formal",
    label: "Biçimsel bilimler ve bilgi teorisi",
    summary: "Matematik, mantık, tip teorisi, hesaplanabilirlik ve bilgi sınırları.",
    ledgers: ["Lean 4 Mathlib", "SMT-LIB2", "Metamath", "Coq Standard Library", "OEIS"],
  },
  {
    id: "physical",
    label: "Fiziksel ve kimyasal bilimler",
    summary: "Korunum yasaları, termodinamik, elektromanyetizma, kuantum ve madde yapısı.",
    ledgers: ["BIPM / CODATA", "NIST SRD", "IUPAC", "CERN Open Data", "IAU katalogları"],
  },
  {
    id: "life",
    label: "Yaşam ve sağlık bilimleri",
    summary: "Moleküler biyoloji, genomik, farmakoloji ve tıbbi sınıflandırma.",
    ledgers: ["PDB", "NCBI GenBank", "PubChem", "UniProt", "WHO ICD-11"],
  },
  {
    id: "engineering",
    label: "Mühendislik ve emniyet standartları",
    summary: "Fonksiyonel güvenlik, havacılık, otomotiv, siber güvenlik ve kriptografi.",
    ledgers: ["DO-178C", "ISO 26262", "IEC 61508", "ISO/IEC 27001", "NIST SP 800-53", "IEEE SA"],
  },
  {
    id: "earth",
    label: "Dünya ve çevre bilimleri",
    summary: "Jeoloji, sismoloji, meteoroloji, iklim ve doğa sistemleri.",
    ledgers: ["USGS", "NOAA", "IPCC", "WMO", "Copernicus"],
  },
  {
    id: "social",
    label: "Toplum, hukuk ve iktisat",
    summary: "Ölçülebilir toplumsal göstergeler, hukuki çerçeveler ve iktisadi kimlikler.",
    ledgers: ["OECD", "IMF", "Eurostat", "TÜİK", "ISO 20022"],
  },
];

export function scienceCategory(id: ScienceId): ScienceCategory | undefined {
  return SCIENCE_CATEGORIES.find((c) => c.id === id);
}
