import { describe, expect, it } from "vitest";
import { csvCell, logsToCsv, logsToNdjson } from "@/lib/portal/export";
import { autonomyOf, formatStatus, hitTest, quotaOf, statusSummary } from "@/lib/portal/live";
import type { PortalNode } from "@/lib/portal/types";

const node = (o: Partial<PortalNode>): PortalNode => ({
  id: "n",
  label: "n",
  region: "r",
  status: "cevrimici",
  cpu: 1,
  memory: 1,
  latency: 100,
  quality: 90,
  lastSeen: 0,
  ...o,
});
const snap = {
  region: "TR",
  limitNote: "",
  usedMs: 0,
  budgetMs: 1000,
  ratio: 0,
  nextWindowAt: null,
  queued: 0,
  sent: 0,
  blocked: 0,
};

describe("durum barı", () => {
  it("boş", () => {
    expect(formatStatus(statusSummary([], [], null, false))).toBe(
      "0 cihaz aktif | — ms RTT | Mesh ölçülmedi",
    );
  });
  it("canlı + portal", () => {
    const s = statusSummary(
      [node({ latency: 100 }), node({ status: "cevrimdisi" })],
      [{ nodeId: "p", state: "connected" }],
      200,
      true,
    );
    expect(s).toMatchObject({ active: 2, rttMs: 150, sample: true });
  });
});

describe("otonom rozet", () => {
  it("yeşil / sarı / kırmızı", () => {
    expect(autonomyOf(snap).tone).toBe("ok");
    expect(autonomyOf(snap).text).toBe("Yasal Sınırlar İçinde Otonom Çalışıyor");
    expect(autonomyOf({ ...snap, blocked: 2 }).tone).toBe("warn");
    expect(autonomyOf({ ...snap, ratio: 1, nextWindowAt: 5 }).tone).toBe("error");
    expect(autonomyOf(snap).carriersTotal).toBe(8); // carrier-bridge.ts gerçek listesi
  });
});

describe("dışa aktarma", () => {
  it("CSV formül enjeksiyonu kaçışı", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it("NDJSON satır başına bir nesne, ms'li zaman", () => {
    const logs = [
      { id: "1", at: 1_700_000_000_123, level: "bilgi" as const, source: "s", message: "m" },
    ];
    const lines = logsToNdjson([...logs, ...logs]).split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).at).toBe("2023-11-14T22:13:20.123Z");
    expect(logsToCsv(logs).split("\n")[0]).toBe("zaman,seviye,kaynak,mesaj");
  });
});

describe("kota ve isabet", () => {
  it("5 sınırında 6. cihaz abonelik ister", () => {
    expect(quotaOf(5, 5).over).toBe(false);
    expect(quotaOf(6, 5).over).toBe(true);
  });
  it("en yakın düğüm seçilir", () => {
    const pts = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 10, y: 0 },
    ];
    expect(hitTest(pts, 8, 0)).toBe("b");
    expect(hitTest(pts, 100, 100)).toBeNull();
  });
});
