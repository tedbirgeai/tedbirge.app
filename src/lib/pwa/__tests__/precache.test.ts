/**
 * FAZ 1 — ÇEVRİMDIŞI BÜTÜNLÜK KİLİDİ
 * Service worker yapılandırması bozulursa (wasm önbelleğe alınmazsa veya
 * gezinme yedeği kaybolursa) tam çevrimdışı açılış çöker; bu test o
 * yapılandırmayı sözleşme olarak korur.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

describe("pwa çevrimdışı önbelleği", () => {
  it("çekirdek wasm modülü ön belleğe alınır", () => {
    const glob = /globPatterns:\s*\[([^\]]+)\]/.exec(config)?.[1] ?? "";
    expect(glob).toContain("wasm");
    expect(glob).toContain("json");
  });

  it("çevrimdışı gezinme masaüstü kabuğuna düşer", () => {
    expect(config).toContain('navigateFallback: "/"');
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[[^\]]*\/\^\\\/api\\\//);
  });

  it("önizlemede service worker kaydı kapalıdır", () => {
    expect(config).toContain("devOptions: { enabled: false }");
    expect(config).toContain("injectRegister: null");
  });
});
