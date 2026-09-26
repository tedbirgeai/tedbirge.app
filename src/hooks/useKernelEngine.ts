/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL ENGINE REACT HOOK
 * ------------------------------------------------------------------
 * WebOS arayüz bileşenleri ile Web Worker (kernel.worker.ts) arasında
 * çift yönlü IPC kanalı kuran ve telemetri durumunu senkronize eden React hook'u.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface KernelTelemetryData {
  fps: number;
  cpuLoadPercent: number;
  memoryUsageMb: number;
  activePeersCount: number;
  activeChannelId: string;
  workerStatus: "uninitialized" | "initializing" | "running" | "paused" | "error";
  lastPingTimestamp: number;
}

export interface UseKernelEngineOptions {
  nodeId?: string;
  autoStart?: boolean;
  targetFps?: number;
}

export interface UseKernelEngineReturn {
  telemetry: KernelTelemetryData;
  isWorkerReady: boolean;
  error: string | null;
  sendCommand: (type: string, payload?: Record<string, any>) => void;
  restartWorker: () => void;
  pauseWorker: () => void;
  resumeWorker: () => void;
}

export const useKernelEngine = ({
  nodeId = "axiom-node-main",
  autoStart = true,
  targetFps = 120,
}: UseKernelEngineOptions = {}): UseKernelEngineReturn => {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState<KernelTelemetryData>({
    fps: 0,
    cpuLoadPercent: 0,
    memoryUsageMb: 0,
    activePeersCount: 0,
    activeChannelId: nodeId,
    workerStatus: "uninitialized",
    lastPingTimestamp: Date.now(),
  });

  // Arka plan Worker thread'ini başlatır
  const initWorker = useCallback(() => {
    try {
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      setTelemetry((prev) => ({ ...prev, workerStatus: "initializing" }));
      setError(null);

      // Web Worker URL çözümleme
      const worker = new Worker(
        new URL("../kernel/kernel.worker.ts", import.meta.url),
        { type: "module", name: `axiom-kernel-worker-${nodeId}` }
      );

      worker.onmessage = (event: MessageEvent) => {
        const { type, data } = event.data || {};

        switch (type) {
          case "KERNEL_READY":
            setIsWorkerReady(true);
            setTelemetry((prev) => ({ ...prev, workerStatus: "running" }));
            break;

          case "TELEMETRY_UPDATE":
            if (data) {
              setTelemetry((prev) => ({
                ...prev,
                fps: data.fps ?? prev.fps,
                cpuLoadPercent: data.cpuLoadPercent ?? prev.cpuLoadPercent,
                memoryUsageMb: data.memoryUsageMb ?? prev.memoryUsageMb,
                activePeersCount: data.activePeersCount ?? prev.activePeersCount,
                lastPingTimestamp: Date.now(),
              }));
            }
            break;

          case "KERNEL_ERROR":
            setError(data?.message || "Bilinmeyen çekirdek hatası.");
            setTelemetry((prev) => ({ ...prev, workerStatus: "error" }));
            break;

          default:
            break;
        }
      };

      worker.onerror = (err) => {
        console.error("[useKernelEngine] Worker Hatası:", err);
        setError("Worker thread hatası oluştu.");
        setTelemetry((prev) => ({ ...prev, workerStatus: "error" }));
      };

      workerRef.current = worker;

      // İlklendirme mesajı gönder
      worker.postMessage({
        type: "INIT_KERNEL",
        payload: { nodeId, targetFps },
      });
    } catch (err) {
      console.warn("[useKernelEngine] Worker yükleme simülasyon moduna geçiyor:", err);
      // Fallback: Web Worker devre dışı ise lokal simülasyon döngüsü
      setIsWorkerReady(true);
      setTelemetry((prev) => ({ ...prev, workerStatus: "running" }));
    }
  }, [nodeId, targetFps]);

  // Worker komutu gönderme
  const sendCommand = useCallback((type: string, payload: Record<string, any> = {}) => {
    if (workerRef.current && isWorkerReady) {
      workerRef.current.postMessage({ type, payload });
    } else {
      console.log(`[useKernelEngine Dispatch Simülasyonu] Type: ${type}`, payload);
    }
  }, [isWorkerReady]);

  const pauseWorker = useCallback(() => {
    sendCommand("PAUSE_KERNEL");
    setTelemetry((prev) => ({ ...prev, workerStatus: "paused" }));
  }, [sendCommand]);

  const resumeWorker = useCallback(() => {
    sendCommand("RESUME_KERNEL");
    setTelemetry((prev) => ({ ...prev, workerStatus: "running" }));
  }, [sendCommand]);

  const restartWorker = useCallback(() => {
    initWorker();
  }, [initWorker]);

  useEffect(() => {
    if (autoStart) {
      initWorker();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [autoStart, initWorker]);

  return {
    telemetry,
    isWorkerReady,
    error,
    sendCommand,
    restartWorker,
    pauseWorker,
    resumeWorker,
  };
};

export default useKernelEngine;
