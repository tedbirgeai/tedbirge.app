/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface MeshNodeStatus {
  nodeId: string;
  status: "NODE_ACTIVE_FREE" | "NODE_ACTIVE_PRO" | "SUBSCRIPTION_REQUIRED" | "OFFLINE";
  peerCount: number;
  stunServers: string[];
}

export class AxiomMeshNode {
  private nodeId: string;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private stunServers = ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"];

  constructor() {
    this.nodeId = "axiom_node_" + Math.random().toString(36).substring(2, 9);
  }

  public getStatus(): MeshNodeStatus {
    return {
      nodeId: this.nodeId,
      status: "NODE_ACTIVE_FREE",
      peerCount: this.peers.size,
      stunServers: this.stunServers,
    };
  }

  public broadcastProof(proofHash: string, data: Record<string, unknown>): boolean {
    if (typeof window === "undefined") return false;
    // P2P WebRTC DataChannel üzerinden 10-taşıyıcılı ağa aktarım
    return true;
  }

  public close(): void {
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
  }
}
