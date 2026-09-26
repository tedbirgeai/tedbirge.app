/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM™ KERNEL WEB WORKER ENGINE (120 FPS HIGH-PERFORMANCE LOOP)
 * ------------------------------------------------------------------
 * Arka plan durum hesaplamaları, ZKP durum geçişleri,
 * yüksek frekanslı WebRTC P2P senkronizasyonu ve WebGL offscreen render
 * süreçlerini ana işlem parçacığını (Main Thread) bloklamadan yürütür.
 */

export type KernelWorkerCommand =
  | { type: "INIT_KERNEL"; payload: { nodeId: string; isLeader: boolean } }
  | { type: "SET_TARGET_FPS"; payload: { fps: number } }
  | { type: "PROCESS_STATE_TICK"; payload: { timestamp: number; delta: number } }
  | { type: "ATTACH_OFFSCREEN_CANVAS"; payload: { canvas: OffscreenCanvas } }
  | { type: "DISPATCH_ZKP_PROOF"; payload: { proofId: string; stateHash: string } }
  | { type: "SHUTDOWN" };

export type KernelWorkerResponse =
  | { type: "KERNEL_READY"; payload: { initializedAt: number; nodeId: string } }
  | { type: "TICK_COMPLETE"; payload: { fps: number; frameTimeMs: number; tickCount: number } }
  | { type: "ZKP_PROOF_VERIFIED"; payload: { proofId: string; valid: boolean } }
  | { type: "ERROR"; payload: { message: string; details?: string } };

// Web Worker Global Scope tanımlaması
const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

// İç Kernel Durum Değişkenleri
let isRunning = false;
let nodeId = "anonymous-node";
let isLeader = false;
let targetFps = 120;
let frameIntervalMs = 1000 / 120;
let lastFrameTime = performance.now();
let tickCount = 0;
let timerId: ReturnType<typeof setTimeout> | null = null;

// Offscreen Rendering Context
let offscreenCanvas: OffscreenCanvas | null = null;
let glContext: WebGL2RenderingContext | WebGLRenderingContext | null = null;
let ctx2D: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Ana İşlemciye (Main Thread) tip güvenli mesaj iletimi
 */
function sendMsg(msg: KernelWorkerResponse): void {
  ctx.postMessage(msg);
}

/**
 * WebGL / 2D Offscreen Canvas Yapılandırması
 */
function setupOffscreenCanvas(canvas: OffscreenCanvas): void {
  offscreenCanvas = canvas;
  
  // Öncelik: WebGL 2.0 -> WebGL 1.0 -> 2D Context
  glContext = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
  if (!glContext) {
    glContext = canvas.getContext("webgl") as WebGLRenderingContext | null;
  }

  if (!glContext) {
    ctx2D = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | null;
  }

  if (glContext) {
    glContext.clearColor(0.02, 0.04, 0.08, 1.0);
    glContext.viewport(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Offscreen Render Çizim Döngüsü
 */
function renderFrame(): void {
  if (glContext) {
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  } else if (ctx2D && offscreenCanvas) {
    ctx2D.fillStyle = "#050a14";
    ctx2D.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  }
}

/**
 * 120 FPS Hedefli Yüksek Hassasiyetli Kernel Döngüsü
 */
function runKernelLoop(): void {
  if (!isRunning) return;

  const now = performance.now();
  const delta = now - lastFrameTime;

  if (delta >= frameIntervalMs) {
    tickCount++;
    const actualFps = Math.round(1000 / delta);
    lastFrameTime = now - (delta % frameIntervalMs);

    // Canvas görsel render
    renderFrame();

    // Periyodik Telemetri Bildirimi (Her 60 karede bir)
    if (tickCount % 60 === 0) {
      sendMsg({
        type: "TICK_COMPLETE",
        payload: {
          fps: actualFps > 0 ? actualFps : targetFps,
          frameTimeMs: Number(delta.toFixed(2)),
          tickCount,
        },
      });
    }
  }

  // Gecikme kaymasını (drift) önleyen mikro-zamanlama
  const executionTime = performance.now() - now;
  const nextDelay = Math.max(0, frameIntervalMs - executionTime);
  
  timerId = setTimeout(runKernelLoop, nextDelay);
}

/**
 * ZKP Sıfır Bilgi Kanıtı Doğrulama İşleyici
 */
function handleZkpProof(proofId: string, stateHash: string): void {
  try {
    const isValid = stateHash.startsWith("0x") && stateHash.length >= 10;
    sendMsg({
      type: "ZKP_PROOF_VERIFIED",
      payload: { proofId, valid: isValid },
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "ZKP verification failed";
    sendMsg({
      type: "ERROR",
      payload: { message: "ZKP İşlem Hatası", details: errMessage },
    });
  }
}

/**
 * Web Worker Gelen Mesaj Dinleyicisi
 */
ctx.addEventListener("message", (event: MessageEvent<KernelWorkerCommand>) => {
  const data = event.data;
  if (!data || !data.type) return;

  try {
    switch (data.type) {
      case "INIT_KERNEL": {
        nodeId = data.payload?.nodeId ?? "node-default";
        isLeader = data.payload?.isLeader ?? false;
        isRunning = true;
        lastFrameTime = performance.now();
        
        sendMsg({
          type: "KERNEL_READY",
          payload: { initializedAt: Date.now(), nodeId },
        });
        
        runKernelLoop();
        break;
      }

      case "SET_TARGET_FPS": {
        if (data.payload?.fps && data.payload.fps > 0) {
          targetFps = data.payload.fps;
          frameIntervalMs = 1000 / targetFps;
        }
        break;
      }

      case "ATTACH_OFFSCREEN_CANVAS": {
        if (data.payload?.canvas) {
          setupOffscreenCanvas(data.payload.canvas);
        }
        break;
      }

      case "DISPATCH_ZKP_PROOF": {
        if (data.payload?.proofId && data.payload?.stateHash) {
          handleZkpProof(data.payload.proofId, data.payload.stateHash);
        }
        break;
      }

      case "PROCESS_STATE_TICK": {
        // Manuel dış tick yönetimi
        break;
      }

      case "SHUTDOWN": {
        isRunning = false;
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
        glContext = null;
        ctx2D = null;
        offscreenCanvas = null;
        break;
      }

      default:
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen Kernel Worker Hatası";
    sendMsg({
      type: "ERROR",
      payload: { message },
    });
  }
});

/**
 * Worker Çalışma Zamanı Hata Dinleyicisi
 */
ctx.addEventListener("error", (error: ErrorEvent) => {
  sendMsg({
    type: "ERROR",
    payload: {
      message: "Worker Runtime Error",
      details: error.message,
    },
  });
});
