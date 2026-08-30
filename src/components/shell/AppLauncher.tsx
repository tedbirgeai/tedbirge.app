/**
 * UYGULAMA BAŞLATICI (App Launcher)
 * ------------------------------------------------------------------
 * Masaüstünün tek uygulama girişi: yerleşik modüller ve harici web
 * hedefleri tek ızgarada listelenir. Marka adları bileşene gömülmez;
 * web hedefleri `src/shell/web-apps.ts` kataloğundan üretilir.
 */

import { useEffect, type ReactNode } from "react";
import {
  Activity,
  Boxes,
  FileUp,
  FolderOpen,
  Globe,
  MessageCircle,
  Music,
  PlayCircle,
  Radio,
  X,
} from "lucide-react";

import { WEB_APPS } from "@/shell/web-apps";

export type LauncherTile = { id: string; label: string; hint: string; icon: ReactNode };

export const LOCAL_TILES: LauncherTile[] = [
  {
    id: "messenger",
    label: "Sohbet",
    hint: "Mesaj, sesli ve görüntülü arama",
    icon: <MessageCircle className="h-6 w-6" />,
  },
  { id: "music", label: "Müzik", hint: "Cihazdaki parçalar", icon: <Music className="h-6 w-6" /> },
  {
    id: "media",
    label: "Medya",
    hint: "Video oynatıcı",
    icon: <PlayCircle className="h-6 w-6" />,
  },
  {
    id: "files",
    label: "Dosyalar",
    hint: "Dosya yöneticisi",
    icon: <FolderOpen className="h-6 w-6" />,
  },
  {
    id: "transfer",
    label: "Aktarım",
    hint: "Eşler arası dosya gönderimi",
    icon: <FileUp className="h-6 w-6" />,
  },
  {
    id: "apps",
    label: "Uygulamalar",
    hint: "Kurulu .tbapp paketleri",
    icon: <Boxes className="h-6 w-6" />,
  },
  { id: "mesh", label: "Ağ", hint: "Düğüm ve mesh durumu", icon: <Activity className="h-6 w-6" /> },
  { id: "relay", label: "Röle", hint: "Taşıma ayarları", icon: <Radio className="h-6 w-6" /> },
];

export const WEB_TILES: LauncherTile[] = WEB_APPS.map((a) => ({
  id: a.id,
  label: a.label,
  hint: a.hint,
  icon: <Globe className="h-6 w-6" />,
}));

export function AppLauncher({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Başlatıcıyı kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div
        className="relative m-0 max-h-[82vh] overflow-y-auto rounded-t-2xl p-4 sm:m-4 sm:rounded-2xl"
        style={{
          border: "1px solid var(--border)",
          background: "var(--tb-panel-solid)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-osmono text-[13px] tracking-wide text-slate-300 uppercase">
            Uygulamalar
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="wa-press flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Grid tiles={LOCAL_TILES} onLaunch={onLaunch} />

        <h3 className="mt-6 mb-3 font-osmono text-[12px] tracking-wide text-slate-500 uppercase">
          Web uygulamaları
        </h3>
        <Grid tiles={WEB_TILES} onLaunch={onLaunch} />
      </div>
    </div>
  );
}

function Grid({ tiles, onLaunch }: { tiles: LauncherTile[]; onLaunch: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onLaunch(t.id)}
          className="wa-press flex min-h-24 flex-col justify-between rounded-2xl border border-emerald-500/15 bg-[var(--tb-panel-solid)] p-3 text-left transition-colors hover:border-emerald-500/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            {t.icon}
          </span>
          <span className="mt-2 block min-w-0">
            <span className="block truncate text-[15px] font-semibold text-slate-100">
              {t.label}
            </span>
            <span className="block truncate font-osmono text-[11px] text-slate-500">{t.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
