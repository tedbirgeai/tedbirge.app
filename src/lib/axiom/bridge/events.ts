/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * OLAY AKIŞI (Event-Driven Interrupts)
 * ------------------------------------------------------------------
 * Sistem tarafı (yerel soket / C kancası) beklenmedik durumları
 * kendiliğinden bildirir; istemci hiçbir şey sorgulamaz. İstek numarası
 * taşımayan çerçeveler bu akışa düşer; bağlanma ve kopma durumları da
 * aynı akıştan geçer, böylece arayüz tek bir kaynağı dinler.
 *
 * Kayıtlar yalnız bellekte, son 50 olayla sınırlı bir halkada tutulur.
 * Diske veya buluta hiçbir şey yazılmaz; olaylar girdi metni taşımaz.
 */

export type BridgeEventKind =
  | "connected"
  | "disconnected"
  | "retry"
  | "memory-fault"
  | "out-of-memory"
  | "hardware"
  | "timeout"
  | "protocol"
  | "closed";

export type BridgeEventSeverity = "info" | "warn" | "error";

export type BridgeEvent = {
  kind: BridgeEventKind;
  severity: BridgeEventSeverity;
  /** Teknik kod (arayüzde gösterilmez, yalnız tanı için taşınır). */
  code: string;
  /** Kullanıcıya gösterilen sade Türkçe açıklama. */
  note: string;
  at: number;
};

/** Bellekte tutulan en fazla olay sayısı. */
export const EVENT_LOG_LIMIT = 50;

const SEVERITY: Record<BridgeEventKind, BridgeEventSeverity> = {
  connected: "info",
  disconnected: "warn",
  retry: "info",
  "memory-fault": "error",
  "out-of-memory": "error",
  hardware: "warn",
  timeout: "warn",
  protocol: "warn",
  closed: "info",
};

const NOTES: Record<BridgeEventKind, string> = {
  connected: "Çekirdek servisine bağlanıldı",
  disconnected: "Bağlantı koptu · yerel kapı devrede",
  retry: "Yeniden bağlanılıyor",
  "memory-fault": "Bellek koruma hatası · işlem yalıtıldı",
  "out-of-memory": "Bellek doldu · işlem yalıtıldı",
  hardware: "Donanım durumu değişti",
  timeout: "Çekirdek yanıt vermedi · yerel kapıya düşüldü",
  protocol: "Anlaşılmayan bildirim yok sayıldı",
  closed: "Çekirdek servisi kapandı",
};

/** Ham sinyal/durum kodunu olay türüne eşler. */
export function kindForCode(code: string): BridgeEventKind | null {
  const key = code.trim().toUpperCase();
  if (!key) return null;
  if (key === "SIGSEGV" || key === "SIGBUS" || key === "MEMORY_FAULT") return "memory-fault";
  if (key === "OOM" || key === "ENOMEM" || key === "OUT_OF_MEMORY") return "out-of-memory";
  if (key === "SIGPIPE" || key === "EPIPE" || key === "CLOSED") return "closed";
  if (key === "HARDWARE" || key === "DEVICE" || key === "THERMAL") return "hardware";
  if (key === "TIMEOUT" || key === "ETIMEDOUT") return "timeout";
  if (key === "PROTOCOL") return "protocol";
  return null;
}

/** Sade Türkçe açıklama (arayüz metni). */
export function noteFor(kind: BridgeEventKind): string {
  return NOTES[kind];
}

export function makeBridgeEvent(
  kind: BridgeEventKind,
  code: string = kind,
  at = Date.now(),
): BridgeEvent {
  return { kind, severity: SEVERITY[kind], code, note: NOTES[kind], at };
}

/**
 * Sunucudan gelen, istek numarası taşımayan çerçeveyi olaya çevirir.
 * Tanınmayan çerçeve `null` döner ve sessizce düşer — bağlantı bozulmaz.
 */
export function parseEventFrame(raw: unknown): BridgeEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const frame = raw as Record<string, unknown>;
  if (typeof frame["id"] === "number") return null;
  const label = typeof frame["event"] === "string" ? frame["event"] : "";
  const code = typeof frame["code"] === "string" ? frame["code"] : "";
  const kind = kindForCode(label) ?? kindForCode(code);
  if (!kind) return null;
  const at = typeof frame["at"] === "number" ? frame["at"] : Date.now();
  return makeBridgeEvent(kind, code || label, at);
}

const listeners = new Set<() => void>();
let log: BridgeEvent[] = [];
let snapshot: BridgeEvent[] = [];

/** Son olaylar (en yeni başta). Aynı referans döner — render döngüsü oluşmaz. */
export function getBridgeEvents(): BridgeEvent[] {
  if (snapshot !== log) snapshot = log;
  return snapshot;
}

export function subscribeBridgeEvents(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Olayı akışa yazar ve dinleyicileri uyarır. */
export function pushBridgeEvent(event: BridgeEvent): BridgeEvent {
  log = [event, ...log].slice(0, EVENT_LOG_LIMIT);
  listeners.forEach((fn) => fn());
  return event;
}

/** Kısayol: tür (ve varsa ham kod) ile olay kaydeder. */
export function recordBridgeEvent(kind: BridgeEventKind, code?: string): BridgeEvent {
  return pushBridgeEvent(makeBridgeEvent(kind, code ?? kind));
}

/** Çerçeveyi çözüp akışa yazar; tanınmazsa hiçbir şey yapmaz. */
export function handleEventFrame(raw: unknown): BridgeEvent | null {
  const event = parseEventFrame(raw);
  return event ? pushBridgeEvent(event) : null;
}

export function clearBridgeEvents(): void {
  log = [];
  listeners.forEach((fn) => fn());
}
