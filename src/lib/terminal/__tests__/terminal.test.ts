import { describe, expect, it } from "vitest";

import { ALIASES, COMMANDS } from "../commands";
import { lex, parse, splitFlags } from "../lexer";
import { ROOT, folderOf, resolvePath, splitTarget } from "../paths";

describe("terminal sözdizimi", () => {
  it("tırnaklı argümanları tek parça okur", () => {
    expect(lex('echo "merhaba dünya" tek')).toEqual(["echo", "merhaba dünya", "tek"]);
  });

  it("boru hattını aşamalara böler", () => {
    const p = parse("cat not.txt | grep tedbirge");
    expect(p.stages).toHaveLength(2);
    expect(p.stages[1]?.argv[0]).toBe("grep");
  });

  it("yönlendirmeyi ayırır", () => {
    const p = parse("ls -l >> kayit.txt");
    expect(p.redirect).toEqual({ mode: ">>", target: "kayit.txt" });
    expect(p.stages[0]?.argv).toEqual(["ls", "-l"]);
  });

  it("hedefsiz yönlendirmeyi reddeder", () => {
    expect(() => parse("ls >")).toThrow();
  });

  it("birleşik bayrakları ayrıştırır", () => {
    const { args, flags } = splitFlags(["-la", "Belgeler"]);
    expect(args).toEqual(["Belgeler"]);
    expect(flags.has("l") && flags.has("a")).toBe(true);
  });
});

describe("terminal yol çözümü", () => {
  it("kökten klasöre iner", () => {
    expect(resolvePath(ROOT, "Belgeler")).toBe("/Belgeler");
  });

  it("üst dizine çıkar", () => {
    expect(resolvePath("/Belgeler", "..")).toBe(ROOT);
  });

  it("olmayan klasörü reddeder", () => {
    expect(resolvePath(ROOT, "YokBoyleKlasor")).toBeNull();
  });

  it("hedefi klasör ve ada böler", () => {
    expect(splitTarget("/Belgeler", "not.txt")).toEqual({ folder: "Belgeler", name: "not.txt" });
  });

  it("klasör adını çözer", () => {
    expect(folderOf("/Görseller")).toBe("Görseller");
  });
});

describe("komut kayıt defteri", () => {
  it("kritik komutları içerir", () => {
    const names = COMMANDS.map((c) => c.name);
    for (const n of ["ls", "cd", "cat", "rm", "grep", "mesh", "ping", "vault", "gpu", "wasm"]) {
      expect(names).toContain(n);
    }
  });

  it("her takma ad gerçek bir komuta işaret eder", () => {
    const names = new Set(COMMANDS.map((c) => c.name));
    for (const target of Object.values(ALIASES)) {
      expect(names.has(target.split(/\s+/)[0] as string)).toBe(true);
    }
  });

  it("her komutun kullanımı ve özeti vardır", () => {
    for (const c of COMMANDS) {
      expect(c.usage.length).toBeGreaterThan(1);
      expect(c.summary.length).toBeGreaterThan(3);
    }
  });
});
