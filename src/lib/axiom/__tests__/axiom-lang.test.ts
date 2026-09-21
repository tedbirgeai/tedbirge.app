/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { describe, expect, it } from "vitest";

import { matchInvariants } from "@/lib/axiom/invariants";
import { askAscii, astMetrics, tokenize } from "@/lib/axiom/lang/ask-ascii";
import { toIr } from "@/lib/axiom/lang/axiom-ir";
import { detectLanguage, dominantScript } from "@/lib/axiom/lang/detect";
import { toNodeView, FREE_NODE_LIMIT } from "@/lib/axiom/net/node";
import { SCIENCE_CATEGORIES } from "@/lib/axiom/registry";

describe("dil tanıma", () => {
  it("insan dillerini ayırt eder", () => {
    expect(
      detectLanguage("Bu sistem bir enerji kaynağı ile çalışır ve kanun gereği korunur.").id,
    ).toBe("tr");
    expect(detectLanguage("The energy of the system is conserved for that reason.").id).toBe("en");
    expect(detectLanguage("Der Energie wird nicht mit das System und die Zahl.").id).toBe("de");
    expect(detectLanguage("Les énergie est pour la des les avec pas.").id).toBe("fr");
    expect(detectLanguage("Энергия и не для это").id).toBe("ru");
    expect(detectLanguage("能量 的 是 系统").id).toBe("zh");
  });

  it("kod ve donanım dillerini tanır", () => {
    expect(detectLanguage("fn main() { let mut x = 1; }").id).toBe("rust");
    expect(detectLanguage('#include <stdio.h>\nint main() { printf("hi"); }').id).toBe("c");
    expect(detectLanguage("pragma solidity ^0.8.0;\ncontract A { }").id).toBe("solidity");
    expect(detectLanguage("entity adder is\narchitecture rtl of adder is").id).toBe("hdl");
    expect(detectLanguage("IDENTIFICATION DIVISION.\nPROCEDURE DIVISION.").id).toBe("cobol");
    expect(detectLanguage("PROGRAM demo\nIMPLICIT NONE\nEND PROGRAM").id).toBe("fortran");
    expect(detectLanguage("SELECT id FROM users").id).toBe("sql");
  });

  it("boş ve tanınmayan girdide uydurma yapmaz", () => {
    expect(detectLanguage("   ").kind).toBe("unknown");
    expect(detectLanguage("§§§ ¤¤¤").kind).toBe("unknown");
  });

  it("baskın yazı sistemini bulur", () => {
    expect(dominantScript("merhaba")).toBe("Latin");
    expect(dominantScript("Привет")).toBe("Kiril");
  });
});

describe("ASK ASCII ayrıştırıcı", () => {
  it("yorum, dizgi ve sayıları ayırır", () => {
    const tokens = tokenize('// yorum\nlet x = "metin"; /* blok */ 42 kwh');
    expect(tokens.filter((t) => t.type === "comment")).toHaveLength(2);
    expect(tokens.find((t) => t.type === "string")?.value).toBe('"metin"');
    expect(tokens.find((t) => t.type === "number")?.value).toBe("42");
  });

  it("iç içe parantezleri ağaca çevirir", () => {
    const { ast } = askAscii("f(g(h(1)));");
    const m = astMetrics(ast);
    expect(m.depth).toBeGreaterThanOrEqual(4);
    expect(m.nodes).toBeGreaterThan(4);
  });

  it("UTF-8 çok baytlı metni bozmadan ayrıştırır", () => {
    const tokens = tokenize("çğüşiöİ ışık hızı");
    expect(tokens.every((t) => t.type === "word")).toBe(true);
    expect(tokens[0].value).toBe("çğüşiöİ");
  });
});

describe("ara gösterim", () => {
  it("nicelik, ilişki ve olumsuzlama çıkarır", () => {
    const ir = toIr(tokenize("verim 42 % değil ve enerji <= 10 kj"));
    expect(ir.negated).toBe(true);
    expect(ir.quantities.some((q) => q.value === 42)).toBe(true);
    expect(ir.quantities.some((q) => q.unit?.toLowerCase() === "kj")).toBe(true);
    expect(ir.relations.some((r) => r.op === "<=")).toBe(true);
    expect(ir.concepts).toContain("enerji");
    expect(ir.concepts).not.toContain("ve");
  });
});

describe("değişmez eşleştirme", () => {
  const eslesme = (text: string) => matchInvariants(toIr(tokenize(text)), text);

  it("termodinamik ihlalini çelişki olarak işaretler", () => {
    const m = eslesme("Bu makine yoktan enerji üretir ve verimi %100 olur.");
    expect(m.some((x) => x.invariant.id === "thermo.1" && x.verdict === "celiski")).toBe(true);
    expect(m.some((x) => x.invariant.id === "thermo.2" && x.verdict === "celiski")).toBe(true);
  });

  it("alanla ilgili iddiayı ilgili sayar", () => {
    const m = eslesme("Kanalın bant genişliği 20 mhz ve gürültü seviyesi düşüktür.");
    expect(m.some((x) => x.invariant.id === "info.shannon" && x.verdict === "ilgili")).toBe(true);
  });

  it("ilgisiz metinde eşleşme üretmez", () => {
    expect(eslesme("Bugün pazara gittim, domates aldım")).toHaveLength(0);
  });

  it("çelişkiler listede önce gelir", () => {
    const m = eslesme("Sınırsız bant genişliği sağlıyoruz; kanal kapasitesi ve gürültü önemsiz.");
    expect(m[0].verdict).toBe("celiski");
  });
});

describe("bilim matrisi ve düğüm görünümü", () => {
  it("altı kategori ve defterler tanımlıdır", () => {
    expect(SCIENCE_CATEGORIES).toHaveLength(6);
    expect(SCIENCE_CATEGORIES.every((c) => c.ledgers.length >= 3)).toBe(true);
  });

  it("düğüm durumu ücretsiz sınırı uygular", () => {
    const base = {
      running: true,
      nodeId: "n1",
      online: true,
      queued: 0,
      lastHeartbeatAt: null,
      lastRelayAt: null,
      rttMs: null,
      error: null,
      discovery: "internet" as const,
      fingerprint: "ab:cd",
      droppedUnsigned: 0,
      notice: null,
    };
    const peer = (i: number) => ({
      id: `p${i}`,
      direct: true,
      lastSeen: 0,
      trusted: true,
      verified: true,
    });

    const routes = { reflector: 2, relay: 1 };
    const free = toNodeView(
      { ...base, peers: Array.from({ length: 3 }, (_, i) => peer(i)) } as never,
      routes,
    );
    expect(free.status).toBe("NODE_ACTIVE_FREE");
    expect(free.routes.direct).toBe(true);

    const paid = toNodeView(
      { ...base, peers: Array.from({ length: FREE_NODE_LIMIT + 1 }, (_, i) => peer(i)) } as never,
      routes,
    );
    expect(paid.status).toBe("SUBSCRIPTION_REQUIRED");

    const off = toNodeView({ ...base, running: false, peers: [] } as never, routes);
    expect(off.status).toBe("NODE_OFFLINE");
  });
});
