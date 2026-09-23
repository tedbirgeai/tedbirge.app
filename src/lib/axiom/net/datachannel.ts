/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * P2P VERİ KANALLARI (WebRTC DataChannel)
 * ------------------------------------------------------------------
 * AXIOM ikinci bir WebRTC yığını kurmaz: Tedbirge WebOS'un hâlihazırda
 * kurduğu eş bağlantısı üzerinde ayrı, etiketli bir veri kanalı açar.
 * Böylece sohbet ve arama trafiği etkilenmez, yayılım paketleri kendi
 * sırasında akar.
 *
 * Aynı cihazın sekmeleri arasında (eş bağlantısı yokken) gerçek bir
 * yerel kanal kullanılır; böylece geliştirme ve çevrimdışı kullanım da
 * gerçek taşımayla çalışır. Hiçbir durumda genel internete paket
 * taşınmaz (çıkış kilidi).
 */

import type { GossipPacket } from "@/lib/axiom/net/gossip";

/** Kanal etiketi — eş tarafta aynı etiketle eşleşir. */
export const GOSSIP_LABEL = "axiom-gossip";

/** Bant genişliği koruması: tek paket üst sınırı (16 KB). */
export const MAX_PACKET_BYTES = 16 * 1024;

export type MeshLink = {
  id: string;
  /** Kanal şu an yazmaya hazır mı? */
  ready: () => boolean;
  send: (packet: GossipPacket) => boolean;
  onPacket: (fn: (packet: GossipPacket) => void) => () => void;
  close: () => void;
};

function encode(packet: GossipPacket): string | null {
  const wire = JSON.stringify(packet);
  if (wire.length > MAX_PACKET_BYTES) return null;
  return wire;
}

function decode(raw: unknown): GossipPacket | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as Partial<GossipPacket>;
    if (
      typeof value?.id !== "string" ||
      typeof value.origin !== "string" ||
      typeof value.ttl !== "number" ||
      typeof value.digest !== "string" ||
      typeof value.clock !== "object" ||
      value.clock === null
    ) {
      return null;
    }
    return {
      id: value.id,
      origin: value.origin,
      ttl: value.ttl,
      at: typeof value.at === "number" ? value.at : Date.now(),
      clock: value.clock as GossipPacket["clock"],
      digest: value.digest,
      ...(typeof value.claim === "string" ? { claim: value.claim } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Var olan eş bağlantısı üzerinde yayılım kanalı açar. Kanal sıralı ve
 * yeniden gönderim bütçeli kurulur: canlı yayılımda gecikme, kaybolan
 * paketten daha maliyetlidir.
 */
export function openGossipChannel(pc: RTCPeerConnection, id = GOSSIP_LABEL): MeshLink {
  const channel = pc.createDataChannel(GOSSIP_LABEL, {
    ordered: true,
    maxRetransmits: 3,
  });
  const subs = new Set<(packet: GossipPacket) => void>();

  channel.addEventListener("message", (event: MessageEvent) => {
    const packet = decode(event.data);
    if (!packet) return;
    subs.forEach((fn) => {
      try {
        fn(packet);
      } catch {
        /* tek dinleyici hatası kanalı kapatmaz */
      }
    });
  });

  return {
    id,
    ready: () => channel.readyState === "open",
    send(packet) {
      if (channel.readyState !== "open") return false;
      const wire = encode(packet);
      if (!wire) return false;
      try {
        channel.send(wire);
        return true;
      } catch {
        return false;
      }
    },
    onPacket(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    close() {
      subs.clear();
      try {
        channel.close();
      } catch {
        /* kapanmış kanal */
      }
    },
  };
}

/** Aynı cihazın sekmeleri arasındaki gerçek yerel kanal. */
export function openLocalLink(name = "tedbirge-axiom-gossip"): MeshLink {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(name) : null;
  const subs = new Set<(packet: GossipPacket) => void>();

  channel?.addEventListener("message", (event: MessageEvent<string>) => {
    const packet = decode(event.data);
    if (!packet) return;
    subs.forEach((fn) => {
      try {
        fn(packet);
      } catch {
        /* yut */
      }
    });
  });

  return {
    id: "local",
    ready: () => channel !== null,
    send(packet) {
      if (!channel) return false;
      const wire = encode(packet);
      if (!wire) return false;
      channel.postMessage(wire);
      return true;
    },
    onPacket(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    close() {
      subs.clear();
      channel?.close();
    },
  };
}
