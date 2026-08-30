/**
 * FAZ 1 — VFS ŞEMA KİLİDİ
 * Depo sürümü ve klasör şeması sözleşmesini koruma altına alır.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOLDER,
  VFS_FOLDERS,
  VFS_SCHEMA_VERSION,
  folderForMime,
  normalizeFolder,
} from "@/lib/vfs/store";

describe("vfs şeması", () => {
  it("depo sürümü sabittir", () => {
    expect(VFS_SCHEMA_VERSION).toBe(2);
  });

  it("klasör kümesi değişmez", () => {
    expect([...VFS_FOLDERS]).toEqual(["Belgeler", "Görseller", "Medya", "İndirilenler"]);
    expect(VFS_FOLDERS).toContain(DEFAULT_FOLDER);
  });

  it("MIME türü doğru klasöre düşer", () => {
    expect(folderForMime("image/png")).toBe("Görseller");
    expect(folderForMime("audio/mpeg")).toBe("Medya");
    expect(folderForMime("video/mp4")).toBe("Medya");
    expect(folderForMime("application/pdf")).toBe("Belgeler");
  });

  it("şema dışı klasör reddedilir", () => {
    expect(normalizeFolder("Sistem32", "image/png")).toBe("Görseller");
    expect(normalizeFolder(undefined, "application/pdf")).toBe("Belgeler");
    expect(normalizeFolder(null)).toBe(DEFAULT_FOLDER);
    expect(normalizeFolder("Medya")).toBe("Medya");
  });
});
