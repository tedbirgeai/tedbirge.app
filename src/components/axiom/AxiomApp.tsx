/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM KERNEL v12 — KONSOL PENCERESİ
 * ------------------------------------------------------------------
 * Sanal ROM, 50 MB sınırlı sanal RAM, Web Worker daemon'ı, WebGL2 çizim
 * yüzeyi ve canlı doğrulama oturumu tek pencerede çalışır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArbiterPanel } from "@/components/axiom/ArbiterPanel";
import { AstView } from "@/components/axiom/AstView";
import { BillingDashboard } from "@/components/axiom/BillingDashboard";
import { BridgeStatusCard } from "@/components/axiom/BridgeStatusCard";
import { LicenseModal } from "@/components/axiom/LicenseModal";
import { CommandBar } from "@/components/axiom/CommandBar";
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

/**
 * Ana iş parçacığı bekçisi: worker içindeki sert bütçe (500 ms) bir
 * WASM kilitlenmesi yüzünden hiç yanıt vermezse, bekçi süreyi küçük bir
 * tolerans payıyla aşan daemon'ı `terminate()` ile infaz eder ve aynı
 * doğrulama yedek motorda tamamlanır.
 */
const WORKER_WATCHDOG_MS = VERIFY_TIMEOUT_MS + 250;

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
  /** Etkin doğrulama bekçisi (ana iş parçacığı zaman aşımı denetçisi). */
  const watchdogRef = useRef<number | null>(null);

  /** Çizim döngüsü durumu ref ile okunur: RAM değişimi WebGL bağlamını kurmaz. */
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
  /** Daemon kurulamazsa çözümleme ana iş parçacığında yürür. */
  const [yerel, setYerel] = useState(false);
  const [kernelBadge, setKernelBadge] = useState(AXIOM_ACTIVE_BADGE);
  /** Yeniden başlatma düğmesi bu sayacı arttırır. */
  const [deneme, setDeneme] = useState(0);
  /** Görünen sekme: konsol · faturalandırma · ağ · SDK. */
  const [sekme, setSekme] = useState<"console" | "billing" | "network" | "sdk">("console");
  /** Hakem çoğunluğundan geçen doğrulama sayısı (ödül kartı için). */
  const [quorum, setQuorum] = useState(0);
  /** Lisans penceresi: 6. cihaz görüldüğünde açılır. */
  const [lisans, setLisans] = useState(false);
  const node = useAxiomNode();

  /** Bekçi sayacını söndürür (yanıt geldi ya da oturum kapandı). */
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

  // Ücretsiz cihaz sınırı aşıldığında yükseltme penceresi bir kez açılır.
  useEffect(() => {
    if (shouldPrompt(node.peers, loadLicense())) setLisans(true);
  }, [node.peers]);

  // Her yeni karar ölçüm defterine ve hakem denetimine girer.
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
    const mesh = meshRef.current;
    if (mesh) {
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      void flushProofQueue(proofQueueRef.current, (record) => mesh.publish(record), online).then(
        (queue) => {
          proofQueueRef.current = queue;
        },
      );
    }
  }, [proof]);

  // --- Çekirdek daemon'ı: bayt çözümlemesi ana iş parçacığını kilitlemez.
  useEffect(() => {
    const ticket = lifecycleRef.current + 1;
    lifecycleRef.current = ticket;
    let worker: Worker | null = null;
    let bootTimer: number | null = null;
    const dus = (sebep: string) => {
      if (lifecycleRef.current !== ticket) return;
      // Daemon kurulamadı: arayüz çökmez, aynı motor ana iş parçacığında çalışır.
      if (bootTimer !== null) window.clearTimeout(bootTimer);
      clearWatchdog();
      worker?.terminate();

      worker = null;
      workerRef.current = null;
      setYerel(true);
      setKernelBadge(AXIOM_ACTIVE_BADGE);
      setRam(localStats());
      setHata(sebep);
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
      // Yanıt geldi: bekçi söndürülür, infaz gerekmez.
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
    // Daemon yüklenemezse arayüz sessizce beklemez: yedek motora düşülür.
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

  // --- Sanal ROM: tohum bloklar yazılır, kalıcı depolama izni istenir.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await seedRom();
      } catch {
        /* IndexedDB kapalı olabilir: durum "kullanılamıyor" görünür */
      }
      const status = await romStatus();
      if (alive) setRom(status);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Çizim: WebGL2 varsa GPU, yoksa yazılım; her iki kip de etiketlenir.
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
      renderer.draw({
        ratio: ratioRef.current,
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

  // Doluluk oranı yalnız referansa yazılır (yeniden çizim zaten her karede).
  useEffect(() => {
    ratioRef.current = ram.ratio;
  }, [ram.ratio]);

  // --- Bellek örneklemesi: gerçek ölçüm yoksa sanal deftere düşer.
  useEffect(() => {
    const tick = () => setHeap(sampleMemory(ram.used, ram.limit));
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [ram.used, ram.limit]);

  const submit = useCallback((text: string) => {
    setLastText(text);
    setBusy(true);
    const worker = workerRef.current;
    if (worker) {
      const msg: KernelRequest = { id: (seqRef.current += 1), type: "analyze", text };
      worker.postMessage(msg);
      return;
    }
    // Yedek yol: aynı zincir ana iş parçacığında yürür.
    try {
      const out = localAnalyze(text);
      setAnalysis(out.analysis);
      setDigest(out.analysis.digest);
      setRam(out.ram);
      setBusy(false);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Bilinmeyen çözümleme hatası");
      setBusy(false);
    }
  }, []);

  /** Yedek motorda doğrulama (worker yok ya da infaz edildi). */
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

  /** Doğrulama: aynı girdi simgesel motora gönderilir (500 ms sert bütçe). */
  const runVerify = useCallback(() => {
    if (!lastText.trim()) return;
    setVerifying(true);
    const worker = workerRef.current;
    if (worker) {
      const msg: KernelRequest = { id: (seqRef.current += 1), type: "verify", text: lastText };
      worker.postMessage(msg);
      // Ana iş parçacığı bekçisi: bütçe + tolerans içinde yanıt gelmezse
      // daemon infaz edilir ve iş yedek motorda tamamlanır.
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

  /** Servisi yeniden başlatır: daemon tekrar kurulmayı dener. */
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

  const romListesi = useMemo(() => ROM_SEED, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] px-3 py-2 font-osmono text-[11px] text-[var(--tb-muted)]">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-[var(--tb-cyan-400)]">
            Faz 1 — Çekirdek Doğrulama Motoru Aktif (Çevrimiçi)
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
          className="h-7 shrink-0 border-[var(--tb-cyan-400)] px-2 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-cyan-400)]"
        >
          Servisi Yeniden Başlat
        </Button>
      </div>

      <MemoryProfiler ram={ram} rom={rom} heap={heap} mode={mode} />

      <div
        ref={hostRef}
        className="relative h-56 shrink-0 overflow-hidden rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] sm:h-64"
      >
        <canvas ref={glRef} className="absolute inset-0 block" />
        <canvas ref={textRef} className="absolute inset-0 block" />
      </div>

      <CommandBar busy={busy} onSubmit={submit} />

      {hata ? (
        <div
          role="alert"
          className="rounded-lg border border-[var(--tb-rose-400)] bg-[var(--tb-bg-soft)] px-3 py-2 font-osmono text-[11px] text-[var(--tb-rose-400)]"
        >
          <div className="break-words">Çözümleme tamamlanamadı: {hata}</div>
          {yerel ? (
            <div className="mt-1 text-[var(--tb-muted)]">
              Yerel motor etkin: çözümleme ve doğrulama ana iş parçacığında güvenli biçimde sürüyor.
            </div>
          ) : null}
          <Button
            type="button"
            onClick={restart}
            variant="outline"
            className="mt-2 border-[var(--tb-cyan-400)] font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-cyan-400)]"
          >
            Servisi yeniden başlat
          </Button>
        </div>
      ) : null}

      {/* Sekmeler: konsol dışındaki katmanlar isteğe bağlı açılır. */}
      <div role="tablist" aria-label="AXIOM" className="flex flex-wrap gap-1">
        {(["console", "billing", "network", "sdk"] as const).map((id) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={sekme === id}
            onClick={() => setSekme(id)}
            variant="outline"
            className="h-7 rounded-lg px-3 py-1 font-osmono text-[11px] uppercase tracking-wide"
            style={{
              borderColor: sekme === id ? "var(--tb-cyan-400)" : "var(--tb-border)",
              color: sekme === id ? "var(--tb-cyan-400)" : "var(--tb-muted)",
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

      {sekme !== "console" ? null : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <LanguageCard lang={analysis?.lang ?? null} />
            <NodeStatusCard onOpenLicense={() => setLisans(true)} />
          </div>

          <AstView ast={analysis?.ast ?? null} metrics={analysis?.metrics ?? null} />

          <InvariantMatrix matches={analysis?.matches ?? []} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={runVerify}
              disabled={verifying || !lastText.trim()}
              variant="outline"
              className="border-[var(--tb-cyan-400)] font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-cyan-400)] disabled:opacity-40"
            >
              {verifying ? "Doğrulanıyor…" : "Doğrula"}
            </Button>
            <Button
              type="button"
              onClick={restart}
              variant="outline"
              className="border-[var(--tb-border)] font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
            >
              Servisi Yeniden Başlat
            </Button>
            <span className="font-osmono text-[10px] text-[var(--tb-muted)]">
              Sert zaman sınırı 500 ms · aşılırsa doğrulama kesilir ve zaman aşımı bildirilir
            </span>
          </div>

          <VerifyBoundary>
            <ProofViewer result={proof} />
          </VerifyBoundary>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
              <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
                Bayt çözümlemesi (ASK ASCII/1.0)
              </div>
              {digest ? (
                <dl className="mt-2 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--tb-muted)]">Bayt / karakter</dt>
                    <dd>
                      {digest.bytes} / {digest.chars}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--tb-muted)]">Saf ASCII</dt>
                    <dd>{digest.ascii ? "evet" : "hayır (UTF-8 çok baytlı)"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--tb-muted)]">Parmak izi</dt>
                    <dd>{digest.fingerprint}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--tb-muted)]">İlk 16 bayt</dt>
                    <dd className="break-all">{digest.head || "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">
                  Çözümleme için bir metin gönderin.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
              <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
                Değişmez aksiyom tabanı (salt-okunur)
              </div>
              <ul className="mt-2 space-y-2">
                {romListesi.map((b) => (
                  <li key={b.key} className="font-osmono text-[11px]">
                    <div className="text-[var(--tb-text)]">{b.label}</div>
                    <div className="text-[var(--tb-muted)]">{b.body}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <LicenseModal open={lisans} peers={node.peers} onClose={() => setLisans(false)} />

      <div className="pt-1 text-center font-osmono text-[10px] text-[var(--tb-muted)]">
        {AXIOM_BRAND_BANNER}
      </div>
    </div>
  );
}
