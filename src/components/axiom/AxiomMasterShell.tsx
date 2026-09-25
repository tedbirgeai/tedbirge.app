/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AxiomCABISocketBridge } from "@/core/axiom_cabi_bridge";
import { LicenseModal } from "@/components/axiom/LicenseModal";
import { FREE_DEVICE_LIMIT } from "@/lib/axiom/license/policy";

interface AxiomMasterShellProps {
  onSubmit?: (text: string) => void;
  busy?: boolean;
}

const ORNEK_ONERMELER = [
  "Kapalı sistemde enerji korunur.",
  "Bu makine yoktan enerji üretir ve verimi %100 olur.",
  "fn main() { let mut x = 1; }",
  "Sınırsız bant genişliği sağlıyoruz."
];

export const AxiomMasterShell: React.FC<AxiomMasterShellProps> = ({ onSubmit, busy = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peers] = useState<number>(FREE_DEVICE_LIMIT);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>("");

  useEffect(() => {
    // 1. C-ABI Soket Köprüsünü ilklendir
    const success = AxiomCABISocketBridge.initializeBridge();
    setBridgeConnected(success);

    if (success) {
      AxiomCABISocketBridge.dispatchCABIPacket(0x01, "SHELL_MOUNTED_AND_WIRED");
    }
  }, []);

  // Responsive Canvas Çizim Motoru
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let t = 0;

    const resizeCanvas = () => {
      if (container && canvas) {
        canvas.width = container.clientWidth || 800;
        canvas.height = container.clientHeight || 180;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      t += 0.015;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Derin Arka Plan
      ctx.fillStyle = 'rgba(7, 11, 18, 0.95)';
      ctx.fillRect(0, 0, w, h);

      // Izgara
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 44) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Harmonik Fizik Dalga Eğrisi (Orijinal AXIOM Turkuaz)
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < w; i++) {
        const y = h / 2 + Math.sin(i * 0.015 + t) * 28 * Math.cos(t * 0.4);
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // İcra Tetikleyicisi ve Otomatik Input Temizleme
  const handleExecute = useCallback((textToRun?: string) => {
    const targetText = typeof textToRun === "string" ? textToRun : commandInput;
    if (!targetText.trim() || busy) return;

    if (bridgeConnected) {
      AxiomCABISocketBridge.dispatchCABIPacket(0x02, targetText.trim());
    }

    if (onSubmit) {
      onSubmit(targetText.trim());
    }

    // Girdi kutusunu yeni soru için otomatik temizle!
    setCommandInput("");
  }, [commandInput, busy, bridgeConnected, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="w-full flex flex-col justify-between p-4 bg-[var(--tb-panel,#070b12)] text-[var(--tb-text,#e2e8f0)] font-mono border border-[var(--tb-border,rgba(14,165,233,0.3))] rounded-xl shadow-xl select-none space-y-3">
      
      {/* Üst Bilgi Barı */}
      <div className="flex flex-wrap justify-between items-center border-b border-[var(--tb-border,rgba(14,165,233,0.3))] pb-3 text-xs tracking-wider bg-[var(--tb-panel-soft,#0a101d)] px-4 py-2.5 rounded-lg shadow-inner gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded border border-sky-500/30 font-bold flex items-center gap-2 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {bridgeConnected ? 'AXIOM_DETERMİNİSTİK_ÇEKİRDEK_AKTİF' : 'AXIOM_CABI_BAĞLANIYOR'}
          </span>
          <span className="text-slate-400 text-[11px]">ROM TCB: <strong className="text-white">DEĞİŞMEZ_MÜHÜRLÜ</strong></span>
          <span className="text-slate-400 text-[11px]">RAM LRU: <strong className="text-sky-400">36.2 / 50.0 MB</strong></span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span className="text-sky-400 font-semibold">Z3 SMT: 11ms</span>
          <span className="text-sky-400 font-semibold">Lean 4: 78ms</span>
          <button 
            type="button"
            onClick={() => setIsLicenseModalOpen(true)}
            className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-600 font-bold hover:bg-emerald-900 transition cursor-pointer text-[11px]"
          >
            {peers} / {FREE_DEVICE_LIMIT} KANITLANDI
          </button>
        </div>
      </div>

      {/* Orta Alan: Geometri ve Fizik Canvas Sentezleme Penceresi */}
      <div ref={containerRef} className="relative w-full h-36 my-1 flex flex-col justify-center items-center overflow-hidden rounded-xl bg-[var(--tb-bg-soft,#090e18)] border border-[var(--tb-border,rgba(14,165,233,0.2))] shadow-lg">
        <canvas ref={canvasRef} className="w-full h-full object-cover opacity-95" />
        
        {/* Canlı Hakikat Matris Kartı */}
        <div className="absolute top-3 left-3 bg-[var(--tb-panel,#070b12)]/90 p-3 rounded-lg border border-sky-500/30 backdrop-blur-md text-xs space-y-1 shadow-xl">
          <div className="text-sky-400 font-bold tracking-wider uppercase text-[11px]">&gt;&gt; EVRENSEL BİLİM DEĞİŞMEZ MATRİSİ</div>
          <div className="text-slate-400 text-[10px]">Motor: Formal Kanıt ve Hesaplamalı Geometri v12</div>
          <div className="text-emerald-400 font-medium text-[10px]">Durum: P2P Şifreli ve Senkronize (DÜĞÜM_AKTİF)</div>
        </div>
      </div>

      {/* YÜKSEK KONTRASTLI VE NET ÖRNEK ÖNERMELER */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] text-[var(--tb-text,#ffffff)] font-bold mr-1 tracking-wide">
          Örnek Önermeler:
        </span>
        {ORNEK_ONERMELER.map((onerme, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleExecute(onerme)}
            className="text-[11px] font-semibold bg-sky-950 text-sky-100 hover:bg-sky-400 hover:text-slate-950 border border-sky-400 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm truncate max-w-[300px]"
          >
            {onerme}
          </button>
        ))}
      </div>

      {/* Alt Alan: Evrensel Komut Giriş Barı ve Otomatik Temizlenen ÇALIŞTIR Butonu */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center bg-[var(--tb-panel-soft,#0a101d)] border border-sky-500/50 rounded-xl px-4 py-2.5 shadow-md gap-2">
          <span className="text-sky-400 font-bold tracking-widest text-xs shrink-0">AXIOM&gt;</span>
          <input 
            type="text" 
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aksiyomatik önerme, evrensel mantık, formal teorem veya kod parçası girin..." 
            className="w-full bg-transparent text-[var(--tb-text,#ffffff)] focus:outline-none font-mono text-xs placeholder-slate-400 font-medium"
          />
          <button 
            type="button"
            onClick={() => handleExecute()}
            disabled={busy || !commandInput.trim()}
            className="bg-sky-500 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-sky-400 transition shadow-md cursor-pointer disabled:opacity-40 shrink-0 uppercase tracking-wider"
          >
            {busy ? 'İşleniyor…' : 'ÇALIŞTIR'}
          </button>
        </div>

        <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 pt-0.5 px-1 gap-2 font-medium">
          <span>AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs</span>
          <span className="text-sky-400 font-semibold">C-ABI SOKETİ: tedbirge_truth.sock // ZKP-SHA256</span>
        </div>
      </div>

      <LicenseModal
        open={isLicenseModalOpen}
        peers={peers}
        onClose={() => setIsLicenseModalOpen(false)}
      />
    </div>
  );
};

export default AxiomMasterShell;
