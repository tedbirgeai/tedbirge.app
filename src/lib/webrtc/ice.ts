/**
 * ICE SUNUCU HAVUZU — TEK DOĞRULUK KAYNAĞI
 * ------------------------------------------------------------------
 * Hem mesh veri kanalları hem de sesli/görüntülü arama motoru aynı
 * havuzu kullanır. Ortam değişkeninde özel TURN tanımlıysa o önceliklidir;
 * yoksa açık aktarma sunucusu yedek olarak devreye girer. İçerik her
 * durumda uçtan uca şifrelidir (DTLS-SRTP) — aktarıcı içeriği göremez.
 */

export const STUN_SERVERS: RTCIceServer = {
  urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
};

/** Yapılandırılmış özel TURN (varsa). */
export function configuredTurn(): RTCIceServer | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env["VITE_TURN_URL"];
  if (!url) return null;
  return {
    urls: url
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean),
    username: env["VITE_TURN_USERNAME"],
    credential: env["VITE_TURN_CREDENTIAL"],
  };
}

/** Açık aktarma yedeği: simetrik NAT / mobil operatör ağları için. */
export const FALLBACK_TURN: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turns:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

export function iceServers(): RTCIceServer[] {
  const custom = configuredTurn();
  return custom ? [STUN_SERVERS, custom, FALLBACK_TURN] : [STUN_SERVERS, FALLBACK_TURN];
}
