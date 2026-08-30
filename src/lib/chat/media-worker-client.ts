/**
 * MEDYA WORKER İSTEMCİSİ
 * ------------------------------------------------------------------
 * Parçalama işini arka plan iş parçacığına verir; worker desteklenmiyorsa
 * (eski tarayıcı, test ortamı) mevcut asenkron ana-thread yoluna düşer.
 */

import { CHUNK_SIZE, fileToDataUrl, splitMediaAsync, type MediaChunk } from "@/lib/chat/media";
import type { MediaWorkerRequest, MediaWorkerResponse } from "@/workers/media.worker";

let worker: Worker | null = null;
let unsupported = false;

function getWorker(): Worker | null {
  if (unsupported || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("@/workers/media.worker.ts", import.meta.url), { type: "module" });
    return worker;
  } catch {
    unsupported = true;
    return null;
  }
}

export type PreparedMedia = { chunks: MediaChunk[]; dataUrl: string };

export async function prepareMedia(
  input: { mid: string; convId: string; name: string; mime: string; size: number; blob: Blob },
  onProgress?: (percent: number) => void,
): Promise<PreparedMedia> {
  const w = getWorker();
  if (!w) {
    const dataUrl = await fileToDataUrl(input.blob);
    const chunks = await splitMediaAsync({ ...input, dataUrl }, onProgress);
    return { chunks, dataUrl };
  }

  const id = `${input.mid}:${Date.now()}`;
  return new Promise<PreparedMedia>((resolve, reject) => {
    const onMessage = (event: MessageEvent<MediaWorkerResponse>) => {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === "progress") {
        onProgress?.(msg.percent);
        return;
      }
      w.removeEventListener("message", onMessage);
      if (msg.type === "error") {
        reject(new Error(msg.message));
        return;
      }
      onProgress?.(100);
      const ts = Date.now();
      resolve({
        dataUrl: msg.dataUrl,
        chunks: msg.parts.map((data, idx) => ({
          t: "media-chunk" as const,
          mid: input.mid,
          convId: input.convId,
          name: input.name,
          mime: input.mime,
          size: input.size,
          idx,
          total: msg.parts.length,
          data,
          ts,
        })),
      });
    };
    w.addEventListener("message", onMessage);
    const req: MediaWorkerRequest = {
      id,
      mid: input.mid,
      convId: input.convId,
      name: input.name,
      mime: input.mime,
      size: input.size,
      blob: input.blob,
      chunkSize: CHUNK_SIZE,
    };
    w.postMessage(req);
  });
}
