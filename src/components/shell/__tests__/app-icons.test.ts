import { describe, expect, it } from "vitest";

import { brandKey, domainOf, hasLocalBrandIcon } from "@/components/shell/BrandIcon";
import { WEB_APPS } from "@/shell/web-apps";

describe("yerel marka ikonları", () => {
  it("harici katalogdaki her hedefi yerel renkli logoyla eşler", () => {
    const missing = WEB_APPS.filter((app) => {
      const domain = app.iconDomain ?? domainOf(app.url);
      return !hasLocalBrandIcon(domain);
    }).map((app) => app.id);

    expect(missing).toEqual([]);
  });

  it("temsilî alan adlarını doğru marka ailesine çözer", () => {
    expect(brandKey("www.google.com")).toBe("google");
    expect(brandKey("web.whatsapp.com")).toBe("whatsapp");
    expect(brandKey("open.spotify.com")).toBe("spotify");
    expect(brandKey("github.com")).toBe("github");
    expect(brandKey("unknown.invalid")).toBeNull();
  });
});