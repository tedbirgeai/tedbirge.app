/**
 * MEDYA İŞ PARÇACIĞI (media.worker)
 * ------------------------------------------------------------------
 * Ağır iş ana iş parçacığından tahliye edilir: base64'e çevirme ve
 * parçalama burada yapılır, arayüz 60 FPS akıcılığını korur.
 * Ana thread yalnız Blob gönderir, ilerleme ve hazır parçaları alır.
 */

export type MediaWorkerRequest = {
  id: string;
  mid: string;
  convId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  chunkSize: number;
};

export type MediaWorkerResponse =
  | { id: string; type: "progress"; percent: number }
  | { id: string; type: "done"; dataUrl: string; parts: string[] }
  | { id: string; type: "error"; message: string };

function toDataUrl(mime: string, bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return `data:${mime || "application/octet-stream"};base64,${btoa(binary)}`;
}

self.onmessage = async (event: MessageEvent<MediaWorkerRequest>) => {
  const req = event.data;
  const post = (msg: MediaWorkerResponse) => (self as unknown as Worker).postMessage(msg);
  try {
    const buffer = await req.blob.arrayBuffer();
    post({ id: req.id, type: "progress", percent: 25 });
    const dataUrl = toDataUrl(req.mime, new Uint8Array(buffer));
    post({ id: req.id, type: "progress", percent: 60 });
    const total = Math.max(1, Math.ceil(dataUrl.length / req.chunkSize));
    const parts: string[] = [];
    for (let i = 0; i < total; i += 1) {
      parts.push(dataUrl.slice(i * req.chunkSize, (i + 1) * req.chunkSize));
      if ((i + 1) % 32 === 0) {
        post({ id: req.id, type: "progress", percent: 60 + Math.round((i / total) * 39) });
      }
    }
    post({ id: req.id, type: "done", dataUrl, parts });
  } catch (err) {
    post({ id: req.id, type: "error", message: (err as Error)?.message ?? "Medya işlenemedi" });
  }
};
