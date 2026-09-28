/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

/**
 * AXIOM MESH — BroadcastChannel taşımasının değişmez kapısı ile sarılmış hali.
 * Her giden paket, ağ seviyesi kapıdan (`gatePacketClaim`) geçer; reddedilen
 * paketler sessizce imha edilir ve `state().rejected` sayacına yazılır.
 * Gövde asla loglanmaz — yalnız sayaç ve kısa gerekçe kodu tutulur.
 */

import { gatePacketClaim, type GateDecision } from "@/lib/axiom/net/packet-gate";
import type { AxiomOfflineRecord } from "@/lib/p2p/axiom-offline-queue";

export type AxiomMeshState = {
  active: boolean;
  peers: number;
  delivered: number;
  rejected: number;
  lastRejectCode: GateDecision["code"] | null;
};

export type AxiomMesh = {
  state(): AxiomMeshState;
  publish(record: AxiomOfflineRecord): Promise<boolean>;
  close(): void;
};

export function createAxiomMesh(channelName = "tedbirge-axiom-proof-mesh"): AxiomMesh {
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
  let delivered = 0;
  let peers = channel ? 1 : 0;
  let rejected = 0;
  let lastRejectCode: GateDecision["code"] | null = null;

  channel?.postMessage({ type: "hello" });
  channel?.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === "hello") peers = Math.max(peers, 2);
    if (event.data?.type === "proof") delivered += 1;
  });

  return {
    state: () => ({
      active: channel !== null,
      peers,
      delivered,
      rejected,
      lastRejectCode,
    }),
    async publish(record) {
      if (!channel) return false;
      // Kanıt kaydının CID + verdict + seal alanları paket iddiası olarak
      // kapıdan geçer. Gövde metni yoktur; sadece sözleşme başlığı denetlenir.
      const claim = `verdict=${record.verdict} engine=${record.engine} cid=${record.cid}`;
      const decision = gatePacketClaim(claim);
      if (!decision.accepted) {
        rejected += 1;
        lastRejectCode = decision.code;
        return false;
      }
      channel.postMessage({ type: "proof", record });
      delivered += 1;
      return true;
    },
    close() {
      channel?.close();
    },
  };
}
