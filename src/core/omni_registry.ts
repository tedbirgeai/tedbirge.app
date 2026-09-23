/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface ScienceDomain {
  id: string;
  name: string;
  subDisciplines: string[];
  tcbRegistries: string[];
}

export const OMNI_SCIENCE_DOMAINS: ScienceDomain[] = [
  {
    id: "FORMAL_SCIENCES",
    name: "1. Formal Bilimler & Bilgi Teorisi",
    subDisciplines: ["Saf Matematik", "Sembolik Mantık", "Kategori Teorisi", "Tip Teorisi", "Turing Hesaplayabilirlik"],
    tcbRegistries: ["Lean 4 Mathlib", "SMT-LIB2", "Metamath", "Coq Standard Library", "Mizar", "OEIS"],
  },
  {
    id: "PHYSICAL_SCIENCES",
    name: "2. Fiziksel & Kimyasal Bilimler",
    subDisciplines: ["Termodinamik", "Maxwell Denklemleri", "Kuantum Mekaniği", "Kuantum Kimyası"],
    tcbRegistries: ["BIPM / CODATA", "NIST SRD", "IUPAC", "CAS Registry", "CERN Open Data"],
  },
  {
    id: "LIFE_SCIENCES",
    name: "3. Yaşam & Sağlık Bilimleri",
    subDisciplines: ["Moleküler Biyoloji", "Genomik", "Proteomik", "Farmakoloji"],
    tcbRegistries: ["PDB (Protein Data Bank)", "NCBI GenBank", "PubChem", "UniProt", "WHO ICD-11"],
  },
  {
    id: "ENGINEERING_SAFETY",
    name: "4. Mühendislik & Kritik Emniyet",
    subDisciplines: ["Havacılık Yazılım Emniyeti", "Otomotiv Emniyeti", "Kriptografi", "CAN-Bus/ROS2"],
    tcbRegistries: ["DO-178C / DO-254", "ARINC 429", "ISO 26262", "IEC 61508", "NIST SP 800-53", "IETF RFCs"],
  },
  {
    id: "EARTH_SCIENCES",
    name: "5. Dünya & Çevre Bilimleri",
    subDisciplines: ["Jeofizik", "Sismoloji", "Meteoroloji", "Atmosferik Fizik"],
    tcbRegistries: ["WMO", "NOAA NCEI", "USGS", "GEBCO"],
  },
  {
    id: "SOCIAL_ETHICAL",
    name: "6. Sosyo-Ekonomik & YZ Etiği",
    subDisciplines: ["Oyun Teorisi", "Akıllı Sözleşmeler", "Hukuki Mantık", "Yapay Zeka Etiği"],
    tcbRegistries: ["IEEE 7000 Serisi", "AB AI Act Şemaları", "ISO/IEC 42001", "ISO 20022", "LegalRuleML"],
  },
];
