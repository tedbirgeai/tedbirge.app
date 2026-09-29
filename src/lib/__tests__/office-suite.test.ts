import { describe, expect, it } from "vitest";
import { formatValue, alignOf } from "@/components/shell/apps/office/sheet-format";
import { csvEscape, parseCsv, toXlsx, parseXlsx, toCsv } from "@/components/shell/apps/office/sheet-io";
import { parseBook } from "@/components/shell/apps/office/SheetsApp";
import { findIndices, replaceInText } from "@/components/shell/apps/office/find-replace";
import { parseAgenda } from "@/components/shell/apps/office/OrganizerApp";

describe("ofis paketi", () => {
  it("eski CSV belgesini v2 kitaba çevirir", () => {
    const b = parseBook("1,2\nx,\"a,b\"");
    expect(b.sheets[0]!.cells).toEqual({ A1: "1", B1: "2", A2: "x", B2: "a,b" });
  });
  it("sayı/para/yüzde biçimler", () => {
    expect(formatValue("1234.5", { num: "number" })).toBe("1.234,50");
    expect(formatValue("0.25", { num: "percent" })).toContain("25");
    expect(formatValue("10", { num: "try" })).toContain("₺");
    expect(formatValue("abc", { num: "usd" })).toBe("abc");
    expect(alignOf("5")).toBe("right");
  });
  it("CSV formül enjeksiyonunu kaçışlar", () => {
    expect(csvEscape("=cmd()")).toBe("'=cmd()");
    expect(csvEscape("-5")).toBe("-5");
    expect(toCsv({ A1: "a", B2: "b" }, (r) => ({ A1: "a", B2: "b" } as Record<string, string>)[r] ?? "")).toBe("a,\n,b");
  });
  it("XLSX gidiş-dönüş", async () => {
    const cells = { A1: "Ad", B1: "42", A2: "Ç&<", B2: "=SUM(B1:B1)" };
    expect(await parseXlsx(toXlsx(cells))).toEqual(cells);
  });
  it("CSV ; ayracını tanır", () => {
    expect(parseCsv("a;b\n1;2")).toEqual({ A1: "a", B1: "b", A2: "1", B2: "2" });
  });
  it("bul/değiştir", () => {
    expect(findIndices("Elma elma ELMA", "elma")).toEqual([0, 5, 10]);
    expect(findIndices("Elma elma", "elma", true)).toEqual([5]);
    expect(replaceInText("a-b-a", "a", "x")).toBe("x-b-x");
  });
  it("eski ajanda kayıtları orta öncelik alır", () => {
    const a = parseAgenda(JSON.stringify([{ text: "t", done: true }]));
    expect(a.cards[0]).toMatchObject({ title: "t", column: "tamam", priority: "orta" });
    const b = parseAgenda(JSON.stringify({ v: 2, cards: [{ id: "1", title: "x", column: "devam", due: "" }] }));
    expect(b.cards[0]!.priority).toBe("orta");
  });
});
