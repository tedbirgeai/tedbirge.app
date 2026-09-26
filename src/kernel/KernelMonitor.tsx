/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL TELEMETRY & WEBGL MONITOR COMPONENT
 * ------------------------------------------------------------------
 * useKernelWorker hook'unu tüketir, Offscreen Canvas bağlantısını kurar,
 * 120 FPS canlı işleme verilerini, kare sürelerini ve ZKP durum geçişlerini
 * WebOS arayüzünde görselleştirir.
 */

import React, { useEffect, useRef, useState } from "react";
import { useKernelWorker } from "../hooks/useKernelWorker";

export interface KernelMonitorProps {
  nodeId?: string;
  isLeader?: boolean;
  targetFps?: number;
  className?: string;
}

export const KernelMonitor: React.FC<KernelMonitorProps> = ({
  nodeId = "axiom-node-alpha",
  isLeader = true,
  targetFps = 120,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [proofInput, setProofInput] = useState<string>("");

  const {
    isReady,
    error,
    telemetry,
    lastZkpResult,
    setFps,
    attachCanvas,
    dispatchZkpProof,
    restartWorker,
  } = useKernelWorker({
    nodeId,
    isLeader,
    targetFps,
    autoStart: true,
  });

  // HTML Canvas'ı OffscreenCanvas olarak Worker'a devret
  useEffect(() => {
    if (isReady && canvasRef.current) {
      attachCanvas(canvasRef.current);
    }
  }, [isReady, attachCanvas]);

  const handleFpsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fpsValue = Number(e.target.value);
    setFps(fpsValue);
  };

  const handleZkpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hash = proofInput.trim() || `0x${Math.random().toString(16).substring(2, 10)}`;
    const proofId = `proof-${Date.now()}`;
    dispatchZkpProof(proofId, hash);
    setProofInput("");
  };

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-100 font-sans shadow-2xl backdrop-blur-md ${className}`}>
      {/* Üst Başlık & Durum Çubuğu */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <h3 className="font-mono text-sm tracking-wide font-semibold text-slate-200">
            AXIOM KERNEL MONITOR ({nodeId})
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
            {isLeader ? "LEADER NODE" : "PEER NODE"}
          </span>
          <span className={`px-2 py-0.5 rounded ${isReady ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
            {isReady ? "ONLINE" : "INITIALIZING"}
          </span>
        </div>
      </div>

      {/* Hata Mesajı Göstergesi */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={restartWorker}
            className="px-2 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-[10px] transition-colors"
          >
            Yeniden Başlat
          </button>
        </div>
      )}

      {/* Offscreen Canvas & Metrikler Yan Yana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Canvas Render Alanı */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex flex-col justify-between min-h-[180px]">
          <canvas
            ref={canvasRef}
            width={400}
            height={180}
            className="w-full h-full object-cover block"
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-slate-950/80 rounded text-[10px] font-mono text-slate-400 border border-slate-800">
            WebGL Offscreen Viewport
          </div>
        </div>

        {/* Telemetri İstatistikleri */}
        <div className="flex flex-col justify-between gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">HEDEF FPS</span>
              <span className="text-lg font-bold text-sky-400">{telemetry.fps} FPS</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">KARE SÜRESİ</span>
              <span className="text-lg font-bold text-emerald-400">{telemetry.frameTimeMs} ms</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 col-span-2">
              <span className="text-slate-500 block text-[10px]">TOPLAM TICK SAYISI</span>
              <span className="text-base font-bold text-indigo-300">{telemetry.tickCount.toLocaleString()}</span>
            </div>
          </div>

          {/* FPS Kontrolü */}
          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <label htmlFor="fps-select" className="text-slate-400">Hedef Yenileme Hızı:</label>
            <select
              id="fps-select"
              defaultValue={targetFps}
              onChange={handleFpsChange}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
              <option value={120}>120 FPS</option>
            </select>
          </div>
        </div>
      </div>

      {/* ZKP Kanıt Tetikleyici & Sonuç Paneli */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <form onSubmit={handleZkpSubmit} className="flex gap-2">
          <input
            type="text"
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            placeholder="0x... ZKP State Hash Girin"
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded focus:outline-none focus:border-sky-500 font-mono"
          />
          <button
            type="submit"
            disabled={!isReady}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-semibold rounded transition-colors"
          >
            Kanıtı Doğrula
          </button>
        </form>

        {lastZkpResult && (
          <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
            <span>ID: {lastZkpResult.proofId}</span>
            <span className={lastZkpResult.valid ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {lastZkpResult.valid ? "VALID PROOF ✓" : "INVALID PROOF ✗"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KernelMonitor;
