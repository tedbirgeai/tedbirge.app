import { beforeEach, describe, expect, it } from "vitest";

import { APPDATA_ROOT, appRoot, resolveAppPath, VfsAccessError } from "@/lib/vfs/sandbox";
import { consumeVfsToken, issueVfsToken, resetTokenSession, VfsTokenError } from "@/lib/vfs/tokens";

describe("uygulama alanı izolasyonu", () => {
  it("uygulamaya kendi kökünü verir", () => {
    expect(appRoot("ornek.sayac")).toBe(`${APPDATA_ROOT}/ornek.sayac`);
  });

  it("göreli yolu kendi alanına çözer", () => {
    expect(resolveAppPath("ornek.sayac", "notlar/gun.txt")).toBe(
      "/appdata/ornek.sayac/notlar/gun.txt",
    );
  });

  it("üst dizine kaçışı reddeder", () => {
    expect(() => resolveAppPath("ornek.sayac", "../digeri/gizli.txt")).toThrow(VfsAccessError);
  });

  it("başka uygulamanın alanını reddeder", () => {
    expect(() => resolveAppPath("ornek.sayac", "/appdata/digeri/gizli.txt")).toThrow(
      VfsAccessError,
    );
  });

  it("sistem ve proje köklerini reddeder", () => {
    expect(() => resolveAppPath("ornek.sayac", "/system/anahtar")).toThrow(VfsAccessError);
    expect(() => resolveAppPath("ornek.sayac", "/repo/axiom/limen.json")).toThrow(VfsAccessError);
  });

  it("geçersiz uygulama kimliğini reddeder", () => {
    expect(() => appRoot("../")).toThrow(VfsAccessError);
  });
});

describe("tek kullanımlık yetki anahtarı", () => {
  beforeEach(() => resetTokenSession());

  it("kapsam içindeki isteği geçirir", async () => {
    const t = await issueVfsToken("a.b", "write", "/appdata/a.b/notlar");
    await expect(
      consumeVfsToken(t, { appId: "a.b", op: "write", path: "/appdata/a.b/notlar/1.txt" }),
    ).resolves.toBeUndefined();
  });

  it("aynı anahtarı ikinci kez kabul etmez", async () => {
    const t = await issueVfsToken("a.b", "read", "/appdata/a.b/x.txt");
    const need = { appId: "a.b", op: "read" as const, path: "/appdata/a.b/x.txt" };
    await consumeVfsToken(t, need);
    await expect(consumeVfsToken(t, need)).rejects.toBeInstanceOf(VfsTokenError);
  });

  it("süresi geçmiş anahtarı reddeder", async () => {
    const t = await issueVfsToken("a.b", "read", "/appdata/a.b/x.txt", 1);
    await new Promise((r) => setTimeout(r, 5));
    await expect(
      consumeVfsToken(t, { appId: "a.b", op: "read", path: "/appdata/a.b/x.txt" }),
    ).rejects.toBeInstanceOf(VfsTokenError);
  });

  it("başka uygulama, başka işlem ve kapsam dışı yolu reddeder", async () => {
    const t = await issueVfsToken("a.b", "read", "/appdata/a.b/notlar");
    await expect(
      consumeVfsToken(t, { appId: "c.d", op: "read", path: "/appdata/a.b/notlar/1.txt" }),
    ).rejects.toBeInstanceOf(VfsTokenError);
    await expect(
      consumeVfsToken(t, { appId: "a.b", op: "delete", path: "/appdata/a.b/notlar/1.txt" }),
    ).rejects.toBeInstanceOf(VfsTokenError);
    await expect(
      consumeVfsToken(t, { appId: "a.b", op: "read", path: "/appdata/a.b/baska/1.txt" }),
    ).rejects.toBeInstanceOf(VfsTokenError);
  });

  it("mührü bozulmuş anahtarı reddeder", async () => {
    const t = await issueVfsToken("a.b", "read", "/appdata/a.b/x.txt");
    const bozuk = { ...t, prefix: "/appdata/a.b" };
    await expect(
      consumeVfsToken(bozuk, { appId: "a.b", op: "read", path: "/appdata/a.b/x.txt" }),
    ).rejects.toBeInstanceOf(VfsTokenError);
  });
});
