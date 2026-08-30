/**
 * SİSTEM ÇUBUĞU
 * ------------------------------------------------------------------
 * Üstte ince şerit: marka, canlı saat, P2P ağ durumu, profil ve sistem
 * ayarları girişleri.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Settings, UserRound, Wifi } from "lucide-react";

import { InstallSystemButton } from "@/components/shell/InstallSystemButton";
import { ControlCenter } from "@/components/shell/ControlCenter";
import { NetworkControl } from "@/components/shell/NetworkControl";



/** Bazı tarayıcılarda bulunan bellek ölçümü (standart dışı). */
type MemoryInfo = { usedJSHeapSize: number; jsHeapSizeLimit: number };

function readMemory(): number | null {
  const perf = performance as Performance & { memory?: MemoryInfo };
  const m = perf.memory;
  if (!m || !m.jsHeapSizeLimit) return null;
  return Math.round((m.usedJSHeapSize / 1024 / 1024) * 10) / 10;
}

export function SystemBar({
  status,
  peers,
  rttMs = null,
  onSettings,
  onPersonalize,
  onSearch,
}: {
  status: string;
  peers: number;
  /** Son ölçülen gidiş-dönüş gecikmesi (ms); yoksa gizlenir. */
  rttMs?: number | null;
  onSettings: () => void;
  /** Kontrol merkezinden görünüm ayarlarını açar. */
  onPersonalize: () => void;
  /** Evrensel arama paletini açar. */
  onSearch?: () => void;
}) {
  const [clock, setClock] = useState("");
  const [memMb, setMemMb] = useState<number | null>(null);
  const [control, setControl] = useState(false);
  const [network, setNetwork] = useState(false);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) +
          " · " +
          new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      );
      setMemMb(readMemory());
    };
    tick();
    const t = window.setInterval(tick, 5000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className="tbos-sysbar relative z-[80] grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 font-osmono text-[12px] font-bold tracking-tight text-[var(--tb-text)]">
          TEDBİRGE<span className="text-[var(--tb-accent)]"> OS</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setControl(false);
            setNetwork((v) => !v);
          }}
          aria-label="Ağ yönetimi"
          aria-expanded={network}
          className="wa-press grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--tb-accent)]"
        >
          <Wifi className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            setNetwork(false);
            setControl((v) => !v);
          }}
          aria-label="Kontrol merkezi"
          aria-expanded={control}
          className="wa-press hidden min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-0.5 sm:flex"
        >
          <span className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">
            {status} · {peers} cihaz
            {rttMs != null ? ` · ${rttMs} ms` : ""}
            {memMb != null ? ` · ${memMb} MB` : ""}
          </span>
        </button>
      </div>

      <NetworkControl open={network} onClose={() => setNetwork(false)} />

      <ControlCenter
        open={control}
        onClose={() => setControl(false)}
        status={status}
        peers={peers}
        rttMs={rttMs}
        onPersonalize={onPersonalize}
        onNetwork={() => setNetwork(true)}
      />


      <div className="flex shrink-0 items-center gap-1.5">
        {onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            aria-label="Evrensel arama (Ctrl + Boşluk)"
            title="Evrensel arama · Ctrl + Boşluk"
            className="wa-press grid h-7 w-7 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
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
