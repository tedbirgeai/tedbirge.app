import { describe, expect, it, vi } from "vitest";

import { serviceEventsToLogs, serviceLevel } from "@/shell/services/log-map";
import { announceGossipLink, createLinkHub, onGossipLink, type MeshLink } from "@/lib/axiom/net/datachannel";
import { createMeshDaemon } from "@/lib/axiom/net/mesh-daemon";
import type { GossipPacket } from "@/lib/axiom/net/gossip";

function fakeLink(id: string) {
  const subs = new Set<(p: GossipPacket) => void>();
  const closers = new Set<() => void>();
  const sent: GossipPacket[] = [];
  const link: MeshLink = {
    id,
    ready: () => true,
    send: (p) => {
      sent.push(p);
      return true;
    },
    onPacket: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    onClose: (fn) => {
      closers.add(fn);
      return () => closers.delete(fn);
    },
    close: () => subs.clear(),
  };
  return { link, sent, emit: (p: GossipPacket) => subs.forEach((f) => f(p)), closeRemote: () => closers.forEach((f) => f()) };
}

describe("servis olayları → kayıtlar", () => {
  it("seviye eşlemesi ve sıra", () => {
    expect(serviceLevel("failed")).toBe("hata");
    expect(serviceLevel("degraded")).toBe("uyari");
    expect(serviceLevel("running")).toBe("bilgi");
    const rows = serviceEventsToLogs([
      { at: 1, name: "a", status: "starting" },
      { at: 2, name: "a", status: "failed", detail: "boom" },
    ]);
    expect(rows[0]).toMatchObject({ level: "hata", source: "servis", message: "a: arızalı — boom" });
    expect(rows).toHaveLength(2);
  });
});

describe("bağlantı merkezi", () => {
  it("tüm hazır bağlantılara yayar, alımı birleştirir, kapanan çıkar", () => {
    const hub = createLinkHub();
    const a = fakeLink("a");
    const b = fakeLink("b");
    hub.add(a.link);
    hub.add(b.link);
    const got = vi.fn();
    hub.onPacket(got);
    const pkt = { id: "x", origin: "o", ttl: 2, at: 0, clock: {}, digest: "d" };
    expect(hub.send(pkt)).toBe(true);
    expect(a.sent).toHaveLength(1);
    expect(b.sent).toHaveLength(1);
    b.emit(pkt);
    expect(got).toHaveBeenCalledOnce();
    b.closeRemote();
    expect(hub.size()).toBe(1);
  });

  it("duyurulan eş kanalı merkeze eklenir; reddedilen iddia ona gitmez", () => {
    const hub = createLinkHub();
    const off = onGossipLink((l) => hub.add(l));
    const rtc = fakeLink("rtc:peer");
    announceGossipLink(rtc.link);
    off();
    const d = createMeshDaemon("me", hub);
    expect(d.publish("ok")).toBe(true);
    expect(rtc.sent).toHaveLength(1);
    expect(d.publish("bad", "100 J = 100 W")).toBe(false);
    expect(rtc.sent).toHaveLength(1);
  });
});
