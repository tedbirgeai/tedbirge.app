/**
 * FAZ C — Rust çekirdeği ile TypeScript motorunun eşitlik testi.
 * ------------------------------------------------------------------
 * Aynı grafik her iki motora verilir; ulaşılabilirlik, toplam maliyet
 * ve atlama sayısı birebir eşleşmelidir. `.wasm` derlenmemişse test
 * atlanır (kabuk zaten TS motoruna düşer).
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { decodeRouteResult, encodeRouteRequest } from "@/kernel/route-codec";
import { localSubgraph, shortestPath, TRANSPORTS, type Graph } from "@/lib/mesh-routing";

type Exports = {
  abi_version: () => number;
  route_solve?: (ptr: number, len: number) => number;
  kernel_alloc: (len: number) => number;
  kernel_free: (ptr: number, len: number) => void;
  memory: WebAssembly.Memory;
};

function loadKernel(): Exports | null {
  try {
    const bytes = readFileSync("public/kernel/tedbirge_kernel.wasm");
    const mod = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(mod, {});
    const ex = instance.exports as unknown as Exports;
    return typeof ex.route_solve === "function" ? ex : null;
  } catch {
    return null;
  }
}

function solveNative(ex: Exports, request: ArrayBuffer) {
  const bytes = new Uint8Array(request);
  const inPtr = ex.kernel_alloc(bytes.length);
  new Uint8Array(ex.memory.buffer, inPtr, bytes.length).set(bytes);
  const outPtr = ex.route_solve!(inPtr, bytes.length);
  const len = new DataView(ex.memory.buffer).getUint32(outPtr, true);
  const out = ex.memory.buffer.slice(outPtr + 4, outPtr + 4 + len);
  ex.kernel_free(outPtr, len + 4);
  ex.kernel_free(inPtr, bytes.length);
  return decodeRouteResult(out);
}

function randomGraph(seed: number): Graph {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const nodes = Array.from({ length: 6 }, (_, i) => `node-${i}`);
  const edges = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (rnd() < 0.45) continue;
      edges.push({
        from: nodes[i]!,
        to: nodes[j]!,
        transport: TRANSPORTS[Math.floor(rnd() * TRANSPORTS.length)]!.id,
        quality: Math.round(Math.max(0.05, rnd()) * 255) / 255,
      });
    }
  }
  return { nodes, edges };
}

const kernel = loadKernel();

describe.skipIf(!kernel)("Wasm çekirdeği ↔ TypeScript rota eşitliği", () => {
  it("aynı maliyeti ve ulaşılabilirliği üretir", () => {
    const ex = kernel!;
    expect(ex.abi_version()).toBe(1);

    for (let seed = 1; seed <= 25; seed += 1) {
      const graph = randomGraph(seed);
      const from = graph.nodes[0]!;
      const to = graph.nodes[graph.nodes.length - 1]!;
      const radius = 4;

      const request = encodeRouteRequest({ graph, from, to, radius });
      const native = solveNative(ex, request);

      const scoped = localSubgraph(graph, from, radius);
      const used = scoped.nodes.includes(to) ? scoped : graph;
      const ts = shortestPath(used, from, to, { metrics: false });

      expect(native.reachable).toBe(ts.reachable);
      if (!ts.reachable) continue;
      expect(native.hops.length).toBe(ts.hops.length);
      expect(native.cost).toBeCloseTo(ts.cost, 2);
      expect(native.path[0]).toBe(from);
      expect(native.path[native.path.length - 1]).toBe(to);
    }
  });
});
