import { describe, expect, it, vi } from "vitest";

import { acquireLeadership, backoffMs, createServiceManager, MAX_RESTARTS, topoOrder } from "@/shell/services/registry";
import { createMeshDaemon } from "@/lib/axiom/net/mesh-daemon";
import type { GossipPacket } from "@/lib/axiom/net/gossip";
import type { MeshLink } from "@/lib/axiom/net/datachannel";

describe("servis kayıt defteri", () => {
  it("bağımlılık sırası ve döngü", () => {
    expect(topoOrder([{ name: "b", deps: ["a"], start: () => {} }, { name: "a", start: () => {} }])).toEqual(["a", "b"]);
    expect(() =>
      topoOrder([
        { name: "a", deps: ["b"], start: () => {} },
        { name: "b", deps: ["a"], start: () => {} },
      ]),
    ).toThrow(/döngü/);
    expect(() => topoOrder([{ name: "a", deps: ["x"], start: () => {} }])).toThrow(/Eksik/);
  });

  it("artan bekleme tavanlı", () => {
    expect([0, 1, 2, 3, 4, 9].map(backoffMs)).toEqual([200, 400, 800, 1600, 3200, 3200]);
  });

  it("eşik aşılınca failed, elle yeniden başlatma sıfırlar", async () => {
    const jobs: Array<() => void> = [];
    let ok = false;
    const m = createServiceManager(
      [{ name: "x", start: () => { if (!ok) throw new Error("boom"); } }],
      { schedule: (fn) => { jobs.push(fn); return 0 as unknown as ReturnType<typeof setTimeout>; } },
    );
    await m.startAll();
    for (let i = 0; i < MAX_RESTARTS; i += 1) {
      await (jobs.shift() as () => Promise<void>)();
    }
    expect(m.list()[0]?.status).toBe("failed");
    ok = true;
    await m.restart("x");
    expect(m.list()[0]).toMatchObject({ status: "running", restarts: 0 });
  });

  it("kalp atışı yoksa servis kurtarmaya alınır", async () => {
    let alive = true;
    const m = createServiceManager([{ name: "h", start: () => {}, health: () => alive }], {
      schedule: () => 0 as unknown as ReturnType<typeof setTimeout>,
    });
    await m.startAll();
    alive = false;
    m.check();
    expect(m.list()[0]?.status).toBe("degraded");
  });

  it("bağımlılığı hazır olmayan servis başlamaz", async () => {
    const start = vi.fn();
    const m = createServiceManager(
      [
        { name: "a", start: () => { throw new Error("x"); } },
        { name: "b", deps: ["a"], start },
      ],
      { schedule: () => 0 as unknown as ReturnType<typeof setTimeout> },
    );
    await m.startAll();
    expect(start).not.toHaveBeenCalled();
  });

  it("liderlik: kilit bırakılınca sıradaki devralır", async () => {
    const queue: Array<() => Promise<void>> = [];
    let busy = false;
    const locks = {
      request: (_n: string, cb: () => Promise<void>) => {
        const run = async () => { busy = true; await cb(); busy = false; await queue.shift()?.(); };
        if (busy) queue.push(run); else void run();
        return Promise.resolve();
      },
    } as unknown as LockManager;
    const a = vi.fn();
    const b = vi.fn();
    const releaseA = acquireLeadership("l", a, locks);
    acquireLeadership("l", b, locks);
    expect(a).toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    releaseA();
    await new Promise((r) => setTimeout(r, 0));
    expect(b).toHaveBeenCalled();
  });
});

function pair(): [MeshLink, MeshLink] {
  const mk = (): MeshLink & { peer?: MeshLink; subs: Set<(p: GossipPacket) => void> } => {
    const subs = new Set<(p: GossipPacket) => void>();
    const link = {
      id: "t",
      subs,
      ready: () => true,
      send: (p: GossipPacket) => { (link.peer as unknown as { subs: Set<(p: GossipPacket) => void> }).subs.forEach((f) => f(p)); return true; },
      onPacket: (f: (p: GossipPacket) => void) => { subs.add(f); return () => void subs.delete(f); },
      close: () => subs.clear(),
    } as MeshLink & { peer?: MeshLink; subs: Set<(p: GossipPacket) => void> };
    return link;
  };
  const a = mk();
  const b = mk();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

describe("mesh eşitleme servisi", () => {
  it("paket karşı düğüme gossip ile ulaşır", () => {
    const [la, lb] = pair();
    const a = createMeshDaemon("a", la);
    const b = createMeshDaemon("b", lb);
    expect(a.publish("digest-1")).toBe(true);
    expect(b.stats().spread).toBe(1);
  });

  it("kapıda reddedilen iddia gönderilmez", () => {
    const [la, lb] = pair();
    const send = vi.spyOn(la, "send");
    const a = createMeshDaemon("a", la);
    createMeshDaemon("b", lb);
    expect(a.publish("d", "100 J = 100 W")).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(a.stats().rejectedOutbound).toBe(1);
  });

  it("bağlantı hazır değilse kuyruğa alınır ve sonra boşaltılır", () => {
    const [la, lb] = pair();
    let ready = false;
    la.ready = () => ready;
    const a = createMeshDaemon("a", la);
    const b = createMeshDaemon("b", lb);
    a.publish("q");
    expect(a.stats().pending).toBe(1);
    ready = true;
    expect(a.flush()).toBe(1);
    expect(a.stats().pending).toBe(0);
    expect(b.stats().spread).toBe(1);
  });
});
