/**
 * SİSTEM ÇUBUĞU
 * ------------------------------------------------------------------
 * Üstte ince şerit: marka, canlı saat, P2P ağ durumu, profil ve sistem
 * ayarları girişleri.
 */

import { useEffect, useState } from "react";
import { Bell, Search, Settings, UserRound, Wifi } from "lucide-react";

import { BareMetalIsoButton } from "@/components/shell/BareMetalIso";
import { InstallSystemButton } from "@/components/shell/InstallSystemButton";
import { ControlCenter } from "@/components/shell/ControlCenter";
import { NetworkControl } from "@/components/shell/NetworkControl";
import { NotificationsPanel } from "@/components/shell/NotificationsPanel";
import { useUnreadNoticeCount } from "@/lib/shell/notifications";
import { useClock, useMemoryMb } from "@/lib/shell/telemetry-store";
import { useOnline } from "@/lib/pwa/offline-status";


export function SystemBar({
  status,
  peers,
  rttMs = null,
  onSettings,
  onPersonalize,
  onSearch,
  onProfile,
}: {
  status: string;
  peers: number;
  /** Son ölçülen gidiş-dönüş gecikmesi (ms); yoksa gizlenir. */
  rttMs?: number | null;
  /** Sistem Ayarları uygulamasını açar. */
  onSettings: () => void;
  /** Kontrol merkezinden görünüm ayarlarını açar. */
  onPersonalize: () => void;
  /** Evrensel arama paletini açar. */
  onSearch?: () => void;
  /** Profil ve Hesap uygulamasını açar. */
  onProfile: () => void;
}) {
  const [control, setControl] = useState(false);
  const [network, setNetwork] = useState(false);
  const [notices, setNotices] = useState(false);
  const unread = useUnreadNoticeCount();
  const online = useOnline();
  // Saat ve bellek tek paylaşımlı 1 sn zamanlayıcıdan gelir (titreme yok).
  const clock = useClock();
  const memMb = useMemoryMb();


  // Pencere içi "Ağ modunu değiştir" kısayolu ağ panelini açar.
  useEffect(() => {
    const open = () => setNetwork(true);
    window.addEventListener("tedbirge:open-network", open);
    return () => window.removeEventListener("tedbirge:open-network", open);
  }, []);


  return (
    <header className="tbos-sysbar relative z-[80] grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5">
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
        {!online ? (
          <span
            role="status"
            title="Off-Grid Modu Aktif · Yerel VFS & Wasm Hazır"
            className="min-w-0 max-w-[46vw] shrink truncate rounded-full border border-[var(--tb-accent)] px-2 py-0.5 font-osmono text-[11px] text-[var(--tb-accent)] sm:max-w-none sm:shrink-0"
          >
            Off-Grid<span className="hidden md:inline"> Modu Aktif · Yerel VFS &amp; Wasm Hazır</span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setNetwork(false);
            setControl((v) => !v);
          }}
          aria-label="Kontrol merkezi"
          aria-expanded={control}
          className="wa-press hidden min-h-12 min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-0.5 sm:flex"
        >
          {/* Sabit ölçülü şerit: sayaç değişimleri komşu öğeleri kaydırmaz. */}
          <span className="flex items-center gap-1 font-osmono text-[11px] leading-4 text-[var(--tb-muted)] tabular-nums">
            <span className="inline-block w-[min(34vw,220px)] truncate text-left">{status}</span>
            <span className="inline-block w-[62px] shrink-0 text-right">{peers} cihaz</span>
            <span className="inline-block w-[62px] shrink-0 text-right">
              {rttMs != null ? `${rttMs} ms` : ""}
            </span>
            <span className="inline-block w-[62px] shrink-0 text-right">
              {memMb != null ? `${memMb} MB` : ""}
            </span>
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


      <div className="pointer-events-auto relative z-[90] flex shrink-0 items-center gap-0.5">
        {onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            aria-label="Evrensel arama (Ctrl + Boşluk)"
            title="Evrensel arama · Ctrl + Boşluk"
            className="wa-press grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setControl(false);
            setNetwork(false);
            setNotices((v) => !v);
          }}
          aria-label={unread > 0 ? `Bildirimler (${unread} okunmamış)` : "Bildirimler"}
          aria-expanded={notices}
          title="Bildirimler"
          className="wa-press relative grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unread > 0 ? (
            <span className="absolute right-2.5 top-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--tb-accent)] px-1 font-osmono text-[9px] text-[var(--tb-bg)]">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
        <InstallSystemButton compact />
        <BareMetalIsoButton compact />
        <span
          className="hidden shrink-0 whitespace-nowrap px-1 font-osmono text-[11px] text-[var(--tb-muted)] md:inline"
          aria-live="polite"
        >
          {clock}
        </span>

        <button
          type="button"
          onClick={onSettings}
          aria-label="Sistem ayarları"
          title="Sistem Ayarları"
          className="wa-press grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onProfile}
          aria-label="Profil ve hesap"
          title="Profil ve Hesap"
          className="wa-press grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <UserRound className="h-4 w-4" aria-hidden />
        </button>

        <NotificationsPanel open={notices} onClose={() => setNotices(false)} />
      </div>
    </header>
  );
}
