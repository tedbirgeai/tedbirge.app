/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL WORKER REACT HOOK
 * ------------------------------------------------------------------
 * Main Thread ile kernel.worker.ts arasındaki çift yönlü mesajlaşmayı,
 * Offscreen Canvas transferini ve ZKP kanıt doğrulama süreçlerini yönetir.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { KernelWorkerCommand, KernelWorkerResponse } from "../workers/kernel.worker";

export interface KernelTelemetry {
  fps: number;
  frameTimeMs: number;
  tickCount: number;
}

export interface ZkpVerificationResult {
  proofId: string;
  valid: boolean;
  timestamp: number;
}

export interface UseKernelWorkerOptions {
  nodeId?: string;
  isLeader?: boolean;
  targetFps?: number;
  autoStart?: boolean;
}

export interface UseKernelWorkerReturn {
  isReady: boolean;
  error: string | null;
  telemetry: KernelTelemetry;
  lastZkpResult: ZkpVerificationResult | null;
  setFps: (fps: number) => void;
  attachCanvas: (canvas: HTMLCanvasElement | null) => boolean;
  dispatchZkpProof: (proofId: string, stateHash: string) => void;
  restartWorker: () => void;
}

export function useKernelWorker(options: UseKernelWorkerOptions = {}): UseKernelWorkerReturn {
  const {
    nodeId = "axiom-node-main",
    isLeader = false,
    targetFps = 120,
    autoStart = true,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const canvasTransferredRef = useRef<boolean>(false);

  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastZkpResult, setLastZkpResult] = useState<ZkpVerificationResult | null>(null);
  const [telemetry, setTelemetry] = useState<KernelTelemetry>({
    fps: 0,
    frameTimeMs: 0,
    tickCount: 0,
  });

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        const shutdownCmd: KernelWorkerCommand = { type: "SHUTDOWN" };
        workerRef.current.postMessage(shutdownCmd);
      } catch {
        // Sonlandırma sırasında oluşan hataları yut
      }
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsReady(false);
    canvasTransferredRef.current = false;
  }, []);

  const initWorker = useCallback(() => {
    terminateWorker();

    if (typeof window === "undefined" || typeof Worker === "undefined") {
      setError("Web Worker desteği bu çalışma zamanı ortamında mevcut değil.");
      return;
    }

    try {
      // Vite / Webpack Web Worker modül yükleme kurgusu
      const workerInstance = new Worker(
        new URL("../workers/kernel.worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current = workerInstance;

      workerInstance.onmessage = (event: MessageEvent<KernelWorkerResponse>) => {
        const data = event.data;
        if (!data || !data.type) return;

        switch (data.type) {
          case "KERNEL_READY":
            setIsReady(true);
            setError(null);
            break;

          case "TICK_COMPLETE":
            setTelemetry({
              fps: data.payload.fps,
              frameTimeMs: data.payload.frameTimeMs,
              tickCount: data.payload.tickCount,
            });
            break;

          case "ZKP_PROOF_VERIFIED":
            setLastZkpResult({
              proofId: data.payload.proofId,
              valid: data.payload.valid,
              timestamp: Date.now(),
            });
            break;

          case "ERROR":
            setError(data.payload.message || "Bilinmeyen worker hatası");
            break;

          default:
            break;
        }
      };

      workerInstance.onerror = (errEvent: ErrorEvent) => {
        setError(errEvent.message || "Kernel Worker çalıştırma hatası oluştu.");
      };

      // İlk ilklendirme mesajını gönder
      const initCmd: KernelWorkerCommand = {
        type: "INIT_KERNEL",
        payload: { nodeId, isLeader },
      };
      workerInstance.postMessage(initCmd);

      // Varsayılan FPS ayarını yap
      if (targetFps !== 120) {
        const fpsCmd: KernelWorkerCommand = {
          type: "SET_TARGET_FPS",
          payload: { fps: targetFps },
        };
        workerInstance.postMessage(fpsCmd);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Worker yüklenirken hata oluştu.";
      setError(msg);
    }
  }, [nodeId, isLeader, targetFps, terminateWorker]);

  useEffect(() => {
    if (autoStart) {
      initWorker();
    }
    return () => {
      terminateWorker();
    };
  }, [autoStart, initWorker, terminateWorker]);

  // Target FPS değiştirme fonksiyonu
  const setFps = useCallback((fps: number) => {
    if (workerRef.current && fps > 0) {
      const cmd: KernelWorkerCommand = {
        type: "SET_TARGET_FPS",
        payload: { fps },
      };
      workerRef.current.postMessage(cmd);
    }
  }, []);

  // HTML Canvas elementini OffscreenCanvas olarak Worker'a devretme
  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas || !workerRef.current) return false;
    if (canvasTransferredRef.current) return false;

    if (!("transferControlToOffscreen" in canvas)) {
      console.warn("Bu tarayıcı OffscreenCanvas transferini desteklemiyor.");
      return false;
    }

    try {
      const offscreen = canvas.transferControlToOffscreen();
      const cmd: KernelWorkerCommand = {
        type: "ATTACH_OFFSCREEN_CANVAS",
        payload: { canvas: offscreen },
      };
      workerRef.current.postMessage(cmd, [offscreen]);
      canvasTransferredRef.current = true;
      return true;
    } catch (err: unknown) {
      console.error("Offscreen Canvas aktarım hatası:", err);
      return false;
    }
  }, []);

  // ZKP kanıt doğrulama talebi gönderme
  const dispatchZkpProof = useCallback((proofId: string, stateHash: string) => {
    if (workerRef.current && proofId && stateHash) {
      const cmd: KernelWorkerCommand = {
        type: "DISPATCH_ZKP_PROOF",
        payload: { proofId, stateHash },
      };
      workerRef.current.postMessage(cmd);
    }
  }, []);

  return {
    isReady,
    error,
    telemetry,
    lastZkpResult,
    setFps,
    attachCanvas,
    dispatchZkpProof,
    restartWorker: initWorker,
  };
}

export default useKernelWorker;
