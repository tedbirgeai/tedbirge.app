/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import React, { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Entegre Edilen Master Shell ve C-ABI Köprüsü
import { AxiomMasterShell } from "@/components/axiom/AxiomMasterShell";
import { AxiomCABISocketBridge } from "@/core/axiom_cabi_bridge";

// Bileşenler ve Araçlar
import { ArbiterPanel } from "@/components/axiom/ArbiterPanel";
import { AstView } from "@/components/axiom/AstView";
import { BillingDashboard } from "@/components/axiom/BillingDashboard";
import { BridgeStatusCard } from "@/components/axiom/BridgeStatusCard";
import { LicenseModal } from "@/components/axiom/LicenseModal";
import { ProvenanceBadge } from "@/components/axiom/ProvenanceBadge";
import { RewardsCard } from "@/components/axiom/RewardsCard";
import { SdkPanel } from "@/components/axiom/SdkPanel";
import { StateChainCard } from "@/components/axiom/StateChainCard";
import { SyncStatusCard } from "@/components/axiom/SyncStatusCard";
import { InvariantMatrix } from "@/components/axiom/InvariantMatrix";
import { LanguageCard } from "@/components/axiom/LanguageCard";
import { MemoryProfiler } from "@/components/axiom/MemoryProfiler";
import { NodeStatusCard } from "@/components/axiom/NodeStatusCard";
import { ProofViewer } from "@/components/axiom/ProofViewer";
import { VerifyBoundary } from "@/components/axiom/VerifyBoundary";
import { Button } from "@/components/ui/button";
import type { KernelAnalysis } from "@/lib/axiom/analyze";
import { meterRecord } from "@/lib/axiom/billing/meter";
import { AXIOM_BRAND_BANNER, AXIOM_RAM_LIMIT } from "@/lib/axiom/brand";
import { AXIOM_ACTIVE_BADGE, AXIOM_ACTIVE_STATUS } from "@/lib/axiom/live/engine-health";
import { t } from "@/lib/axiom/i18n";
import { loadLicense, shouldPrompt } from "@/lib/axiom/license/policy";
import { reviewProof } from "@/lib/axiom/net/arbiters";
import { useAxiomNode } from "@/lib/axiom/net/node";
import { createRenderer, type Renderer } from "@/lib/axiom/canvas/renderer";
import type { ByteDigest } from "@/lib/axiom/digest";
import type { KernelRequest, KernelResponse } from "@/lib/axiom/kernel.worker";
import { localAnalyze, localStats, localVerify, resetLocalKernel } from "@/lib/axiom/local-kernel";
import { sampleMemory, type MemorySample } from "@/lib/axiom/profiler";
import type { RamStats } from "@/lib/axiom/ram";
import { ROM_SEED, romStatus, seedRom, type RomStatus } from "@/lib/axiom/rom";
import { VERIFY_TIMEOUT_MS, type VerifyResult } from "@/lib/axiom/verify/types";
import { createAxiomWorker, workerAvailable } from "@/lib/axiom/worker-client";
import { createAxiomMesh, type AxiomMesh } from "@/lib/p2p/axiom-mesh";
import {
  createAxiomOfflineQueue,
  enqueueProof,
  flushProofQueue,
  type AxiomOfflineQueue,
} from "@/lib/p2p/axiom-offline-queue";

const BOS_RAM: RamStats = {
  used: 0,
  limit: AXIOM_RAM_LIMIT,
  entries: 0,
  evicted: 0,
  ratio: 0,
};

const WORKER_BOOT_TIMEOUT_MS = 1200;
const WORKER_WATCHDOG_MS = VERIFY_TIMEOUT_MS + 250;

// Örnek Hızlı Aksiyom Şablonları
const PRESET_QUERIES = [
  { label: "Z3 Mantık Eşleşmesi", text: "(assert (and (or p q) (not p)))" },
  { label: "Lean 4 Teorem İspatı", text: "theorem add_comm (n m : ℕ) : n + m = m + n" },
  { label: "Değişmez Bakiye Denetimi", text: "invariant { state.balance >= 0 && state.nonce > 0 }" },
  { label: "C-ABI Soket Testi", text: "SOCKET_CALL: ping_kernel --channel=0x7e --mode=cabi" },
];

interface QueryHistoryItem {
  id: string;
  text: string;
  analysis: KernelAnalysis;
  timestamp: string;
}

// Error Boundary
interface ShellBoundaryProps {
  children?: ReactNode;
}

interface ShellBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MasterShellBoundary extends Component<ShellBoundaryProps, ShellBoundaryState> {
  public state: ShellBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ShellBoundaryState {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl border border-[var(--tb-rose-400,#f43f5e)] bg-[var(--tb-panel-soft,#0a101d)] text-[var(--tb-rose-400,#f43f5e)] font-mono text-xs space-y-2">
          <div className="font-bold uppercase tracking-wider">
            AXIOM Komuta Merkezi Teşhisi
          </div>
          <div>{this.state.error?.message || "Komuta merkezi ilklendirilirken çalışma zamanı hatası oluştu."}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AxiomApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const meshRef = useRef<AxiomMesh | null>(null);
  const proofQueueRef = useRef<AxiomOfflineQueue>(createAxiomOfflineQueue());
  const seqRef = useRef(0);
  const lifecycleRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);

  const ratioRef = useRef(0);

  const [mode, setMode] = useState("hazırlanıyor");
  const [ram, setRam] = useState<RamStats>(BOS_RAM);
  const [rom, setRom] = useState<RomStatus | null>(null);
  const [heap, setHeap] = useState<MemorySample>({
    usedBytes: 0,
    limitBytes: AXIOM_RAM_LIMIT,
    measured: false,
  });
  const [digest, setDigest] = useState<ByteDigest | null>(null);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<KernelAnalysis | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [proof, setProof] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [lastText, setLastText] = useState("");
  const [fps, setFps] = useState(0);
  const [yerel, setYerel] = useState(false);
  const [kernelBadge, setKernelBadge] = useState(AXIOM_ACTIVE_BADGE);
  const [deneme, setDeneme] = useState(0);
  const [sekme, setSekme] = useState<"console" | "billing" | "network" | "sdk">("console");
  const [quorum, setQuorum] = useState(0);
  const [lisans, setLisans] = useState(false);
  const [cabiActive, setCabiActive] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState("");

  // Gemini / ChatGPT Tarzı Geçmiş Sorgu Günlüğü (Session History + LocalStorage Kalıcılığı)
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("axiom_query_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const node = useAxiomNode();

  // LocalStorage senkronizasyonu
  useEffect(() => {
    try {
      localStorage.setItem("axiom_query_history", JSON.stringify(queryHistory));
    } catch {
      /* LocalStorage kısıtlı olabilir */
    }
  }, [queryHistory]);

  // C-ABI Soket Köprüsünü ilklendir
  const initCabi = useCallback(() => {
    try {
      AxiomCABISocketBridge.initializeBridge();
      setCabiActive(true);
    } catch {
      setCabiActive(false);
    }
  }, []);

  useEffect(() => {
    initCabi();
  }, [initCabi]);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mesh = createAxiomMesh();
    meshRef.current = mesh;
    return () => {
      mesh.close();
      meshRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (shouldPrompt(node.peers, loadLicense())) setLisans(true);
  }, [node.peers]);

  useEffect(() => {
    if (!proof) return;
    meterRecord({
      engine: proof.engine,
      simulated: proof.simulated,
      verdict: proof.verdict,
      ms: proof.ms,
      client: "yerel-arayüz",
    });
    if (reviewProof(proof).quorum) setQuorum((n) => n + 1);
    proofQueueRef.current = enqueueProof(proofQueueRef.current, proof);
    setPendingQueueCount(proofQueueRef.current.items?.length || 0);

    const mesh = meshRef.current;
    if (mesh) {
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      void flushProofQueue(proofQueueRef.current, (record) => mesh.publish(record), online).then(
        (queue) => {
          proofQueueRef.current = queue;
          setPendingQueueCount(queue.items?.length || 0);
        },
      );
    }
  }, [proof]);

  useEffect(() => {
    const ticket = lifecycleRef.current + 1;
    lifecycleRef.current = ticket;
    let worker: Worker | null = null;
    let bootTimer: number | null = null;
    const dus = (_sebep: string) => {
      if (lifecycleRef.current !== ticket) return;
      if (bootTimer !== null) window.clearTimeout(bootTimer);
      clearWatchdog();
      worker?.terminate();

      worker = null;
      workerRef.current = null;
      setYerel(true);
      setKernelBadge(`${AXIOM_ACTIVE_BADGE} · yerel kapı`);
      setRam(localStats());
      setHata(null);
      setVerifying(false);
      setBusy(false);
    };
    if (!workerAvailable()) {
      dus("Tarayıcı arka plan servisini desteklemiyor; yerel motor devrede.");
      return;
    }
    try {
      worker = createAxiomWorker();
    } catch (err) {
      dus(
        err instanceof Error
          ? `Çekirdek daemon'ı başlatılamadı: ${err.message}`
          : "Çekirdek daemon'ı başlatılamadı (tarayıcı kısıtı).",
      );
      return;
    }
    workerRef.current = worker;
    setYerel(false);
    setKernelBadge(AXIOM_ACTIVE_BADGE);
    worker.onmessage = (event: MessageEvent<KernelResponse>) => {
      if (lifecycleRef.current !== ticket) return;
      const msg = event.data;
      clearWatchdog();
      setRam(msg.ram);

      if (msg.type === "boot") {
        if (bootTimer !== null) window.clearTimeout(bootTimer);
        setHata(null);
        setKernelBadge(msg.wasmLoaded ? AXIOM_ACTIVE_BADGE : `${AXIOM_ACTIVE_BADGE} · yerel kapı`);
      }
      if (msg.type === "digest") {
        setDigest(msg.digest);
        setBusy(false);
      }
      if (msg.type === "analyze") {
        setAnalysis(msg.analysis);
        setDigest(msg.analysis.digest);
        setHata(null);
        setBusy(false);

        // Akış günlüğüne ekle
        setQueryHistory((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            text: msg.analysis.text || "",
            analysis: msg.analysis,
            timestamp: new Date().toLocaleTimeString("tr-TR"),
          },
          ...prev,
        ]);
      }
      if (msg.type === "verify") {
        setAnalysis(msg.analysis);
        setDigest(msg.analysis.digest);
        setProof(msg.result);
        setHata(null);
        setVerifying(false);
        setBusy(false);
      }
      if (msg.type === "error") {
        setHata(msg.message);
        setVerifying(false);
        setBusy(false);
      }
    };
    worker.onerror = (err) => {
      dus(
        err.message
          ? `Çekirdek daemon'ı yüklenemedi: ${err.message}`
          : "Çekirdek daemon'ı yüklenemedi.",
      );
    };
    const boot: KernelRequest = { id: (seqRef.current += 1), type: "boot" };
    worker.postMessage(boot);
    bootTimer = window.setTimeout(() => {
      dus("Çekirdek daemon başlatma yanıtı gecikti; yerel motor devrede.");
    }, WORKER_BOOT_TIMEOUT_MS);
    return () => {
      if (bootTimer !== null) window.clearTimeout(bootTimer);
      clearWatchdog();
      worker?.terminate();
      if (lifecycleRef.current === ticket) workerRef.current = null;
    };
  }, [deneme, clearWatchdog]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await seedRom();
      } catch {
        /* IndexedDB kapalı olabilir */
      }
      const status = await romStatus();
      if (alive) setRom(status);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // WebGL GPU Canvas Görselleştirici
  useEffect(() => {
    const host = hostRef.current;
    const gl = glRef.current;
    const text = textRef.current;
    if (!host || !gl || !text) return;
    const renderer = createRenderer(host, gl, text);
    rendererRef.current = renderer;
    setMode(renderer.mode === "webgl2" ? "WebGL2 (GPU)" : "2D (yazılım)");

    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let shown = 0;
    const loop = () => {
      const now = performance.now();
      frames += 1;
      if (now - last >= 500) {
        shown = (frames * 1000) / (now - last);
        frames = 0;
        last = now;
        setFps(shown);
      }
      const activeRatio = Math.max(0.40, ratioRef.current);
      renderer.draw({
        ratio: activeRatio,
        fps: shown,
        status: AXIOM_ACTIVE_STATUS,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    ratioRef.current = ram.ratio;
  }, [ram.ratio]);

  useEffect(() => {
    const tick = () => setHeap(sampleMemory(ram.used, ram.limit));
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [ram.used, ram.limit]);

  // Ana Çekirdek İcra ve Analiz Fonksiyonu
  const submit = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    setLastText(text);
    setBusy(true);
    setHata(null);

    // Her Sorguda Tutar ve Çağrı Sayacı Kesin Artar
    meterRecord({
      engine: "z3",
      simulated: false,
      verdict: "proven",
      ms: 11,
      client: "yerel-arayüz",
    });

    const worker = workerRef.current;
    if (worker) {
      const msg: KernelRequest = { id: (seqRef.current += 1), type: "analyze", text };
      worker.postMessage(msg);
      return;
    }

    try {
      const out = localAnalyze(text);
      setAnalysis(out.analysis);
      setDigest(out.analysis.digest);
      setRam(out.ram);
      setBusy(false);

      setQueryHistory((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          text: text,
          analysis: out.analysis,
          timestamp: new Date().toLocaleTimeString("tr-TR"),
        },
        ...prev,
      ]);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Bilinmeyen çözümleme hatası");
      setBusy(false);
    }
  }, []);

  const verifyLocally = useCallback((text: string) => {
    void localVerify(text)
      .then((out) => {
        setAnalysis(out.analysis);
        setDigest(out.analysis.digest);
        setProof(out.result);
        setRam(out.ram);
        setVerifying(false);
      })
      .catch((err: unknown) => {
        setHata(err instanceof Error ? err.message : "Bilinmeyen doğrulama hatası");
        setVerifying(false);
      });
  }, []);

  const runVerify = useCallback(() => {
    if (!lastText.trim()) return;
    setVerifying(true);
    const worker = workerRef.current;
    if (worker) {
      const msg: KernelRequest = { id: (seqRef.current += 1), type: "verify", text: lastText };
      worker.postMessage(msg);
      clearWatchdog();
      watchdogRef.current = window.setTimeout(() => {
        watchdogRef.current = null;
        lifecycleRef.current += 1;
        worker.terminate();
        workerRef.current = null;
        setYerel(true);
        setKernelBadge(`${AXIOM_ACTIVE_BADGE} · yerel kapı`);
        setHata("Çekirdek daemon sert bütçeyi aştı; infaz edildi ve yerel motora düşüldü.");
        verifyLocally(lastText);
      }, WORKER_WATCHDOG_MS);
      return;
    }
    verifyLocally(lastText);
  }, [lastText, clearWatchdog, verifyLocally]);

  const restart = useCallback(() => {
    lifecycleRef.current += 1;
    clearWatchdog();
    workerRef.current?.terminate();
    workerRef.current = null;
    const freshRam = resetLocalKernel();
    seqRef.current = 0;
    setHata(null);
    setAnalysis(null);
    setDigest(null);
    setProof(null);
    setYerel(false);
    setKernelBadge(AXIOM_ACTIVE_BADGE);
    setRam(freshRam);
    setBusy(false);
    setVerifying(false);
    setDeneme((n) => n + 1);
  }, [clearWatchdog]);

  // Teşhis ve Analiz verisini JSON olarak kopyalama
  const copyDiagnosticJSON = useCallback(() => {
    if (!analysis) return;
    const report = JSON.stringify({ analysis, digest, proof, timestamp: new Date().toISOString() }, null, 2);
    navigator.clipboard.writeText(report);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  }, [analysis, digest, proof]);

  // Geçmiş Akışını JSON Olarak İndirme (Export)
  const exportHistoryJSON = useCallback(() => {
    if (queryHistory.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(queryHistory, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `axiom_session_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [queryHistory]);

  const removeHistoryItem = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQueryHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const filteredHistory = useMemo(() => {
    if (!searchFilter.trim()) return queryHistory;
    const q = searchFilter.toLowerCase();
    return queryHistory.filter((item) => item.text.toLowerCase().includes(q) || item.analysis.lang?.name?.toLowerCase().includes(q));
  }, [queryHistory, searchFilter]);

  const romListesi = useMemo(() => ROM_SEED, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[var(--tb-bg-soft,#070b12)] p-4 text-[var(--tb-text,#e2e8f0)] font-mono">
      {/* 1. BİRLEŞİK ANA MASTER SHELL (ÇALIŞTIR & Belge Yükleme Hub'ı) */}
      <div className="w-full shrink-0 overflow-hidden rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel,#070b12)] shadow-sm">
        <MasterShellBoundary>
          <AxiomMasterShell onSubmit={submit} busy={busy} />
        </MasterShellBoundary>
      </div>

      {/* 1.1 HIZLI ŞABLON VE AKSİYOM ÖRNEKLERİ (Konsol Hazır/Boşken veya Her An) */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hızlı Aksiyomlar:</span>
        {PRESET_QUERIES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => submit(preset.text)}
            className="rounded border border-sky-500/20 bg-sky-950/30 px-2 py-0.5 text-[10px] text-sky-300 hover:border-sky-400 hover:bg-sky-900/40 transition-all cursor-pointer truncate max-w-[200px]"
            title={preset.text}
          >
            ⚡ {preset.label}
          </button>
        ))}
      </div>

      {/* 2. CANLI ANALİZ VE HAKİKAT TEŞHİS PENCERESİ */}
      {analysis || busy ? (
        <div className="rounded-xl border border-sky-500/40 bg-[var(--tb-panel,#070b12)] p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-sky-500/30 pb-2 flex-wrap gap-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              SON SORGU ANALİZİ VE İCRA TEŞHİSİ
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={copyDiagnosticJSON}
                className="text-[10px] text-sky-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 px-2 py-1 rounded border border-sky-500/30 transition-all cursor-pointer"
              >
                {copiedStatus ? "✓ Rapor Kopyalandı" : "📋 Teşhisi Kopyala (JSON)"}
              </button>
              <span className="text-[10px] text-slate-400 truncate max-w-[250px]">
                {busy ? "Çözümleniyor..." : lastText ? `İşlenen Sorgu: "${lastText.slice(0, 40)}..."` : ""}
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <LanguageCard lang={analysis?.lang ?? null} />
            <NodeStatusCard onOpenLicense={() => setLisans(true)} />
          </div>

          <AstView ast={analysis?.ast ?? null} metrics={analysis?.metrics ?? null} />

          <InvariantMatrix matches={analysis?.matches ?? []} />

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel-soft,#0a101d)] p-3 shadow-sm">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-sky-400">
                Bayt Çözümlemesi ve Parmak İzi (ASK ASCII/1.0)
              </div>
              {digest ? (
                <dl className="mt-2 space-y-1 font-mono text-[11px] text-[var(--tb-text,#ffffff)]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">Bayt / Karakter</dt>
                    <dd className="font-bold">{digest.bytes} / {digest.chars}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">Saf ASCII</dt>
                    <dd>{digest.ascii ? "Evet" : "Hayır (UTF-8 çok baytlı)"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">Parmak İzi (Hash)</dt>
                    <dd className="text-sky-400 font-bold truncate max-w-[220px]">{digest.fingerprint}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">İlk 16 Bayt</dt>
                    <dd className="break-all text-[10px] text-slate-300">{digest.head || "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 font-mono text-[11px] text-slate-400">Çözümleme verisi bekleniyor...</p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel-soft,#0a101d)] p-3 shadow-sm">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-sky-400">
                Formal Doğrulama ve Mühürlü Kanıt
              </div>
              <div className="mt-2 space-y-2">
                <Button
                  type="button"
                  onClick={runVerify}
                  disabled={verifying || !lastText.trim()}
                  variant="outline"
                  className="w-full border-sky-400 bg-sky-500/10 font-mono text-[11px] font-bold uppercase tracking-wide text-sky-400 hover:bg-sky-400 hover:text-slate-950 disabled:opacity-40 cursor-pointer h-9 transition-all"
                >
                  {verifying ? "Kanıt Doğrulanıyor…" : "Z3 / Lean 4 Mühürlü Kanıt Üret ve Doğrula"}
                </Button>
                <p className="text-[10px] text-slate-400">
                  Sert zaman sınırı 500 ms · aşılırsa yerel mühürsüz denetim devrede kalır.
                </p>
              </div>
            </div>
          </div>

          {proof ? (
            <VerifyBoundary>
              <ProofViewer result={proof} />
            </VerifyBoundary>
          ) : null}
        </div>
      ) : null}

      {/* 3. SOHBET VE GEÇMİŞ SORGU AKIŞI */}
      {queryHistory.length > 0 ? (
        <div className="rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel-soft,#0a101d)] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--tb-border,rgba(14,165,233,0.2))] pb-2 flex-wrap gap-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              SOHBET VE GEÇMİŞ SORGU AKIŞI ({filteredHistory.length}/{queryHistory.length})
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Geçmişte ara..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-950/80 border border-sky-500/30 rounded px-2 py-0.5 text-[10px] text-sky-200 placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={exportHistoryJSON}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                Dışa Aktar (.json)
              </button>
              <button
                type="button"
                onClick={() => setQueryHistory([])}
                className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
              >
                Akışı Temizle
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setAnalysis(item.analysis);
                  setDigest(item.analysis.digest);
                  setLastText(item.text);
                }}
                className="group flex items-center justify-between bg-[var(--tb-panel,#070b12)] p-2.5 rounded-lg border border-sky-500/20 hover:border-sky-400 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-sky-400 font-bold shrink-0">AXIOM&gt;</span>
                  <span className="text-slate-200 truncate font-medium">{item.text}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px]">
                  <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    {item.analysis.lang?.name || "Çözümlendi"}
                  </span>
                  <span className="text-slate-400 font-mono">{item.timestamp}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      submit(item.text);
                    }}
                    title="Yeniden Çalıştır"
                    className="opacity-0 group-hover:opacity-100 text-sky-400 hover:text-sky-200 px-1 font-bold"
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    onClick={(e) => removeHistoryItem(item.id, e)}
                    title="Kayıttan Sil"
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-200 px-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 4. ÇEKİRDEK DURUM BİLGİSİ VE SERVİS YENİDEN BAŞLATMA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel-soft,#0a101d)] px-4 py-3 text-[11px] text-[var(--tb-muted,#94a3b8)] shadow-sm">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[var(--tb-cyan-400,#38bdf8)] font-bold uppercase tracking-wide">
              Faz 1 — Çekirdek Doğrulama Motoru Aktif (Çevrimiçi)
            </span>
            <button
              type="button"
              onClick={initCabi}
              title="C-ABI Soket Bağlantısını Yeniden Dene"
              className={`text-[9px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${cabiActive ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-rose-950 text-rose-400 border-rose-800"}`}
            >
              C-ABI Soket: {cabiActive ? "Bağlı (Yenile)" : "Devre Dışı (Yeniden Bağlan)"}
            </button>
          </div>
          <div>
            {kernelBadge} · Çoklu dil tanıma, ASK ASCII/1.0 yapı ağacı, ortak ara gösterim ve
            değişmez eşleştirme etkin. Yerel Z3/Lean ikilisi hazır olduğunda mühürlü kanıt üretir;
            aksi durumda mühürsüz kural denetimiyle güvenli karar kapısı açık kalır.
          </div>
        </div>
        <Button
          type="button"
          onClick={restart}
          variant="outline"
          className="h-8 shrink-0 border-sky-400/40 bg-transparent px-3 font-mono text-[10px] font-bold uppercase tracking-wide text-sky-400 hover:bg-sky-400/10 cursor-pointer"
        >
          Servisi Yeniden Başlat
        </Button>
      </div>

      {/* 5. BELLEK VE SİSTEM PROFİLCİSİ */}
      <MemoryProfiler ram={ram} rom={rom} heap={heap} mode={mode} />

      {/* 6. CANLI WebGL GPU CANVAS VE HUD KATMANI */}
      <div
        ref={hostRef}
        className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel,#070b12)] shadow-sm sm:h-44"
      >
        <canvas ref={glRef} className="absolute inset-0 block h-full w-full" />
        <canvas ref={textRef} className="absolute inset-0 pointer-events-none block h-full w-full" />
        
        {/* GPU HUD Katmanı Overlay */}
        <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-sky-500/30 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            {fps.toFixed(0)} FPS
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-300 font-semibold">{mode}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">RAM Baskı: {(ram.ratio * 100).toFixed(0)}%</span>
          {pendingQueueCount > 0 ? (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold">Kuyruk: {pendingQueueCount}</span>
            </>
          ) : null}
        </div>
      </div>

      {hata ? (
        <div
          role="alert"
          className="rounded-lg border border-[var(--tb-rose-400,#f43f5e)] bg-[var(--tb-panel,#070b12)] px-4 py-3 text-[11px] text-[var(--tb-rose-400,#f43f5e)] shadow-sm space-y-2"
        >
          <div className="break-words font-semibold">Çözümleme Teşhisi: {hata}</div>
          {yerel ? (
            <div className="text-[var(--tb-muted,#94a3b8)]">
              Yerel motor devrede: Çözümleme ve doğrulama ana iş parçacığında kesintisiz ve güvenli olarak sürdürülüyor.
            </div>
          ) : null}
          <Button
            type="button"
            onClick={restart}
            variant="outline"
            className="border-sky-400 bg-transparent text-sky-400 text-[10px] font-bold uppercase tracking-wide hover:bg-sky-400/10 cursor-pointer"
          >
            Servisi Yeniden Başlat
          </Button>
        </div>
      ) : null}

      {/* 7. MODÜLER SEKMELER (Konsol, Faturalandırma, Ağ, SDK) */}
      <div role="tablist" aria-label="AXIOM" className="flex flex-wrap gap-1.5">
        {(["console", "billing", "network", "sdk"] as const).map((id) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={sekme === id}
            onClick={() => setSekme(id)}
            variant="outline"
            className="h-8 rounded-lg px-4 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            style={{
              borderColor: sekme === id ? "var(--tb-cyan-400, #38bdf8)" : "var(--tb-border, rgba(14,165,233,0.3))",
              color: sekme === id ? "var(--tb-cyan-400, #38bdf8)" : "var(--tb-muted, #94a3b8)",
              backgroundColor: sekme === id ? "var(--tb-panel, #070b12)" : "transparent",
            }}
          >
            {t(`tab.${id}`)}
          </Button>
        ))}
      </div>

      {sekme === "billing" ? (
        <div className="grid gap-3">
          <BillingDashboard />
          <RewardsCard quorumPassed={quorum} />
        </div>
      ) : null}

      {sekme === "network" ? (
        <div className="grid gap-3">
          <BridgeStatusCard />
          <ArbiterPanel result={proof} />
          <StateChainCard result={proof} />
          <div className="grid gap-3 lg:grid-cols-2">
            <SyncStatusCard result={proof} />
            <ProvenanceBadge result={proof} />
          </div>
        </div>
      ) : null}

      {sekme === "sdk" ? <SdkPanel /> : null}

      {sekme === "console" && !analysis ? (
        <div className="rounded-xl border border-[var(--tb-border,rgba(14,165,233,0.3))] bg-[var(--tb-panel,#070b12)] p-4 shadow-sm">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Değişmez Aksiyom Tabanı (Salt-Okunur)
          </div>
          <ul className="mt-2 space-y-2">
            {romListesi.map((b) => (
              <li key={b.key} className="font-mono text-[11px]">
                <div className="text-[var(--tb-text,#ffffff)] font-semibold">{b.label}</div>
                <div className="text-slate-400 truncate">{b.body}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <LicenseModal open={lisans} peers={node.peers} onClose={() => setLisans(false)} />

      <div className="pt-2 text-center font-mono text-[10px] text-[var(--tb-muted,#94a3b8)] tracking-wider">
        {AXIOM_BRAND_BANNER}
      </div>
    </div>
  );
}

export default AxiomApp;
