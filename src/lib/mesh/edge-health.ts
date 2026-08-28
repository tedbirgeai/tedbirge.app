/**
 * KENAR SAĞLIĞI VE ROTA KARANTİNASI — Faz B
 * ------------------------------------------------------------------
 * Bir komşuya gönderim başarısız olduğunda o hattın ağırlığı üstel
 * olarak cezalandırılır; ceza belirli bir eşiği aşarsa hat geçici
 * karantinaya alınır ve rota hesabı onu son çare sayar. Hat yeniden
 * çalıştıkça ceza zamanla erir (decay), böylece ağ kendini onarır.
 */

const FAIL_QUARANTINE = 4;
/** Karantina süresi (ms). */
const QUARANTINE_MS = 60_000;
/** Cezanın yarılanma süresi (ms). */
const HALF_LIFE_MS = 45_000;
const MAX_PENALTY = 32;

type EdgeState = {
  failures: number;
  penalty: number;
  updatedAt: number;
  quarantinedUntil: number;
};

const edges = new Map<string, EdgeState>();

function read(peerId: string, now: number): EdgeState {
  const s = edges.get(peerId);
  if (!s) return { failures: 0, penalty: 1, updatedAt: now, quarantinedUntil: 0 };
  // Erime: geçen süreye göre ceza 1'e doğru yaklaşır.
  const elapsed = now - s.updatedAt;
  if (elapsed <= 0 || s.penalty <= 1) return s;
  const decayed = 1 + (s.penalty - 1) * Math.pow(0.5, elapsed / HALF_LIFE_MS);
  return { ...s, penalty: decayed < 1.01 ? 1 : decayed, updatedAt: now };
}

function write(peerId: string, s: EdgeState) {
  if (s.penalty <= 1 && s.failures === 0 && s.quarantinedUntil === 0) edges.delete(peerId);
  else edges.set(peerId, s);
}

/** Gönderim/handshake hatası — ağırlık iki katına çıkar. */
export function reportEdgeFailure(peerId: string, now = Date.now()) {
  if (!peerId) return;
  const s = read(peerId, now);
  const failures = s.failures + 1;
  const penalty = Math.min(MAX_PENALTY, Math.max(2, s.penalty * 2));
  write(peerId, {
    failures,
    penalty,
    updatedAt: now,
    quarantinedUntil: failures >= FAIL_QUARANTINE ? now + QUARANTINE_MS : s.quarantinedUntil,
  });
}

/** Başarılı teslim — ceza hızla geri alınır, karantina kalkar. */
export function reportEdgeSuccess(peerId: string, now = Date.now()) {
  if (!peerId || !edges.has(peerId)) return;
  const s = read(peerId, now);
  const penalty = Math.max(1, s.penalty * 0.5);
  write(peerId, { failures: 0, penalty, updatedAt: now, quarantinedUntil: 0 });
}

/** Rota hesabında kullanılacak çarpan (1 = sağlıklı). */
export function edgePenalty(peerId: string, now = Date.now()): number {
  const s = read(peerId, now);
  if (s.quarantinedUntil > now) return MAX_PENALTY * 8; // son çare
  return s.penalty;
}

export function isQuarantined(peerId: string, now = Date.now()): boolean {
  return read(peerId, now).quarantinedUntil > now;
}

export function quarantinedEdges(now = Date.now()): string[] {
  return [...edges.keys()].filter((id) => isQuarantined(id, now));
}

export function edgeHealthSnapshot(now = Date.now()) {
  return [...edges.entries()].map(([peerId, s]) => {
    const cur = read(peerId, now);
    return {
      peerId,
      failures: cur.failures,
      penalty: Number(cur.penalty.toFixed(2)),
      quarantined: cur.quarantinedUntil > now,
    };
  });
}

export function resetEdgeHealth() {
  edges.clear();
}
