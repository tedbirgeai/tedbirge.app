import { RotateCcw } from "lucide-react";

import { Badge, GlassCard, ghostBtn } from "@/components/shell/apps/portal/ui";
import { serviceManager, useIsLeader, useServices } from "@/shell/services/services";
import type { ServiceStatus } from "@/shell/services/registry";

const LABEL: Record<ServiceStatus, string> = {
  idle: "bekliyor",
  starting: "başlıyor",
  running: "çalışıyor",
  degraded: "kurtarılıyor",
  failed: "arızalı",
  stopped: "durdu",
};

const TONE: Record<ServiceStatus, "ok" | "warn" | "err" | undefined> = {
  idle: undefined,
  starting: "warn",
  running: "ok",
  degraded: "warn",
  failed: "err",
  stopped: undefined,
};

export function ServicesCard() {
  const services = useServices();
  const leader = useIsLeader();
  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--tb-text)]">Arka plan servisleri</h3>
        <Badge tone={leader ? "ok" : undefined}>{leader ? "lider sekme" : "takipçi sekme"}</Badge>
      </div>
      <ul className="divide-y divide-[var(--tb-border)]" aria-label="Arka plan servisleri">
        {services.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
            <span className="font-osmono text-[var(--tb-text)]">{s.name}</span>
            <span className="flex items-center gap-2">
              {s.restarts > 0 ? <span className="text-[var(--tb-text-muted)]">{s.restarts}× deneme</span> : null}
              <Badge tone={TONE[s.status]}>{LABEL[s.status]}</Badge>
              <button
                type="button"
                className={ghostBtn}
                aria-label={`${s.name} servisini yeniden başlat`}
                onClick={() => void serviceManager().restart(s.name)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
