import { describe, expect, it, vi } from "vitest";

import asc from "assemblyscript/asc";
import { TEMPLATES, extractClaims, parseStudioManifest, seedStudioProject, templateFiles, type TemplateId } from "@/lib/studio/project";
import { resolveRepoPath } from "@/lib/vfs/sandbox";
import { buildManifest, wasmToDataUrl } from "@/lib/studio/packager";
import { compile, parseDiagnostics } from "@/lib/studio/compiler";
import { createLogSink, LOG_MAX_BYTES, parseTbApp } from "@/apps/tbapp";
import { hasSystemCapability } from "@/kernel/capabilities";

describe("tbapp.json", () => {
  it("geçerli manifest", () => {
    const m = parseStudioManifest('{"id":"yerel.x1","name":"X","version":"1.0.0","capabilities":["status.read"]}');
    expect(m.entry).toBe("assembly/index.ts");
  });
  it("bilinmeyen ve sistem yetkileri reddedilir", () => {
    expect(() => parseStudioManifest('{"id":"yerel.x1","name":"X","version":"1.0.0","capabilities":["repo.write"]}')).toThrow(/Tanınmayan/);
    expect(() => parseStudioManifest('{"id":"yerel.x1","name":"X","version":"1.0.0","capabilities":[],"entry":"../a.ts"}')).toThrow();
  });
  it("şablonlar ve tohum proje geçerli", () => {
    for (const t of Object.keys(TEMPLATES) as TemplateId[]) {
      const files = templateFiles("deneme", "Deneme", t);
      expect(() => parseStudioManifest(files[0]!.text)).not.toThrow();
    }
    expect(seedStudioProject().some((f) => f.path === "axiom-studio/tbapp.json")).toBe(true);
    expect(() => templateFiles("Kötü Ad", "x", "bos")).toThrow();
  });
  it("@claim satırları", () => {
    expect(extractClaims("a\n// @claim 1 = 2\n//@claim p")).toEqual(["1 = 2", "p"]);
  });
});

describe("/repo yazma izni", () => {
  it("yalnız Studio yazabilir; kaçış reddedilir", () => {
    expect(hasSystemCapability("studio", "repo.write")).toBe(true);
    expect(resolveRepoPath("studio", "proj/a.ts")).toBe("/repo/proj/a.ts");
    expect(() => resolveRepoPath("baska", "proj/a.ts")).toThrow(/yazamaz/);
    expect(() => resolveRepoPath("studio", "../etc/x")).toThrow();
    expect(() => resolveRepoPath("studio", "/system/x")).toThrow();
  });
});

describe("paketleyici ve host günlüğü", () => {
  it("wasm → data URL → parseTbApp", () => {
    const m = parseStudioManifest('{"id":"yerel.p1","name":"P","version":"0.1.0","capabilities":[]}');
    const pkg = buildManifest(m, new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    expect(pkg.module.startsWith("data:application/wasm;base64,")).toBe(true);
    expect(parseTbApp(JSON.stringify(pkg)).id).toBe("yerel.p1");
    expect(wasmToDataUrl(new Uint8Array([1, 2, 3]))).toBe("data:application/wasm;base64,AQID");
  });
  it("1 KB kesme ve saniyede 50 satır", () => {
    const lines: string[] = [];
    let t = 0;
    const sink = createLogSink((l) => lines.push(l), () => t);
    sink.write(new Uint8Array(LOG_MAX_BYTES + 10).fill(97));
    expect(lines[0]!.length).toBe(LOG_MAX_BYTES + 1);
    for (let i = 0; i < 60; i += 1) sink.write(new Uint8Array([98]));
    expect(lines).toHaveLength(50);
    t = 1500;
    sink.write(new Uint8Array([99]));
    expect(lines.at(-2)).toMatch(/11 satır/);
  });
});

describe("derleyici", () => {
  it("süre aşımında işçi sonlandırılır", async () => {
    const terminate = vi.fn();
    const r = await compile({ "a.ts": "" }, "a.ts", {
      timeoutMs: 10,
      loadTimeoutMs: 10,
      factory: () => ({ postMessage: () => {}, terminate, onmessage: null }),
    });
    expect(r.ok).toBe(false);
    expect(terminate).toHaveBeenCalled();
  });
  it("tanı satırları ayrıştırılır", () => {
    const p = parseDiagnostics("ERROR TS2304: Cannot find name 'x'.\n   :\n 3 │ x;\n   └─ in assembly/index.ts(3,1)\n", "e.ts");
    expect(p[0]).toMatchObject({ severity: "error", line: 3, col: 1 });
  });
  it("Merhaba şablonu gerçekten derlenir ve log çağırır", async () => {
    const code = templateFiles("m", "M", "merhaba")[1]!.text;
    const r = await asc.compileString({ "index.ts": code }, { optimizeLevel: 2, runtime: "stub", use: ["abort="] } as never);
    expect(r.error).toBeFalsy();
    const lines: string[] = [];
    let mem: WebAssembly.Memory | undefined;
    const { instance } = (await WebAssembly.instantiate(r.binary as Uint8Array, {
      tedbirge: {
        log: (p: number, l: number) => lines.push(new TextDecoder().decode(new Uint8Array(mem!.buffer, p, l))),
        status_peers: () => 0,
        status_online: () => 0,
      },
    })) as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    mem = instance.exports["memory"] as WebAssembly.Memory;
    (instance.exports["start"] as () => void)();
    expect(lines).toEqual(["Merhaba, Tedbirge!"]);
  }, 30_000);
});
