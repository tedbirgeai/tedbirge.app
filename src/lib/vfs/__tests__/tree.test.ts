import { describe, expect, it } from "vitest";

import { resolvePath, splitTarget, subPathOf } from "@/lib/terminal/paths";
import type { VfsEntry } from "@/lib/vfs/store";
import { baseName, childrenOf, entriesUnder, treeAt } from "@/lib/vfs/tree";

const entry = (name: string): VfsEntry => ({
  id: `repo:${name}`,
  name,
  mime: "text/plain",
  size: 1,
  at: 0,
  folder: "repo",
});

const files = [
  entry("tedbirge-webos/limen.json"),
  entry("tedbirge-webos/src/BRANCH"),
  entry("tedbirge-webos/delta/durum.txt"),
];

describe("VFS ağaç görünümü", () => {
  it("kök altındaki dizinleri ve dosyaları ayırır", () => {
    const root = childrenOf(files);
    expect(root.dirs).toEqual(["tedbirge-webos"]);
    expect(root.files).toHaveLength(0);

    const inner = childrenOf(files, "tedbirge-webos");
    expect(inner.dirs).toEqual(["delta", "src"]);
    expect(inner.files.map(baseName)).toEqual(["limen.json"]);
  });

  it("alt ağacın tüm kayıtlarını verir", () => {
    expect(entriesUnder(files, "tedbirge-webos")).toHaveLength(3);
    expect(entriesUnder(files, "tedbirge-webos/src")).toHaveLength(1);
  });

  it("girintili ağaç dökümü üretir", () => {
    const rows = treeAt(files, "tedbirge-webos");
    expect(rows[0]).toEqual({ depth: 0, label: "delta/", dir: true });
    expect(rows.some((r) => r.label === "BRANCH" && r.depth === 1)).toBe(true);
  });
});

describe("terminal yol çözümleyici", () => {
  it("çok seviyeli repo yollarını çözer", () => {
    expect(resolvePath("/", "repo/tedbirge-webos/src")).toBe("/repo/tedbirge-webos/src");
    expect(subPathOf("/repo/tedbirge-webos/src")).toBe("tedbirge-webos/src");
    expect(resolvePath("/repo/tedbirge-webos", "..")).toBe("/repo");
    expect(resolvePath("/", "yok/bir-yer")).toBeNull();
  });

  it("dosya argümanını klasör ve iç yola böler", () => {
    expect(splitTarget("/repo/tedbirge-webos", "src/BRANCH")).toEqual({
      folder: "repo",
      name: "tedbirge-webos/src/BRANCH",
    });
  });
});
