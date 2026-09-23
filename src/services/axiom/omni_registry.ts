/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export type TCBCategory = "FORMAL" | "PHYSICAL" | "LIFE" | "ENGINEERING" | "EARTH" | "SOCIAL";

export interface TCBRegistryEntry {
  id: string;
  category: TCBCategory;
  name: string;
  source: string;
  standardRef: string;
  verificationLevel: "Z3_SMT" | "LEAN4_THEOREM" | "OMNI_SCIENCE";
}

export const OMNI_REGISTRY: Record<TCBCategory, TCBRegistryEntry[]> = {
  FORMAL: [
    { id: "MTH-01", category: "FORMAL", name: "Lean 4 Mathlib", source: "Lean Community", standardRef: "Formal Proofs", verificationLevel: "LEAN4_THEOREM" },
    { id: "MTH-02", category: "FORMAL", name: "SMT-LIB v2.6", source: "SMT Exec", standardRef: "Logic Constraints", verificationLevel: "Z3_SMT" },
    { id: "MTH-03", category: "FORMAL", name: "Coq Standard Library", source: "INRIA", standardRef: "Inductive Types", verificationLevel: "LEAN4_THEOREM" },
    { id: "MTH-04", category: "FORMAL", name: "Metamath Proof Explorer", source: "Metamath", standardRef: "Axiomatic Proofs", verificationLevel: "LEAN4_THEOREM" }
  ],
  PHYSICAL: [
    { id: "PHY-01", category: "PHYSICAL", name: "BIPM / CODATA Constants", source: "BIPM", standardRef: "Fundamental Constants", verificationLevel: "OMNI_SCIENCE" },
    { id: "PHY-02", category: "PHYSICAL", name: "NIST SRD Database", source: "NIST", standardRef: "Standard Reference Data", verificationLevel: "OMNI_SCIENCE" },
    { id: "PHY-03", category: "PHYSICAL", name: "IUPAC InChI/SMILES", source: "IUPAC", standardRef: "Chemical Molecular Structure", verificationLevel: "OMNI_SCIENCE" },
    { id: "PHY-04", category: "PHYSICAL", name: "CERN Open Data Portal", source: "CERN", standardRef: "High Energy Physics", verificationLevel: "OMNI_SCIENCE" }
  ],
  LIFE: [
    { id: "BIO-01", category: "LIFE", name: "Protein Data Bank (PDB)", source: "wwPDB", standardRef: "3D Macromolecular Structures", verificationLevel: "OMNI_SCIENCE" },
    { id: "BIO-02", category: "LIFE", name: "NCBI GenBank", source: "NIH", standardRef: "Genetic Sequence Database", verificationLevel: "OMNI_SCIENCE" },
    { id: "BIO-03", category: "LIFE", name: "UniProt KB", source: "UniProt Consortium", standardRef: "Functional Protein Data", verificationLevel: "OMNI_SCIENCE" },
    { id: "BIO-04", category: "LIFE", name: "WHO ICD-11", source: "WHO", standardRef: "Health Classification", verificationLevel: "OMNI_SCIENCE" }
  ],
  ENGINEERING: [
    { id: "ENG-01", category: "ENGINEERING", name: "DO-178C / DO-254", source: "RTCA / EUROCAE", standardRef: "Airborne Systems Safety", verificationLevel: "LEAN4_THEOREM" },
    { id: "ENG-02", category: "ENGINEERING", name: "ISO 26262 ASIL-D", source: "ISO", standardRef: "Road Vehicles Functional Safety", verificationLevel: "LEAN4_THEOREM" },
    { id: "ENG-03", category: "ENGINEERING", name: "IEC 61508 SIL-4", source: "IEC", standardRef: "Functional Safety E/E/PE", verificationLevel: "LEAN4_THEOREM" },
    { id: "ENG-04", category: "ENGINEERING", name: "NIST SP 800-53 Rev 5", source: "NIST", standardRef: "Security & Privacy Controls", verificationLevel: "Z3_SMT" },
    { id: "ENG-05", category: "ENGINEERING", name: "ARINC 653 Partitioning", source: "ARINC", standardRef: "Avionics Real-Time OS", verificationLevel: "LEAN4_THEOREM" }
  ],
  EARTH: [
    { id: "EAR-01", category: "EARTH", name: "WMO Global Observing System", source: "WMO", standardRef: "Meteorological Data", verificationLevel: "OMNI_SCIENCE" },
    { id: "EAR-02", category: "EARTH", name: "NOAA NCEI Climate Archive", source: "NOAA", standardRef: "Environmental Physics", verificationLevel: "OMNI_SCIENCE" },
    { id: "EAR-03", category: "EARTH", name: "USGS Earth Explorer", source: "USGS", standardRef: "Geological Topography", verificationLevel: "OMNI_SCIENCE" }
  ],
  SOCIAL: [
    { id: "SOC-01", category: "SOCIAL", name: "IEEE 7000 Series", source: "IEEE", standardRef: "Ethically Aligned AI Design", verificationLevel: "Z3_SMT" },
    { id: "SOC-02", category: "SOCIAL", name: "ISO/IEC 42001", source: "ISO/IEC", standardRef: "Artificial Intelligence Management", verificationLevel: "Z3_SMT" },
    { id: "SOC-03", category: "SOCIAL", name: "EU AI Act Compliance", source: "European Union", standardRef: "Autonomous System Constraints", verificationLevel: "LEAN4_THEOREM" }
  ]
};

export function lookupRegistry(category?: TCBCategory): TCBRegistryEntry[] {
  if (category && OMNI_REGISTRY[category]) {
    return OMNI_REGISTRY[category];
  }
  return Object.values(OMNI_REGISTRY).flat();
}
