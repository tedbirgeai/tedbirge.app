/**
 * FAZ D — PAYLAŞIMLI HALKA TAMPON (SharedArrayBuffer + Atomics)
 * ------------------------------------------------------------------
 * Ana iş parçacığı ile çekirdek işçisi arasındaki ikili çerçeveleri
 * kopyasız taşımak için tek-yazar/tek-okur (SPSC) halka tampon.
 *
 * Düzen (tek SharedArrayBuffer):
 *   [0..32)   kontrol alanı — Int32Array(8)
 *             [0] yazma imleci (head)
 *             [1] okuma imleci (tail)
 *             [2] uyandırma sayacı (Atomics.wait/notify hedefi)
 *   [32..N)   veri alanı — kayıtlar: [u32 uzunluk][gövde]
 *             Sığmayan sarma durumunda 0xFFFFFFFF işaretçisi yazılır.
 *
 * `crossOriginIsolated` kapalıysa SharedArrayBuffer yoktur; çağıran
 * taraf eski `postMessage` + Transferable yoluna düşer (bkz. köprü).
 */

const CTRL_BYTES = 32;
const HEAD = 0;
const TAIL = 1;
const SIGNAL = 2;
const WRAP_MARKER = 0xffffffff;
const LEN_BYTES = 4;

/** Ortam paylaşımlı belleği destekliyor mu? (COOP/COEP + SAB) */
export function sharedMemoryAvailable(): boolean {
  if (typeof SharedArrayBuffer === "undefined") return false;
  const iso = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
  return iso === true;
}

export class SharedRing {
  readonly sab: SharedArrayBuffer;
  private ctrl: Int32Array;
  private data: Uint8Array;
  private view: DataView;
  private capacity: number;

  private constructor(sab: SharedArrayBuffer) {
    this.sab = sab;
    this.ctrl = new Int32Array(sab, 0, CTRL_BYTES / 4);
    this.data = new Uint8Array(sab, CTRL_BYTES);
    this.view = new DataView(sab, CTRL_BYTES);
    this.capacity = this.data.byteLength;
  }

  /** Yeni halka oluşturur (varsayılan 1 MiB veri alanı). */
  static create(dataBytes = 1024 * 1024): SharedRing {
    const sab = new SharedArrayBuffer(CTRL_BYTES + dataBytes);
    return new SharedRing(sab);
  }

  /** Karşı taraftan gelen tampona bağlanır. */
  static attach(sab: SharedArrayBuffer): SharedRing {
    return new SharedRing(sab);
  }

  private freeBytes(head: number, tail: number): number {
    // Bir bayt boş bırakılır: dolu/boş ayrımı için.
    return tail > head ? tail - head - 1 : this.capacity - head + tail - 1;
  }

  /** Kayıt yazar. Yer yoksa `false` döner (çağıran postMessage'a düşer). */
  push(bytes: Uint8Array): boolean {
    const need = LEN_BYTES + bytes.byteLength;
    let head = Atomics.load(this.ctrl, HEAD);
    const tail = Atomics.load(this.ctrl, TAIL);
    if (need + LEN_BYTES >= this.capacity) return false;
    if (this.freeBytes(head, tail) < need + LEN_BYTES) return false;

    // Başlık + gövde bitişik sığmıyorsa sarma işaretçisi bırak.
    if (head + need > this.capacity) {
      if (head + LEN_BYTES <= this.capacity) this.view.setUint32(head, WRAP_MARKER, true);
      head = 0;
      if (this.freeBytes(head, tail) < need) return false;
    }

    this.view.setUint32(head, bytes.byteLength, true);
    this.data.set(bytes, head + LEN_BYTES);
    const next = (head + need) % this.capacity;
    Atomics.store(this.ctrl, HEAD, next);
    Atomics.add(this.ctrl, SIGNAL, 1);
    Atomics.notify(this.ctrl, SIGNAL);
    return true;
  }

  /** Sıradaki kaydı okur; yoksa `null`. */
  pop(): Uint8Array | null {
    let tail = Atomics.load(this.ctrl, TAIL);
    const head = Atomics.load(this.ctrl, HEAD);
    if (tail === head) return null;

    if (tail + LEN_BYTES <= this.capacity && this.view.getUint32(tail, true) === WRAP_MARKER) {
      tail = 0;
      Atomics.store(this.ctrl, TAIL, 0);
      if (tail === head) return null;
    }
    const len = this.view.getUint32(tail, true);
    if (len === WRAP_MARKER) return null;
    const start = tail + LEN_BYTES;
    // Kopya kaçınılmaz değil: paylaşımlı bellekten yalnızca bir kez alınır.
    const out = this.data.slice(start, start + len);
    Atomics.store(this.ctrl, TAIL, (start + len) % this.capacity);
    return out;
  }

  /** Veri gelene kadar bekler (işçi tarafı: bloklamayan `waitAsync`). */
  async waitForData(timeoutMs = 50): Promise<void> {
    const seen = Atomics.load(this.ctrl, SIGNAL);
    if (Atomics.load(this.ctrl, HEAD) !== Atomics.load(this.ctrl, TAIL)) return;
    const waitAsync = (
      Atomics as unknown as {
        waitAsync?: (
          arr: Int32Array,
          i: number,
          v: number,
          t: number,
        ) => { async: boolean; value: Promise<string> | string };
      }
    ).waitAsync;
    if (waitAsync) {
      const res = waitAsync(this.ctrl, SIGNAL, seen, timeoutMs);
      if (res.async) await res.value;
      return;
    }
    await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 4)));
  }

  /** Test/teşhis: anlık doluluk (bayt). */
  usedBytes(): number {
    const head = Atomics.load(this.ctrl, HEAD);
    const tail = Atomics.load(this.ctrl, TAIL);
    return head >= tail ? head - tail : this.capacity - tail + head;
  }
}
