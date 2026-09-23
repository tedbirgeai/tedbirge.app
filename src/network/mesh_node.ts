/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface MeshNodeConfig {
  nodeId: string;
  signalingServerUrl: string;
  iceServers: RTCIceServer[];
}

export type MeshMessage = {
  type: "STATE_SYNC" | "PROOF_BROADCAST" | "HEARTBEAT";
  senderId: string;
  payload: unknown;
  timestamp: number;
};

export class P2PMeshNode {
  private nodeId: string;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private iceServers: RTCIceServer[];
  private onMessageCallback?: (msg: MeshMessage) => void;

  constructor(config: MeshNodeConfig) {
    this.nodeId = config.nodeId;
    this.iceServers = config.iceServers;
  }

  public setOnMessage(callback: (msg: MeshMessage) => void) {
    this.onMessageCallback = callback;
  }

  public createPeerConnection(targetPeerId: string, isInitiator: boolean): RTCPeerConnection {
    if (this.peers.has(targetPeerId)) {
      return this.peers.get(targetPeerId)!;
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(targetPeerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Signaling üzerinden aday iletimi
        console.debug(`[MeshNode] ICE Candidate generated for ${targetPeerId}`);
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel("tedbirge-mesh-sync", { ordered: true });
      this.setupDataChannel(targetPeerId, dc);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(targetPeerId, event.channel);
      };
    }

    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      console.info(`[MeshNode] P2P Tunnel established with peer: ${peerId}`);
      this.broadcast({
        type: "HEARTBEAT",
        senderId: this.nodeId,
        payload: { status: "ONLINE" },
        timestamp: Date.now(),
      });
    };

    dc.onmessage = (event) => {
      try {
        const message: MeshMessage = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (err) {
        console.error("[MeshNode] Failed to parse incoming mesh message:", err);
      }
    };

    dc.onclose = () => {
      console.warn(`[MeshNode] P2P Tunnel closed with peer: ${peerId}`);
      this.dataChannels.delete(peerId);
      this.peers.delete(peerId);
    };
  }

  public broadcast(message: MeshMessage) {
    const serialized = JSON.stringify(message);
    for (const [peerId, dc] of this.dataChannels.entries()) {
      if (dc.readyState === "open") {
        dc.send(serialized);
      }
    }
  }

  public disconnectAll() {
    for (const dc of this.dataChannels.values()) {
      dc.close();
    }
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.dataChannels.clear();
    this.peers.clear();
  }
}
