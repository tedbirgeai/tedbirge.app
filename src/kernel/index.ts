/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL SYSTEM BARREL EXPORT
 * ------------------------------------------------------------------
 * Tedbirge WebOS mikro-çekirdek ekosisteminin tüm modüllerini,
 * tip tanımlarını, IPC kanallarını ve servislerini dışa aktaran ana katalog.
 */

// Çekirdek iç modüllerinin dışa aktarımı
export * from "./capabilities";
export * from "./telemetry";
export * from "./ipc";
export * from "./kernel-worker-bridge";

// React Hook ve Entegrasyon Katmanı
export {
  useKernelEngine,
  type KernelTelemetryData,
  type UseKernelEngineOptions,
  type UseKernelEngineReturn,
} from "../hooks/useKernelEngine";

// Arayüz Görselleştirme Bileşeni
export { KernelMonitor, type KernelMonitorProps } from "../components/KernelMonitor";

// Sabitler ve Sistem Tanımları
export const AXIOM_KERNEL_VERSION = "2026.9.0";
export const AXIOM_DEFAULT_TARGET_FPS = 120;
export const AXIOM_IPC_CHANNEL_NAME = "axiom-kernel-ipc-v1";

/**
 * Çekirdek Çalışma Zamanı Destek Kontrolü (Capability Detector)
 */
export const checkKernelCapabilities = (): {
  hasSharedArrayBuffer: boolean;
  hasWorkerSupport: boolean;
  hasWebGL2: boolean;
  hasWebGPU: boolean;
} => {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const hasWorkerSupport = typeof Worker !== "undefined";

  let hasWebGL2 = false;
  let hasWebGPU = false;

  if (typeof window !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      hasWebGL2 = !!canvas.getContext("webgl2");
      hasWebGPU = "gpu" in navigator;
    } catch {
      hasWebGL2 = false;
      hasWebGPU = false;
    }
  }

  return {
    hasSharedArrayBuffer,
    hasWorkerSupport,
    hasWebGL2,
    hasWebGPU,
  };
};

export default {
  version: AXIOM_KERNEL_VERSION,
  checkCapabilities: checkKernelCapabilities,
};
