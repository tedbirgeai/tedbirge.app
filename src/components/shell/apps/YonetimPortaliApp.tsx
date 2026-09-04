/**
 * SİSTEM YÖNETİM PORTALI
 * ------------------------------------------------------------------
 * Tamamen cihazda çalışan yönetim modülü: ağ düğümleri ve canlı
 * ölçümler, kullanıcı/lisans yönetimi, sistem günlük kayıtları.
 * Hiçbir sunucuya istek gitmez; veriler IndexedDB'de saklanır.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Activity, RotateCcw, ScrollText, ShieldCheck, Users } from "lucide-react";

import { LogsPanel } from "@/components/shell/apps/portal/LogsPanel";
import { MetricsPanel } from "@/components/shell/apps/portal/MetricsPanel";
import { UsersPanel } from "@/components/shell/apps/portal/UsersPanel";
import { ghostBtn } from "@/components/shell/apps/portal/ui";
import { usePortal } from "@/lib/portal/store";

const TABS = [
  { id: "metrics", label: "Ağ ve Ölçümler", icon: Activity },
  { id: "users", label: "Kullanıcı ve Lisans", icon: Users },
  { id: "logs", label: "Kayıtlar", icon: ScrollText },
] as const;

export function YonetimPortaliApp() {
  const { ready, error, prefs, setPrefs, load, resetAll } = usePortal();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);

  const tab = prefs.tab;

  async function onReset() {
    setResetting(true);
    try {
      await resetAll();
      toast.success("Portal verisi varsayılana döndürüldü.");
    } catch {
      toast.error("Veri sıfırlanamadı.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[var(--tb-border)] bg-[color-mix(in_srgb,var(--tb-panel-solid)_70%,transparent)] p-3 backdrop-blur-md">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)] text-[var(--tb-accent)]">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-[var(--tb-text)]">
                Sistem Yönetim Portalı
              </h1>
              <p className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">
                Veriler yalnızca bu cihazda saklanır
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onReset()}
            disabled={resetting}
            className={`${ghostBtn} shrink-0`}
          >
            <RotateCcw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Varsayılana dön
          </button>
        </div>

        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Portal bölümleri">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setPrefs({ tab: t.id })}
                className={`wa-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 font-osmono text-[11px] ${
                  on
                    ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                    : "border-[var(--tb-border)] text-[var(--tb-muted)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-[var(--tb-border)] p-3 text-[13px] text-[var(--tb-danger,#dc2626)]"
          >
            Yerel veri okunamadı: {error}
          </div>
        ) : null}

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "metrics" ? <MetricsPanel /> : null}
          {tab === "users" ? <UsersPanel /> : null}
          {tab === "logs" ? <LogsPanel /> : null}
        </motion.div>
      </div>
    </div>
  );
}
