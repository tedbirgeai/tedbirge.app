/**
 * OTOMATİK CİHAZ KİMLİĞİ (Auto-Identity)
 * ------------------------------------------------------------------
 * Kullanıcıya "NODE_B32" yerine "Ahmet — Windows PC" gibi okunur bir
 * kimlik göstermek için cihaz türünü ve adını üretir. Tespit yalnızca
 * tarayıcıdan okunur, hiçbir yere gönderilmez; kullanıcı adı elle
 * değiştirebilir ve tercih bu cihazda saklanır.
 */

export type DeviceKind = "desktop" | "mobile" | "tablet" | "browser";

export type DeviceInfo = { kind: DeviceKind; label: string };

const DEVICE_NAME_KEY = "tedbirge.device.name";

const FALLBACK: DeviceInfo = { kind: "browser", label: "Ağ Cihazı" };

/** navigator.userAgent üzerinden cihaz türünü ve okunur etiketi üretir. */
export function detectDevice(): DeviceInfo {
  if (typeof navigator === "undefined") return FALLBACK;
  const ua = navigator.userAgent || "";

  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1))
    return { kind: "tablet", label: "iPad" };
  if (/iPhone|iPod/i.test(ua)) return { kind: "mobile", label: "iPhone" };
  if (/Android/i.test(ua))
    return /Mobile/i.test(ua)
      ? { kind: "mobile", label: "Android Telefon" }
      : { kind: "tablet", label: "Android Tablet" };
  if (/Windows/i.test(ua)) return { kind: "desktop", label: "Windows PC" };
  if (/Macintosh|Mac OS X/i.test(ua)) return { kind: "desktop", label: "Mac" };
  if (/CrOS/i.test(ua)) return { kind: "desktop", label: "Chromebook" };
  if (/Linux/i.test(ua)) return { kind: "desktop", label: "Linux PC" };

  if (/Firefox/i.test(ua)) return { kind: "browser", label: "Firefox Tarayıcı" };
  if (/Edg\//i.test(ua)) return { kind: "browser", label: "Edge Tarayıcı" };
  if (/Chrome/i.test(ua)) return { kind: "browser", label: "Chrome Tarayıcı" };
  if (/Safari/i.test(ua)) return { kind: "browser", label: "Safari Tarayıcı" };
  return FALLBACK;
}

/** Kullanıcının verdiği cihaz adı; yoksa otomatik etiket. */
export function getDeviceName(): string {
  try {
    const custom = window.localStorage.getItem(DEVICE_NAME_KEY)?.trim();
    if (custom) return custom;
  } catch {
    /* gizli mod */
  }
  return detectDevice().label;
}

export function setDeviceName(name: string) {
  try {
    const clean = name.trim().slice(0, 32);
    if (clean) window.localStorage.setItem(DEVICE_NAME_KEY, clean);
    else window.localStorage.removeItem(DEVICE_NAME_KEY);
  } catch {
    /* gizli mod */
  }
}

export function getDeviceKind(): DeviceKind {
  return detectDevice().kind;
}

/** "Ahmet — Windows PC"; ad yoksa yalnız cihaz adı. */
export function composeIdentityLabel(alias: string, device: string): string {
  const a = alias.trim();
  const d = device.trim();
  if (a && d) return `${a} — ${d}`;
  return a || d;
}

/** Düğüm kimliğinin kısa rozeti: #B32 */
export function shortBadge(nodeId: string): string {
  const clean = (nodeId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `#${clean.slice(-3) || "000"}`;
}
