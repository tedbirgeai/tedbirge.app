/**
 * EŞ KİMLİK HARİTASI
 * ------------------------------------------------------------------
 * Ad beyanı protokolüyle gelen görünen ad + cihaz bilgisini eş (nodeId)
 * bazında tutar. Yalnız bu cihazda saklanır; ad verisi henüz gelmemiş
 * eşlerde arayüz "Ağ Cihazı (#B32)" yedeğine düşer.
 */

import { composeIdentityLabel, shortBadge, type DeviceKind } from "@/lib/identity/device";
import { getNickname } from "@/lib/identity/peer-nickname";
import { resolveDisplayName } from "@/lib/chat/name-resolver";

export type PeerIdentity = { alias?: string; device?: string; kind?: DeviceKind };

const STORE_KEY = "tedbirge.peer.identity";

function load(): Record<string, PeerIdentity> {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Record<
      string,
      PeerIdentity
    >;
  } catch {
    return {};
  }
}

let cache: Record<string, PeerIdentity> | null = null;

function all(): Record<string, PeerIdentity> {
  if (typeof window === "undefined") return {};
  if (!cache) cache = load();
  return cache;
}

const listeners = new Set<() => void>();

export function onPeerIdentity(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Gelen cihaz bilgisini yazar; değişiklik olduysa true döner. */
export function rememberPeerIdentity(nodeId: string, next: PeerIdentity): boolean {
  if (!nodeId || typeof window === "undefined") return false;
  const map = all();
  const prev = map[nodeId] ?? {};
  const merged: PeerIdentity = {
    alias: next.alias?.trim() || prev.alias,
    device: next.device?.trim() || prev.device,
    kind: next.kind ?? prev.kind,
  };
  if (prev.alias === merged.alias && prev.device === merged.device && prev.kind === merged.kind)
    return false;
  map[nodeId] = merged;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
  return true;
}

export function getPeerIdentity(nodeId: string): PeerIdentity {
  return all()[nodeId] ?? {};
}

export function getPeerKind(nodeId: string): DeviceKind {
  return getPeerIdentity(nodeId).kind ?? "browser";
}

/**
 * İnsan dostu eş adı. Sıra: ad kanalı → beyan edilen ad/cihaz → yedek.
 * Hiçbir bilgi yoksa "Ağ Cihazı (#B32)".
 */
export function peerDisplayLabel(nodeId: string): string {
  const nickname = getNickname(nodeId);
  if (nickname) return nickname;
  const id = getPeerIdentity(nodeId);
  let alias = id.alias ?? "";
  if (!alias) {
    try {
      const resolved = resolveDisplayName(nodeId);
      if (resolved && !/^NODE_/i.test(resolved)) alias = resolved;
    } catch {
      /* ad kanalı hazır değil */
    }
  }
  const label = composeIdentityLabel(alias, id.device ?? "");
  return label || `Ağ Cihazı (${shortBadge(nodeId)})`;
}

/** Eşin insan tarafından tanımlanmış (rehberlik eden) bir adı var mı? */
export function isNamedPeer(nodeId: string): boolean {
  if (getNickname(nodeId)) return true;
  const id = getPeerIdentity(nodeId);
  if (id.alias?.trim()) return true;
  try {
    const resolved = resolveDisplayName(nodeId);
    return Boolean(resolved && !/^NODE_/i.test(resolved));
  } catch {
    return false;
  }
}
