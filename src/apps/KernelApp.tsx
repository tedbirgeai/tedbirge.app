/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL WEBOS APPLICATION ENTRYPOINT
 * ------------------------------------------------------------------
 * Tedbirge WebOS masaüstü ortamında bağımsız çalışan Kernel Yönetici
 * ve Telemetri Uygulaması (App Lifecycle Mount Point).
 */

import React, { useState } from "react";
import { KernelShellPanel } from "../shell/KernelShellPanel";
import { checkKernelCapabilities } from "../kernel";

export interface KernelAppProps {
  appId?: string;
  onClose?: () => void;
}

export const KernelApp: React.FC<KernelAppProps> = ({
  appId = "axiom.kernel.monitor",
  onClose,
}) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>("axiom-node-main");

  // Çalışma zamanı donanım ve mikro-çekirdek yetenek kontrolleri
  const capabilities = checkKernelCapabilities();

  const handleMinimize = () => {
    // Shell Window Manager minimize kancası
    console.log(`[WebOS Shell] Uygulama simge durumuna küçültüldü: ${appId}`);
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col justify-center items-center font-sans antialiased">
      <div className="w-full max-w-5xl">
        {/* Üst Uygulama Bilgi & Durum Çubuğu */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span className="text-slate-300 font-semibold">WebOS Process ID:</span>
              <span className="text-sky-400 font-bold">{appId}</span>
            </div>

            {/* Çalışma Zamanı Rozetleri */}
            <span
              className={`hidden sm:inline-block px-2 py-0.5 text-[10px] rounded border ${
                capabilities.hasWorkerSupport
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/60 border-rose-800 text-rose-300"
              }`}
            >
              Worker: {capabilities.hasWorkerSupport ? "Aktif" : "Pasif"}
            </span>
          </div>

          {/* Aktif Düğüm / Node Seçici */}
          <div className="flex items-center gap-3">
            <label htmlFor="node-select" className="text-slate-500">
              Aktif Düğüm:
            </label>
            <select
              id="node-select"
              value={currentNodeId}
              onChange={(e) => setCurrentNodeId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 font-mono focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="axiom-node-main">axiom-node-main (L1)</option>
              <option value="axiom-node-peer-1">axiom-node-peer-1 (L2)</option>
              <option value="axiom-node-peer-2">axiom-node-peer-2 (L2)</option>
            </select>
          </div>
        </div>

        {/* Kernel Shell Panel Entegrasyonu */}
        <KernelShellPanel
          key={currentNodeId}
          windowId={`win-${appId}`}
          initialNodeId={currentNodeId}
          onClose={onClose}
          onMinimize={handleMinimize}
        />
      </div>
    </div>
  );
};

export default KernelApp;
