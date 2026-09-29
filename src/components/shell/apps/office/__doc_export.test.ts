// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildPrintableHtml, sanitizeHtml } from "./doc-export";

describe("Writer dışa aktarma", () => {
  it("betik ve olay işleyicilerini temizler", () => {
    const out = sanitizeHtml('<p onclick="x()">a<script>bad()</script><img src="javascript:1"><b>b</b></p>');
    expect(out).not.toMatch(/script|onclick|javascript/);
    expect(out).toContain("<b>b</b>");
  });
  it("A4 sayfa kuralı içerir", () => {
    expect(buildPrintableHtml("<p>x</p>", "<t>")).toContain("size:A4");
    expect(buildPrintableHtml("<p>x</p>", "<t>")).not.toContain("<title><t>");
  });
});
