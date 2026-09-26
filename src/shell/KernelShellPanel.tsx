/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL SHELL PANEL COMPONENT
 * ------------------------------------------------------------------
 * KernelMonitor bileşenini WebOS masaüstü pencere yöneticisi (Shell Window Manager)
 * ile sarmalar. Pencere kontrolleri, IPC kanal durumu ve sistem durum göstergelerini sunar.
 */

import React, { useState } from "react";
import { KernelMonitor } from "../kernel/KernelMonitor";

export interface KernelShellPanelProps {
  windowId?: string;
  initialNodeId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}

export const KernelShellPanel: React.FC<KernelShellPanelProps> = ({
  windowId = "win-kernel-01",
  initialNodeId = "axiom-node-main",
  onClose,
  onMinimize,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"telemetry" | "logs" | "nodes">("telemetry");

  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <div
      id={windowId}
      className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-2 z-50 rounded-lg" : "w-full max-w-4xl mx-auto my-4"
      }`}
    >
      {/* WebOS Window Header / Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 select-none backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Pencere Kontrol Butonları */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              title="Kapat"
              className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center text-[8px] text-rose-950 opacity-80 hover:opacity-100 focus:outline-none"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={onMinimize}
              title="Küçült"
              className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center text-[8px] text-amber-950 opacity-80 hover:opacity-100 focus:outline-none"
            >
              −
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              title={isMaximized ? "Pencere Boyutu" : "Tam Ekran"}
              className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-[8px] text-emerald-950 opacity-80 hover:opacity-100 focus:outline-none"
            >
              {isMaximized ? "❐" : "⤢"}
            </button>
          </div>

          <span className="h-4 w-px bg-slate-800" />

          {/* Sistem Başlığı & Sekme Navigasyonu */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
              AXIOM™ KERNEL CONTROL
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
              v2026.9
            </span>
          </div>
        </div>

        {/* Sekme Değiştirici */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "telemetry"
                ? "bg-slate-800 text-slate-100 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Telemetri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("nodes")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "nodes"
                ? "bg-slate-800 text-slate-100 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mesh Düğümleri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "logs"
                ? "bg-slate-800 text-slate-100 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sistem Günlüğü
          </button>
        </div>
      </div>

      {/* Pencere Gövde Alanı */}
      <div className="p-4 bg-slate-950/95 overflow-y-auto max-h-[calc(100vh-120px)]">
        {activeTab === "telemetry" && (
          <KernelMonitor nodeId={initialNodeId} isLeader={true} targetFps={120} />
        )}

        {activeTab === "nodes" && (
          <div className="p-6 text-center font-mono text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-200 font-semibold mb-1">WebRTC P2P Mesh Ağ Durumu</p>
            <p className="text-slate-500">Etkin bağlantılar ve düğüm rotaları Kernel Worker üzerinde senkronize ediliyor.</p>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="p-4 font-mono text-[11px] text-emerald-400/90 bg-slate-900 border border-slate-800 rounded-xl h-64 overflow-y-auto flex flex-col gap-1">
            <div>[00:00:00.000] [AXIOM-KERNEL] Kernel Worker ilklendirildi (120 FPS döngüsü).</div>
            <div>[00:00:00.016] [OFFSCREEN-CANVAS] WebGL2 Context başarıyla bağlandı.</div>
            <div>[00:00:00.032] [ZKP-VERIFIER] ZKP State Engine hazır durumda.</div>
            <div>[00:00:00.048] [IPC-BRIDGE] Shell - Kernel mesaj kanalı aktif.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KernelShellPanel;
