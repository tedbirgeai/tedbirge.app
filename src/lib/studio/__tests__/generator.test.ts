import { describe, expect, it } from "vitest";

import {
  GeneratorError,
  generateApp,
  generatedFiles,
  parseGeneratedManifest,
  slugify,
  tsxFor,
  MAX_PROMPT,
} from "@/lib/studio/generator";
import { ALLOWED_GENERATED_CAPS } from "@/lib/studio/generated-policy";

describe("doğal dil uygulama üreteci", () => {
  it("Türkçe istemden ad, kimlik ve bloklar üretir", () => {
    const s = generateApp("Ağdaki eş sayısını gösteren bir pano yap", 1000);
    expect(s.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(s.id.startsWith("uretim.")).toBe(true);
    expect(s.blocks.some((b) => b.kind === "durum")).toBe(true);
    expect(s.blocks.at(-1)?.kind).toBe("gunluk");
    expect(s.createdAt).toBe(1000);
  });

  it("farklı dillerdeki anahtar sözcükleri tanır", () => {
    const en = generateApp("build a counter with notes and notifications");
    expect(en.blocks.map((b) => b.kind)).toEqual(
      expect.arrayContaining(["sayac", "not", "bildirim"]),
    );
  });

  it("işlev anlaşılamayan istemde boş uygulama üretmez", () => {
    const s = generateApp("kırmızı güzel bir şey olsun");
    expect(s.blocks.length).toBeGreaterThan(3);
  });

  it("çok kısa ve çok uzun istemleri reddeder", () => {
    expect(() => generateApp("ab")).toThrow(GeneratorError);
    expect(() => generateApp("a".repeat(MAX_PROMPT + 1))).toThrow(GeneratorError);
  });

  it("yalnız izin verilen yetkileri ister", () => {
    const s = generateApp("eş durumunu gösteren pano");
    for (const c of s.capabilities) expect(ALLOWED_GENERATED_CAPS).toContain(c);
  });

  it("Türkçe karakterleri güvenli dosya adına indirir", () => {
    expect(slugify("Şeker Çöp Ölçüm")).toBe("seker-cop-olcum");
    expect(() => slugify("!!!")).toThrow(GeneratorError);
  });

  it("dosyaları /repo/apps/<ad>/ altında üretir ve manifest geri okunur", () => {
    const s = generateApp("sayaç ve not tutan araç");
    const files = generatedFiles(s);
    const paths = files.map((f) => f.path);
    expect(paths).toContain(`apps/${s.slug}/manifest.json`);
    expect(paths).toContain(`apps/${s.slug}/index.tsx`);
    expect(paths).toContain(`apps/${s.slug}/assembly/index.ts`);
    for (const p of paths) expect(p.includes("..")).toBe(false);
    const manifest = files.find((f) => f.path.endsWith("manifest.json"))!;
    expect(parseGeneratedManifest(manifest.text).blocks).toEqual(s.blocks);
  });

  it("AssemblyScript kaynağı yalnız host köprüsünü içe aktarır", () => {
    const s = generateApp("eş sayacı ve hesap makinesi");
    expect(s.assembly).toContain('@external("tedbirge", "status_peers")');
    expect(s.assembly).toContain("export function start(): void");
    expect(s.assembly).not.toMatch(/\bimport\s/);
  });

  it("üretilen React kaynağı içe aktarma gerektirmez", () => {
    const s = generateApp("not defteri uygulaması");
    const code = tsxFor(s);
    expect(code).not.toMatch(/^import /m);
    expect(code).toContain("export default function");
  });
});
