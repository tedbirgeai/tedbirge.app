/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM AĞ DÜĞÜMÜ KÖPRÜSÜ
 * ------------------------------------------------------------------
 * AXIOM ikinci bir WebRTC yığını kurmaz: Tedbirge WebOS'un hâlihazırda
 * çalışan düğümünü (browser-node / node-runtime) SALT-OKUNUR biçimde
 * okuyup AXIOM diline çevirir. Bağlantı yolu yapılandırması (STUN ve
 * aktarma yedeği) `src/lib/webrtc/ice.ts` içinde tanımlıdır; burada
 * yalnız özetlenir. Böylece sohbet, arama ve mesh davranışı etkilenmez.
 */

import { describeNode, useNodeRuntime } from "@/lib/node-runtime";
import { iceServers } from "@/lib/webrtc/ice";

/** Ücretsiz düğüm sınırı: 1–5 cihaz. 6. cihazda lisans gerekir. */
export const FREE_NODE_LIMIT = 5;

export type AxiomNodeView = {
  status: "NODE_ACTIVE_FREE" | "SUBSCRIPTION_REQUIRED" | "NODE_OFFLINE";
  running: boolean;
  /** Doğrudan bağlı cihaz sayısı. */
  peers: number;
  /** Sırada bekleyen gönderim sayısı. */
  queued: number;
  /** Kullanıcıya gösterilen düz Türkçe durum metni. */
  text: string;
  /** Bağlantı yolu özeti. */
  path: string;
  /** Yedekli yol sayıları. */
  routes: { direct: boolean; reflector: number; relay: number };
  fingerprint: string;
};

/** Yapılandırılmış bağlantı yollarını sayar (adres göstermeden). */
export function routeSummary(): { reflector: number; relay: number } {
  let reflector = 0;
  let relay = 0;
  for (const server of iceServers()) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const url of urls) {
      if (url.startsWith("turn")) relay += 1;
      else if (url.startsWith("stun")) reflector += 1;
    }
  }
  return { reflector, relay };
}

/** Düğüm durumunu AXIOM görünümüne çevirir (React dışı, test edilebilir). */
export function toNodeView(
  state: Parameters<typeof describeNode>[0],
  routes: { reflector: number; relay: number },
): AxiomNodeView {
  const described = describeNode(state);
  const peers = described.directPeers;
  const status = !state.running
    ? "NODE_OFFLINE"
    : peers >= FREE_NODE_LIMIT + 1
      ? "SUBSCRIPTION_REQUIRED"
      : "NODE_ACTIVE_FREE";
  const path = !state.running
    ? "Düğüm kapalı"
    : peers > 0
      ? "Doğrudan cihazdan cihaza"
      : state.online
        ? "Yansıtıcı sunucu üzerinden eş aranıyor"
        : "Çevrimdışı · gönderimler sırada";
  return {
    status,
    running: state.running,
    peers,
    queued: described.queued,
    text: described.text,
    path,
    routes: { direct: peers > 0, reflector: routes.reflector, relay: routes.relay },
    fingerprint: state.fingerprint,
  };
}

/** React tarafı: düğüm durumunu canlı izler. */
export function useAxiomNode(): AxiomNodeView {
  const state = useNodeRuntime();
  return toNodeView(state, routeSummary());
}
