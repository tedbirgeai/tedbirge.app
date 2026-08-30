import { Suspense, lazy, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
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

import { MusicApp } from "@/components/shell/apps/MusicApp";
import { MediaApp } from "@/components/shell/apps/MediaApp";
import { FilesApp } from "@/components/shell/apps/FilesApp";
import { AppsDialog } from "@/components/shell/AppsDialog";
import { RelaySettingsDialog } from "@/components/shell/RelaySettingsDialog";
import { MeshStatusDialog } from "@/components/shell/MeshStatusDialog";
import { FileTransferDialog } from "@/components/shell/FileTransferDialog";
import { GenericAppContainer } from "@/components/shell/GenericAppContainer";
import { WindowFrame } from "@/components/shell/WindowFrame";
import { Taskbar } from "@/components/shell/Taskbar";
import { pressFeedback } from "@/lib/chat/sounds";
import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/ShellProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { WEB_APPS, webApp } from "@/shell/web-apps";
import { closeWindow, openWindow, useWindows, type WindowRecord } from "@/shell/windows";

/** Messenger ağır bir uygulamadır: yalnız penceresi açıldığında yüklenir. */
const MessengerApp = lazy(() => import("@/components/Messenger"));

type LocalAppId = "messenger" | "music" | "media" | "files";

const WINDOW_TITLES: Record<LocalAppId, string> = {
  messenger: "Messenger — P2P Ses / Görüntü",
  music: "Müzik",
  media: "Medya — Wasm Kum Havuzu Oynatıcı",
  files: "Dosyalar",
};

type Tile = { id: string; label: string; hint: string; icon: ReactNode };

const LOCAL_TILES: Tile[] = [
  {
    id: "messenger",
    label: "Messenger",
    hint: "Sohbet, sesli ve görüntülü arama",
    icon: <MessageCircle className="h-6 w-6" />,
  },
  { id: "music", label: "Müzik", hint: "Cihazdaki parçalar", icon: <Music className="h-6 w-6" /> },
  {
    id: "media",
    label: "Medya",
    hint: "Video ve YouTube oynatıcı",
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

/** Harici hedefler kabuk koduna gömülmez: katalogdan üretilir. */
const WEB_TILES: Tile[] = WEB_APPS.map((a) => ({
  id: a.id,
  label: a.label,
  hint: a.hint,
  icon: <Globe className="h-6 w-6" />,
}));

/**
 * tOS ÇALIŞMA ALANI (Web-OS Kabuğu)
 * ------------------------------------------------------------------
 * Masaüstünde çoklu pencere: her simge sürüklenebilir, boyutlandırılabilir
 * ve z-index öncelikli bir pencere açar; açık pencereler alt görev
 * çubuğunda listelenir. Mobilde (<768px) pencere yöneticisi devre dışıdır:
 * son açılan uygulama tam ekran PWA kılıfında gösterilir.
 */
export function WorkspacePanel() {
  const [apps, setApps] = useState(false);
  const [relay, setRelay] = useState(false);
  const [mesh, setMesh] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const { node } = useShell();
  const status = describeNode(node);
  const isMobile = useIsMobile();
  const windows = useWindows();

  const launch = (id: string) => {
    pressFeedback();
    if (id === "apps") return setApps(true);
    if (id === "relay") return setRelay(true);
    if (id === "mesh") return setMesh(true);
    if (id === "transfer") return setTransfer(true);
    const web = webApp(id);
    openWindow(id, web ? web.label : WINDOW_TITLES[id as LocalAppId]);
  };

  const visible = windows.filter((w) => !w.minimized);
  const top = visible.length ? visible.reduce((a, b) => (a.z > b.z ? a : b)) : null;

  return (
    <div className="tbos cyber-grid flex min-h-0 flex-1 flex-col">
      <header
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(11,16,29,0.85)" }}
      >
        <div className="min-w-0">
          <h1 className="truncate font-osmono text-[17px] font-bold tracking-tight text-slate-100">
            TEDBİRGE<span className="text-emerald-400"> OS</span>
          </h1>
          <p className="truncate font-osmono text-[11px] text-slate-500">
            THIS_NODE · {status.text} · eş {status.directPeers} · kuyruk {status.queued}
          </p>
        </div>
        <Link
          to="/system"
          className="shrink-0 rounded-md border border-emerald-500/20 px-3 py-2 font-osmono text-[12px] text-emerald-400"
        >
          Sistem
        </Link>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LOCAL_TILES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => launch(t.id)}
              className="wa-press flex min-h-24 flex-col justify-between rounded-2xl border border-emerald-500/15 bg-[var(--tb-panel-solid)] p-3 text-left transition-colors hover:border-emerald-500/40"
            >
              <TileView icon={t.icon} label={t.label} hint={t.hint} />
            </button>
          ))}
        </div>

        <h2 className="mt-6 mb-3 font-osmono text-[12px] tracking-wide text-slate-500 uppercase">
          Web uygulamaları
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {WEB_TILES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => launch(t.id)}
              className="wa-press flex min-h-24 flex-col justify-between rounded-2xl border border-emerald-500/15 bg-[var(--tb-panel-solid)] p-3 text-left transition-colors hover:border-emerald-500/40"
            >
              <TileView icon={t.icon} label={t.label} hint={t.hint} />
            </button>
          ))}
        </div>

        {/* Masaüstü: çoklu pencere katmanı. */}
        {!isMobile ? (
          <div className="pointer-events-none fixed inset-0 z-[70]">
            <div className="pointer-events-auto absolute inset-0">
              {windows.map((w) => (
                <WindowFrame key={w.id} win={w}>
                  <AppSurface win={w} onTransfer={() => setTransfer(true)} />
                </WindowFrame>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobil: tek uygulama tam ekran PWA kılıfı. */}
      {isMobile && top ? (
        <div className="tbos fixed inset-0 z-[70] flex flex-col bg-[var(--tb-bg)]">
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="truncate font-osmono text-[13px] text-slate-300">{top.title}</h2>
            <button
              type="button"
              onClick={() => closeWindow(top.id)}
              aria-label="Kapat"
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AppSurface win={top} onTransfer={() => setTransfer(true)} />
          </div>
        </div>
      ) : null}

      {!isMobile ? <Taskbar windows={windows} /> : null}

      <AppsDialog open={apps} onClose={() => setApps(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
      <FileTransferDialog open={transfer} onClose={() => setTransfer(false)} />
    </div>
  );
}

/** Pencere gövdesi: yerleşik panel ya da harici web konteynırı. */
function AppSurface({ win, onTransfer }: { win: WindowRecord; onTransfer: () => void }) {
  const web = webApp(win.appId);
  if (web) {
    return <GenericAppContainer url={web.url} label={web.label} embed={web.embed} />;
  }
  if (win.appId === "messenger") {
    return (
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center font-osmono text-[12px] text-slate-500">
            Messenger yükleniyor…
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-auto [&>div]:h-full">
          <MessengerApp />
        </div>
      </Suspense>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      {win.appId === "music" && <MusicApp />}
      {win.appId === "media" && <MediaApp />}
      {win.appId === "files" && <FilesApp onTransfer={onTransfer} />}
    </div>
  );
}

function TileView({ icon, label, hint }: { icon: ReactNode; label: string; hint: string }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
        {icon}
      </span>
      <span className="mt-2 block min-w-0">
        <span className="block truncate text-[15px] font-semibold text-slate-100">{label}</span>
        <span className="block truncate font-osmono text-[11px] text-slate-500">{hint}</span>
      </span>
    </>
  );
}
