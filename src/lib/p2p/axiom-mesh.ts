/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { AxiomOfflineRecord } from "@/lib/p2p/axiom-offline-queue";

export type AxiomMeshState = {
  active: boolean;
  peers: number;
  delivered: number;
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

  channel?.postMessage({ type: "hello" });
  channel?.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === "hello") peers = Math.max(peers, 2);
    if (event.data?.type === "proof") delivered += 1;
  });

  return {
    state: () => ({ active: channel !== null, peers, delivered }),
    async publish(record) {
      if (!channel) return false;
      channel.postMessage({ type: "proof", record });
      delivered += 1;
      return true;
    },
    close() {
      channel?.close();
    },
  };
}
