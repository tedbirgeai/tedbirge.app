import { describe, expect, it } from "vitest";

import { buildStages, gatewayTarget } from "@/lib/shell/embed-strategy";
import { GATEWAY_HOSTS, gatewayAllowed } from "@/lib/shell/gateway-hosts";
import { WEB_APPS } from "@/shell/web-apps";

describe("Geçit izin listesi", () => {
  it("kamusal hedeflere izin verir", () => {
    expect(gatewayAllowed("https://tr.wikipedia.org/wiki/Ana_Sayfa")).toBe(true);
    expect(gatewayAllowed("https://news.ycombinator.com/")).toBe(true);
    expect(gatewayAllowed("https://developer.mozilla.org/tr/")).toBe(true);
  });

  it("oturumlu servisleri reddeder", () => {
    for (const u of [
      "https://web.whatsapp.com/",
      "https://www.linkedin.com/",
      "https://accounts.google.com/",
      "https://open.spotify.com/",
    ]) {
      expect(gatewayAllowed(u)).toBe(false);
    }
  });

  it("yalnız https kabul eder", () => {
    expect(gatewayAllowed("http://tr.wikipedia.org/")).toBe(false);
  });

  it("listede tekrar eden alan adı yoktur", () => {
    expect(new Set(GATEWAY_HOSTS).size).toBe(GATEWAY_HOSTS.length);
  });
});

describe("Gömme zinciri", () => {
  it("izin listesinde olmayan proxy hedefi zincire girmez", () => {
    const stages = buildStages({
      url: "https://example.invalid/",
      embed: "auto",
      proxy: true,
    });
    expect(stages.every((s) => !s.src.startsWith("/api/public/gecit"))).toBe(true);
  });

  it("izin listesindeki hedef için geçit aşaması eklenir", () => {
    const stages = buildStages({ url: "https://tr.wikipedia.org/", embed: "auto", proxy: true });
    expect(stages.some((s) => s.src.startsWith("/api/public/gecit"))).toBe(true);
  });

  it("katalogdaki her proxy hedefi izin listesindedir", () => {
    for (const app of WEB_APPS) {
      if (!app.proxy) continue;
      expect(gatewayTarget(app), `${app.id} geçit hedefi izinli olmalı`).not.toBeNull();
    }
  });
});

describe("Geçit otomatik devreye girer", () => {
  it("proxy tanımı olmasa da izinli hedef geçitten geçer", () => {
    const stages = buildStages({ url: "https://tr.wikipedia.org/wiki/Ana_Sayfa", embed: "auto" });
    expect(stages[0]?.src.startsWith("/api/public/gecit")).toBe(true);
  });

  it("pencere içi arama (lite.duckduckgo) geçit üzerinden koşar", () => {
    const stages = buildStages({ url: "https://lite.duckduckgo.com/lite/?q=test", embed: "iframe" });
    expect(stages.some((s) => s.src.startsWith("/api/public/gecit"))).toBe(true);
  });

  it("www. öneki ile kök alan adı aynı kabul edilir", () => {
    expect(gatewayAllowed("https://www.coingecko.com/")).toBe(true);
    expect(gatewayAllowed("https://coingecko.com/")).toBe(true);
  });
});
