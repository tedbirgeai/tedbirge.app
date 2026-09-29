import { describe, expect, it } from "vitest";
import { evaluate, fillSeries, shiftFormula } from "@/components/shell/apps/office/formula";
import { chartSeries } from "@/components/shell/apps/office/SheetChart";
import { groupMessages } from "@/components/messenger/MessageList";
import { pushRecent, searchEmoji } from "@/components/messenger/EmojiPicker";
import { parseAnsi, stripAnsi } from "@/lib/terminal/ansi";
import { head, sortLines, tail, uniq, wc } from "@/lib/terminal/filters";
import { fuzzyScore, searchSettings } from "@/lib/shell/settings-index";

const cells = { A1: "2", A2: "3", A3: "5", B1: "=A1*10", C1: "=C2", C2: "=C1", D1: "abc" };

describe("formül motoru", () => {
  it("toplama ve iç içe", () => {
    expect(evaluate("=SUM(A1:A3)", cells)).toBe("10");
    expect(evaluate("=AVERAGE(A1:A3)+1", cells)).toBe("4.3333333333");
    expect(evaluate("=COUNT(A1:A3,D1)", cells)).toBe("3");
    expect(evaluate('=IF(SUM(A1:A3)>9,"büyük","küçük")', cells)).toBe("büyük");
    expect(evaluate("=ROUND(MAX(A1:A3)/3,2)", cells)).toBe("1.67");
    expect(evaluate("=B1+1", cells)).toBe("21");
    expect(evaluate("=(1+2)*3^2", cells)).toBe("27");
  });
  it("hata kodları", () => {
    expect(evaluate("=C1", cells)).toBe("#CYCLE");
    expect(evaluate("=A1/0", cells)).toBe("#DIV/0");
    expect(evaluate("=FOO(1)", cells)).toBe("#NAME");
    expect(evaluate("=1+", cells)).toBe("#HATA");
  });
  it("kod çalıştırmaz", () => {
    expect(evaluate("=alert(1)", cells)).toBe("#NAME");
  });
  it("doldurma kaydırma", () => {
    expect(shiftFormula("=A1+$B$1", 0, 2)).toBe("=A3+$B$1");
    expect(shiftFormula("=A1", 1, 0)).toBe("=B1");
    expect(fillSeries(["1", "2"], 3, "down")).toEqual(["3", "4", "5"]);
    expect(fillSeries(["=A1"], 2, "down")).toEqual(["=A2", "=A3"]);
  });
  it("grafik serisi", () => {
    const v = (c: number, r: number) => ({ "0,1": "x", "1,1": "4", "0,2": "y", "1,2": "6" } as Record<string, string>)[`${c},${r}`] ?? "";
    expect(chartSeries({ c1: 0, r1: 1, c2: 1, r2: 2 }, v)).toEqual([{ label: "x", v: 4 }, { label: "y", v: 6 }]);
  });
});

describe("terminal", () => {
  it("ANSI", () => {
    const s = parseAnsi("a\u001b[1;31mb\u001b[0mc\u001b[38;5;21md");
    expect(s.map((x) => x.text)).toEqual(["a", "b", "c", "d"]);
    expect(s[1]!.style.bold).toBe(true);
    expect(s[1]!.style.fg).toContain("--tb-danger");
    expect(s[3]!.style.fg).toMatch(/^rgb/);
    expect(stripAnsi("\u001b[32mok\u001b[0m")).toBe("ok");
    expect(parseAnsi("<b>x</b>")[0]!.text).toBe("<b>x</b>");
  });
  it("filtreler", () => {
    const t = "c\nb\nb\na";
    expect(head(t, 2)).toEqual(["c", "b"]);
    expect(tail(t, 1)).toEqual(["a"]);
    expect(wc(t, new Set(["l"]))).toBe("4");
    expect(sortLines(t, new Set())).toEqual(["a", "b", "b", "c"]);
    expect(sortLines("10\n9", new Set(["n", "r"]))).toEqual(["10", "9"]);
    expect(uniq(t)).toEqual(["c", "b", "a"]);
  });
});

describe("arama ve sohbet", () => {
  it("ayar araması", () => {
    expect(searchSettings("sessiz")[0]?.key).toBe("sound");
    expect(searchSettings("gece")[0]?.key).toBe("theme");
    expect(fuzzyScore("ter", "Terminal")).toBeGreaterThan(fuzzyScore("ter", "Ayarlar menüsü term"));
    expect(fuzzyScore("xyz", "Terminal")).toBe(0);
  });
  it("mesaj gruplama", () => {
    const g = groupMessages([
      { id: "1", from: "A", at: "", text: "x", day: "d1" },
      { id: "2", from: "A", at: "", text: "y", day: "d1" },
      { id: "3", from: "B", at: "", text: "z", day: "d1" },
      { id: "4", from: "B", at: "", text: "w", day: "d2" },
    ]);
    expect(g.map((x) => x.items.length)).toEqual([2, 1, 1]);
  });
  it("emoji", () => {
    expect(searchEmoji("kalp")).toContain("❤️");
    expect(pushRecent(["a", "b"], "b")).toEqual(["b", "a"]);
  });
});
