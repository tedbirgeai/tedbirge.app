/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL MONITOR COMPONENT
 * ------------------------------------------------------------------
 * Çekirdek metriklerini, WebRTC mesh ağ durumunu ve sistem kaynak
 * kullanımını görselleştiren, IPC komutları gönderen arayüz paneli.
 */

import React from "react";
import { useKernelEngine } from "../hooks/useKernelEngine";

export interface KernelMonitorProps {
  nodeId?: string;
  className?: string;
}

export const KernelMonitor: React.FC<KernelMonitorProps> = ({
  nodeId = "axiom-node-main",
  className = "",
}) => {
  const {
    telemetry,
    isWorkerReady,
    error,
    sendCommand,
    restartWorker,
    pauseWorker,
    resumeWorker,
  } = useKernelEngine({ nodeId });

  return (
    <div
      className={`flex flex-col h-full bg-slate-950 text-slate-100 font-mono p-4 rounded-xl border border-slate-800 shadow-2xl overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isWorkerReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
            AXIOM™ Kernel Monitor
          </h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          ID: {nodeId}
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button
            onClick={restartWorker}
            className="px-2 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs transition"
          >
            Yeniden Başlat
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-slate-400">FPS / Frame Rate</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">
            {telemetry.fps}{" "}
            <span className="text-xs text-slate-500 font-normal">Hz</span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-slate-400">Çekirdek Yükü</span>
          <span className="text-2xl font-bold text-cyan-400 mt-1">
            %{telemetry.cpuLoadPercent}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-slate-400">Bellek Kullanımı</span>
          <span className="text-2xl font-bold text-indigo-400 mt-1">
            {telemetry.memoryUsageMb}{" "}
            <span className="text-xs text-slate-500 font-normal">MB</span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <span className="text-xs text-slate-400">P2P Peer Sayısı</span>
          <span className="text-2xl font-bold text-amber-400 mt-1">
            {telemetry.activePeersCount}{" "}
            <span className="text-xs text-slate-500 font-normal">Düğüm</span>
          </span>
        </div>
      </div>

      {/* Controls & Commands */}
      <div className="mt-auto pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          {telemetry.workerStatus === "running" ? (
            <button
              onClick={pauseWorker}
              className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/80 text-amber-200 border border-amber-700/50 rounded-lg text-xs transition"
            >
              Duraklat
            </button>
          ) : (
            <button
              onClick={resumeWorker}
              className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50 rounded-lg text-xs transition"
            >
              Devam Et
            </button>
          )}

          <button
            onClick={restartWorker}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs transition"
          >
            Thread Sıfırla
          </button>
        </div>

        <button
          onClick={() => sendCommand("PING", { timestamp: Date.now() })}
          className="px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/50 rounded-lg text-xs transition"
        >
          IPC Ping Gönder
        </button>
      </div>
    </div>
  );
};

export default KernelMonitor;
