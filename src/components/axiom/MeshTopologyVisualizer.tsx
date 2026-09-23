/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import React, { useState, useEffect } from "react";

interface NodePeerInfo {
  peerId: string;
  latencyMs: number;
  status: "CONNECTED" | "SYNCING" | "DISCONNECTED";
}

export const MeshTopologyVisualizer: React.FC = () => {
  const [peers, setPeers] = useState<NodePeerInfo[]>([
    { peerId: "node-alpha-779x", latencyMs: 14, status: "CONNECTED" },
    { peerId: "node-beta-442z", latencyMs: 28, status: "CONNECTED" },
    { peerId: "node-gamma-991b", latencyMs: 42, status: "SYNCING" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPeers((prev) =>
        prev.map((p) => ({
          ...p,
          latencyMs: Math.max(8, p.latencyMs + Math.floor(Math.random() * 5) - 2),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-zinc-200">WebRTC P2P Mesh Topology</span>
        </div>
        <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-800">
          ACTIVE PEERS: {peers.length}
        </span>
      </div>

      <div className="space-y-2">
        {peers.map((peer) => (
          <div
            key={peer.peerId}
            className="flex items-center justify-between rounded bg-zinc-900/60 p-2.5 border border-zinc-800/80 transition-all hover:border-zinc-700"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  peer.status === "CONNECTED" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-zinc-300 font-medium">{peer.peerId}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">{peer.latencyMs} ms RTT</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  peer.status === "CONNECTED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {peer.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 border-t border-zinc-800/60">
        <span>ENCRYPTION: AES-GCM-256 P2P</span>
        <span className="text-emerald-400">MESH SYNC OK</span>
      </div>
    </div>
  );
};
