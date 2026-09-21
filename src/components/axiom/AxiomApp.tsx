/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM KERNEL v12 — KONSOL PENCERESİ (FAZ 1)
 * ------------------------------------------------------------------
 * Bu faz çekirdek iskeletidir: sanal ROM (değişmez aksiyom tabanı),
 * sanal RAM (50 MB sert sınırlı LRU önbellek), Web Worker daemon'ı ve
 * parametrik WebGL2 çizim yüzeyi. Doğrulama motoru (Z3 / Lean) henüz
 * bağlı değildir; arayüz bunu açıkça yazar ve hiçbir çıktı "kanıt"
 * olarak sunulmaz.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AstView } from "@/components/axiom/AstView";
import { CommandBar } from "@/components/axiom/CommandBar";
import { InvariantMatrix } from "@/components/axiom/InvariantMatrix";
import { LanguageCard } from "@/components/axiom/LanguageCard";
import { MemoryProfiler } from "@/components/axiom/MemoryProfiler";
import { NodeStatusCard } from "@/components/axiom/NodeStatusCard";
import { ProofViewer } from "@/components/axiom/ProofViewer";
import { VerifyBoundary } from "@/components/axiom/VerifyBoundary";
import type { KernelAnalysis } from "@/lib/axiom/analyze";
import { AXIOM_BRAND_BANNER, AXIOM_RAM_LIMIT } from "@/lib/axiom/brand";
import { createRenderer, type Renderer } from "@/lib/axiom/canvas/renderer";
import type { ByteDigest } from "@/lib/axiom/digest";
import type { KernelRequest, KernelResponse } from "@/lib/axiom/kernel.worker";
import { localAnalyze, localStats, localVerify } from "@/lib/axiom/local-kernel";
import { sampleMemory, type MemorySample } from "@/lib/axiom/profiler";
import type { RamStats } from "@/lib/axiom/ram";
import { ROM_SEED, romStatus, seedRom, type RomStatus } from "@/lib/axiom/rom";
import type { VerifyResult } from "@/lib/axiom/verify/types";


const BOS_RAM: RamStats = {
  used: 0,
  limit: AXIOM_RAM_LIMIT,
  entries: 0,
  evicted: 0,
  ratio: 0,
};

export function AxiomApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const seqRef = useRef(0);
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
  /** Yeniden başlatma düğmesi bu sayacı arttırır. */
  const [deneme, setDeneme] = useState(0);

  // --- Çekirdek daemon'ı: bayt çözümlemesi ana iş parçacığını kilitlemez.
  useEffect(() => {
    let worker: Worker | null = null;
    const dus = (sebep: string) => {
      // Daemon kurulamadı: arayüz çökmez, aynı motor ana iş parçacığında çalışır.
      worker?.terminate();
      worker = null;
      workerRef.current = null;
      setYerel(true);
      setRam(localStats());
      setHata(sebep);
      setVerifying(false);
      setBusy(false);
    };
    try {
      // Vite yalnız gerçek göreli yolu çözer; takma ad (@/) burada çalışmaz.
      worker = new Worker(new URL("../../lib/axiom/kernel.worker.ts", import.meta.url), {
        type: "module",
      });
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
    worker.onmessage = (event: MessageEvent<KernelResponse>) => {
      const msg = event.data;
      setRam(msg.ram);
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
    return () => {
      worker?.terminate();
      workerRef.current = null;
    };
  }, [deneme]);


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
        status: "Faz 1 — doğrulama motoru bağlı değil (iskelet)",
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

  /** Doğrulama: aynı girdi simgesel motora gönderilir (500 ms sert bütçe). */
  const runVerify = useCallback(() => {
    if (!lastText.trim()) return;
    setVerifying(true);
    const worker = workerRef.current;
    if (worker) {
      const msg: KernelRequest = { id: (seqRef.current += 1), type: "verify", text: lastText };
      worker.postMessage(msg);
      return;
    }
    void localVerify(lastText)
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
  }, [lastText]);

  /** Servisi yeniden başlatır: daemon tekrar kurulmayı dener. */
  const restart = useCallback(() => {
    setHata(null);
    setProof(null);
    setYerel(false);
    setBusy(false);
    setVerifying(false);
    setDeneme((n) => n + 1);
  }, []);


  const romListesi = useMemo(() => ROM_SEED, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] px-3 py-2 font-osmono text-[11px] text-[var(--tb-muted)]">
        Faz 3: çoklu dil tanıma, ASK ASCII/1.0 yapı ağacı, ortak ara gösterim ve değişmez eşleştirme
        etkin. Simgesel doğrulama katmanı (Z3 / Lean 4) bağlıdır; WASM ikilisi yüklü değilken karar
        mock motordan gelir ve mühür "simülasyon" olarak işaretlenir.
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
              Yedek motor etkin: çözümleme ve doğrulama ana iş parçacığında sürüyor, sonuçlar aynıdır.
            </div>
          ) : null}
          <button
            type="button"
            onClick={restart}
            className="mt-2 rounded-lg border border-[var(--tb-cyan-400)] px-3 py-1 font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-cyan-400)]"
          >
            Servisi yeniden başlat
          </button>
        </div>
      ) : null}


      <div className="grid gap-3 lg:grid-cols-2">
        <LanguageCard lang={analysis?.lang ?? null} />
        <NodeStatusCard />
      </div>

      <AstView ast={analysis?.ast ?? null} metrics={analysis?.metrics ?? null} />

      <InvariantMatrix matches={analysis?.matches ?? []} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runVerify}
          disabled={verifying || !lastText.trim()}
          className="rounded-lg border border-[var(--tb-cyan-400)] px-3 py-1.5 font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-cyan-400)] disabled:opacity-40"
        >
          {verifying ? "Doğrulanıyor…" : "Doğrula"}
        </button>
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

      <div className="pt-1 text-center font-osmono text-[10px] text-[var(--tb-muted)]">
        {AXIOM_BRAND_BANNER}
      </div>
    </div>
  );
}
