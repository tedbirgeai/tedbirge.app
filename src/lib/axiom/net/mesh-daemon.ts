/**
 * MESH EŞİTLEME SERVİSİ
 * ------------------------------------------------------------------
 * Bağlantı → gossip → vektör saat → CRDT kuyruğu zinciri. Giden her
 * yük önce packet-gate kapısından geçer; reddedilen iddia gönderilmez.
 * Bağlantı hazır değilse delta kuyrukta bekler ve hazır olunca boşaltılır.
 */

import { gatePacketClaim } from "@/lib/axiom/net/packet-gate";
import { createGossip, createPacket, receivePacket, type GossipState } from "@/lib/axiom/net/gossip";
import type { MeshLink } from "@/lib/axiom/net/datachannel";
import { tick } from "@/lib/axiom/sync/vector-clock";
import { createState, put, type CrdtState } from "@/lib/axiom/sync/crdt";
import { createQueue, enqueue, type QueueState } from "@/lib/axiom/sync/queue";

export type MeshDaemonStats = {
  spread: number;
  duplicates: number;
  dropped: number;
  rejectedOutbound: number;
  sent: number;
  pending: number;
};

export function createMeshDaemon(node: string, link: MeshLink) {
  let gossip: GossipState = createGossip(node);
  let crdt: CrdtState = createState(node);
  let queue: QueueState = createQueue();
  let rejectedOutbound = 0;
  let sent = 0;

  const send = (digest: string, claim?: string) => {
    const packet = createPacket(gossip, digest, claim);
    if (link.ready() && link.send(packet)) {
      sent += 1;
      return true;
    }
    return false;
  };

  const off = link.onPacket((packet) => {
    if (packet.origin === node) return;
    const out = receivePacket(gossip, packet);
    gossip = out.state;
    if (out.applied) crdt = put(crdt, packet.id, { digest: packet.digest, origin: packet.origin });
    if (out.forward && link.ready()) link.send(out.forward);
  });

  return {
    /** Yerel yayın. Kapıdan geçmeyen iddia hiç gönderilmez. */
    publish(digest: string, claim?: string): boolean {
      const gate = gatePacketClaim(claim);
      if (!gate.accepted) {
        rejectedOutbound += 1;
        return false;
      }
      gossip = { ...gossip, clock: tick(gossip.clock, node) };
      crdt = put(crdt, `${node}:${digest}`, { digest, origin: node, ...(claim ? { claim } : {}) });
      if (send(digest, claim)) return true;
      const entry = crdt.entries[`${node}:${digest}`];
      if (entry) queue = enqueue(queue, { node, entries: [entry] });
      return true;
    },
    /** Bekleyen deltaları bağlantı hazırsa gönderir. */
    flush(): number {
      if (!link.ready()) return 0;
      let n = 0;
      const rest = queue.pending.filter((item) => {
        const ok = item.delta.entries.every((e) =>
          send(String(e.fields["digest"] ?? ""), typeof e.fields["claim"] === "string" ? e.fields["claim"] : undefined),
        );
        if (ok) n += 1;
        return !ok;
      });
      queue = { ...queue, pending: rest, sent: queue.sent + n, lastFlush: Date.now() };
      return n;
    },
    stats(): MeshDaemonStats {
      return {
        spread: gossip.spread,
        duplicates: gossip.duplicates,
        dropped: gossip.dropped,
        rejectedOutbound,
        sent,
        pending: queue.pending.length,
      };
    },
    alive: () => true,
    stop() {
      off();
      link.close();
    },
  };
}

export type MeshDaemon = ReturnType<typeof createMeshDaemon>;
