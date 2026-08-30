/**
 * SİSTEM ÇUBUĞU
 * ------------------------------------------------------------------
 * Üstte ince şerit: marka, canlı saat, P2P ağ durumu, profil ve sistem
 * ayarları girişleri.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Settings, UserRound, Wifi } from "lucide-react";

import { InstallSystemButton } from "@/components/shell/InstallSystemButton";


export function SystemBar({
  status,
  peers,
  onSettings,
}: {
  status: string;
  peers: number;
  onSettings: () => void;
}) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) +
          " · " +
          new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      );
    tick();
    const t = window.setInterval(tick, 15000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className="tbos-sysbar grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 font-osmono text-[12px] font-bold tracking-tight text-[var(--tb-text)]">
          TEDBİRGE<span className="text-[var(--tb-accent)]"> OS</span>
        </span>
        <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
          <Wifi className="h-3.5 w-3.5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
          <span className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">
            {status} · {peers} cihaz
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <InstallSystemButton />
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]" aria-live="polite">
          {clock}
        </span>

        <button
          type="button"
          onClick={onSettings}
          aria-label="Sistem ayarları"
          className="wa-press grid h-7 w-7 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </button>
        <Link
          to="/system"
          aria-label="Profil ve sistem"
          className="wa-press grid h-7 w-7 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <UserRound className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
