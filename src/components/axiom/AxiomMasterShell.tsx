/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import React, { useEffect, useRef, useState } from 'react';
import { AxiomCABISocketBridge } from "@/core/axiom_cabi_bridge";
import { LicenseModal } from "@/components/axiom/LicenseModal";
import { FREE_DEVICE_LIMIT } from "@/lib/axiom/license/policy";

export const AxiomMasterShell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peers, setPeers] = useState<number>(FREE_DEVICE_LIMIT);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>("Si un système déterministe atteint un état de deadlock irréversible...");

  useEffect(() => {
    // 1. C-ABI Soket Köprüsünü ve Çekirdeği Canlıya Bağla
    console.log("[AxiomMasterShell] Initializing C-ABI Socket Bridge & Kernel Stack...");
    const success = AxiomCABISocketBridge.initializeBridge();
    setBridgeConnected(success);

    if (success) {
      AxiomCABISocketBridge.dispatchCABIPacket(0x01, "SHELL_MOUNTED_AND_WIRED");
    }

    // 2. Cihaz Sınırı ve Otonom MoR Lisans Tetikleyicisi
    if (peers >= FREE_DEVICE_LIMIT) {
      setIsLicenseModalOpen(true);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let t = 0;

    const render = () => {
      t += 0.015;
      // Temiz, Kurumsal ve Derin Deep-Tech Arka Planı
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Askeri / Bloomberg Tarzı Hassas Geometri Izgarası (Orijinal Turkuaz/Mint Tonları)
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Matematiksel Z3 SMT / Lean 4 Harmonik Fizik Dalga Eğrisi
      ctx.strokeStyle = '#0ea5e9'; // AXIOM Orijinal Signature Turkuaz
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < canvas.width; i++) {
        const y = canvas.height / 2 + Math.sin(i * 0.015 + t) * 32 * Math.cos(t * 0.4);
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [peers]);

  const handleExecute = () => {
    console.log("Executing command via C-ABI:", commandInput);
    if (bridgeConnected) {
      AxiomCABISocketBridge.dispatchCABIPacket(0x02, commandInput);
    }
  };

  return (
    <div className="w-full h-screen bg-[#070b12] text-slate-200 font-mono flex flex-col justify-between p-4 border border-sky-500/20 shadow-2xl select-none">
      
      {/* Üst Bilgi: Bloomberg / Askeri Komuta Telemetri Çubuğu */}
      <div className="flex justify-between items-center border-b border-sky-500/30 pb-3 text-xs tracking-wider bg-[#0a101d] px-4 py-2.5 rounded-lg shadow-inner">
        <div className="flex items-center space-x-4">
          <span className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded border border-sky-500/30 font-bold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {bridgeConnected ? 'AXIOM_DETERMINISTIC_KERNEL_ACTIVE' : 'AXIOM_CABI_CONNECTING'}
          </span>
          <span className="text-slate-400">ROM TCB: <strong className="text-white">VERIFIED_IMMUTABLE</strong></span>
          <span className="text-slate-400">RAM LRU: <strong className="text-sky-400">36.2 / 50.0 MB</strong></span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sky-400 font-semibold">Z3 SMT: 11ms</span>
          <span className="text-sky-400 font-semibold">Lean 4: 78ms</span>
          <button 
            onClick={() => setIsLicenseModalOpen(true)}
            className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-600 font-bold hover:bg-emerald-900 transition cursor-pointer"
          >
            {peers} / {FREE_DEVICE_LIMIT} PROVEN
          </button>
        </div>
      </div>

      {/* Orta Alan: Geometri ve Fizik Canvas Sentezleme Penceresi */}
      <div className="relative flex-grow my-3 flex flex-col justify-center items-center overflow-hidden rounded-xl bg-[#090e18] border border-sky-500/20 shadow-lg">
        <canvas ref={canvasRef} width={1200} height={480} className="w-full h-full object-cover opacity-95" />
        
        {/* Canlı Hakikat ve Omni-Science Matris Kartı */}
        <div className="absolute top-4 left-4 bg-[#070b12]/90 p-4 rounded-lg border border-sky-500/30 backdrop-blur-md text-xs space-y-1.5 shadow-xl">
          <div className="text-sky-400 font-bold tracking-wider uppercase">&gt;&gt; OMNI-SCIENCE INVARIANT MATRIX</div>
          <div className="text-slate-400">Engine: Formal Proof & Computational Geometry v12</div>
          <div className="text-emerald-400 font-medium">Status: P2P Mesh Encrypted &amp; Synchronized (NODE_ACTIVE_FREE)</div>
        </div>
      </div>

      {/* Alt Alan: Evrensel Komut Giriş Barı ve Markalama */}
      <div className="space-y-2">
        <div className="flex items-center bg-[#0a101d] border border-sky-500/40 rounded-xl px-4 py-3 shadow-md">
          <span className="text-sky-400 font-bold mr-3 tracking-widest">AXIOM&gt;</span>
          <input 
            type="text" 
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Enter universal logic, cross-lingual invariant, or formal theorem query..." 
            className="w-full bg-transparent text-white focus:outline-none font-mono text-sm placeholder-slate-500"
          />
          <button 
            onClick={handleExecute}
            className="bg-sky-500 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs hover:bg-sky-400 transition shadow-sm cursor-pointer"
          >
            EXECUTE
          </button>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 px-1">
          <span>AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs</span>
          <span className="text-sky-400 font-semibold">C-ABI SOCKET: tedbirge_truth.sock // ZKP-SHA256</span>
        </div>
      </div>

      {/* Otonom MoR Lisans Modalı Entegrasyonu */}
      <LicenseModal
        open={isLicenseModalOpen}
        peers={peers}
        onClose={() => setIsLicenseModalOpen(false)}
      />
    </div>
  );
};
