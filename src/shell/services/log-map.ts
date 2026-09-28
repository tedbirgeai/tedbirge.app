import type { ServiceEvent } from "@/shell/services/registry";
import type { LogLevel, PortalLog } from "@/lib/portal/types";

const LABEL: Record<ServiceEvent["status"], string> = {
  idle: "bekliyor",
  starting: "başlıyor",
  running: "çalışıyor",
  degraded: "kurtarılıyor",
  failed: "arızalı",
  stopped: "durdu",
};

export function serviceLevel(status: ServiceEvent["status"]): LogLevel {
  return status === "failed" ? "hata" : status === "degraded" ? "uyari" : "bilgi";
}

/** Servis olaylarını log satırına çevirir (yeniden eskiye). Kullanıcı verisi yoktur. */
export function serviceEventsToLogs(events: readonly ServiceEvent[]): PortalLog[] {
  return events
    .map((e, i) => ({
      id: `svc-${e.at}-${i}`,
      at: e.at,
      level: serviceLevel(e.status),
      source: "servis",
      message: `${e.name}: ${LABEL[e.status]}${e.detail ? ` — ${e.detail}` : ""}`,
    }))
    .reverse();
}
