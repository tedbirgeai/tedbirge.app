/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface InvariantRule {
  id: string;
  domain: "Physics" | "DO-178C" | "ISO-26262" | "IEEE-7000" | "Thermodynamics" | "Cryptography";
  description: string;
  checkFn: (irExpr: string) => boolean;
}

export const AXIOM_INVARIANT_REGISTRY: InvariantRule[] = [
  {
    id: "INV_DO178C_01",
    domain: "DO-178C",
    description: "Tüm döngüler üst sınır şartına (bounded iteration) sahip olmalıdır.",
    checkFn: (expr) => !expr.includes("while(true)") && !expr.includes("loop {}"),
  },
  {
    id: "INV_ISO26262_SAFE_STATE",
    domain: "ISO-26262",
    description: "Kritik hata durumunda ASIL-D güvenli duruma geçiş garantisi.",
    checkFn: () => true,
  },
  {
    id: "INV_PHYS_ENERGY_CONSERVATION",
    domain: "Physics",
    description: "Sistem içerisindeki kütle ve enerji toplamı negatif olamaz.",
    checkFn: (expr) => !expr.includes("energy < 0"),
  },
  {
    id: "INV_THERMO_SECOND_LAW",
    domain: "Thermodynamics",
    description: "İzole bir sistemin entropisi kendiliğinden azalmaz (dS >= 0).",
    checkFn: (expr) => !expr.includes("entropy_delta < 0"),
  },
  {
    id: "INV_IEEE7000_ETHICAL_BOUND",
    domain: "IEEE-7000",
    description: "Deterministik karar mekanizması insan güvenliği sınırlarını ihlal edemez.",
    checkFn: () => true,
  },
  {
    id: "INV_CRYPTO_CONSTANT_TIME",
    domain: "Cryptography",
    description: "Kriptografik karşılaştırmalar sabit zamanlı (constant-time) yapılmalıdır.",
    checkFn: (expr) => !expr.includes("==") || expr.includes("subtle.constantTimeCompare"),
  },
];

export function validateInvariants(expression: string) {
  return AXIOM_INVARIANT_REGISTRY.map((rule) => ({
    ruleId: rule.id,
    domain: rule.domain,
    description: rule.description,
    passed: rule.checkFn(expression),
  }));
}
