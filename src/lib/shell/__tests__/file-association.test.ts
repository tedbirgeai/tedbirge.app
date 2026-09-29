import { describe, expect, it } from "vitest";

import { associationFor, FOLDER_MIME } from "@/lib/shell/file-association";
import type { VfsEntry } from "@/lib/vfs/store";

function entry(name: string, mime: string): VfsEntry {
  return { id: name, name, mime, size: 1, at: 0, folder: "Belgeler" };
}

describe("dosya türü ilişkilendirme", () => {
  it("klasör ve PDF doğru uygulamaya gider", () => {
    expect(associationFor(entry("x.klasor", FOLDER_MIME))?.app).toBe("files");
    expect(associationFor(entry("rapor.pdf", "application/pdf"))?.app).toBe("pdf");
  });

  it("metin dosyaları Notlar'da, tablo dosyaları Tablolar'da açılır", () => {
    expect(associationFor(entry("not.txt", "text/plain"))).toEqual({ app: "notes", kind: "notes" });
    expect(associationFor(entry("okuma.md", "text/markdown"))?.app).toBe("notes");
    expect(associationFor(entry("veri.csv", "text/csv"))?.app).toBe("sheets");
    expect(associationFor(entry("veri.xlsx", "application/octet-stream"))?.app).toBe("sheets");
  });

  it("görsel/video Medya, ses Müzik uygulamasına gider", () => {
    expect(associationFor(entry("a.png", "image/png"))?.app).toBe("media");
    expect(associationFor(entry("a.mp4", "video/mp4"))?.app).toBe("media");
    expect(associationFor(entry("a.mp3", "audio/mpeg"))?.app).toBe("music");
  });

  it("eşleşmeyen tür için null döner", () => {
    expect(associationFor(entry("a.bin", "application/octet-stream"))).toBeNull();
  });

  it("ofis belgeleri kendi uygulamasında açılır", () => {
    expect(associationFor(entry("belge.tbw", "text/markdown"))).toEqual({
      app: "writer",
      kind: "writer",
    });
    expect(associationFor(entry("sunu.tbp", "application/json"))?.app).toBe("slides");
  });
});
