import { Suspense, lazy, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, X } from "lucide-react";

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
import { AppLauncher } from "@/components/shell/AppLauncher";
import { pressFeedback } from "@/lib/chat/sounds";
import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/ShellProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { webApp } from "@/shell/web-apps";
import { closeWindow, openWindow, useWindows, type WindowRecord } from "@/shell/windows";

/** Messenger ağır bir uygulamadır: yalnız penceresi açıldığında yüklenir. */
const MessengerApp = lazy(() => import("@/components/Messenger"));

type LocalAppId = "messenger" | "music" | "media" | "files";

const WINDOW_TITLES: Record<LocalAppId, string> = {
  messenger: "Sohbet — P2P Ses / Görüntü",
  music: "Müzik",
  media: "Medya — Wasm Kum Havuzu Oynatıcı",
  files: "Dosyalar",
};

/**
 * tOS MASAÜSTÜ (Web-OS Kabuğu)
 * ------------------------------------------------------------------
 * Masaüstünde boş bir çalışma yüzeyi: uygulamalar başlatıcıdan açılır ve
 * her biri sürüklenebilir bağımsız bir pencere olur; açık pencereler alt
 * görev çubuğunda listelenir. Mobilde (<768px) pencere yöneticisi devre
 * dışıdır: son açılan uygulama tam ekran PWA kılıfında gösterilir.
 */
export function WorkspacePanel() {
  const [launcher, setLauncher] = useState(false);
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
    setLauncher(false);
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
        style={{ borderBottom: "1px solid var(--border)", background: "var(--tb-panel-solid)" }}
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

      {/* Masaüstü yüzeyi: pencereler burada açılır. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {windows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <LayoutGrid className="h-7 w-7" />
            </span>
            <p className="text-[15px] font-semibold text-slate-200">Masaüstünüz hazır</p>
            <p className="max-w-sm font-osmono text-[12px] text-slate-500">
              Başlamak için görev çubuğundaki “Uygulamalar” düğmesine dokunun; sohbet, medya ve web
              modülleri ayrı pencerelerde açılır.
            </p>
            <button
              type="button"
              onClick={() => setLauncher(true)}
              className="wa-press mt-1 rounded-lg border border-emerald-500/40 px-4 py-2 font-osmono text-[12px] text-emerald-400"
            >
              Uygulamaları aç
            </button>
          </div>
        ) : null}

        {/* Masaüstü: çoklu pencere katmanı. */}
        {!isMobile ? (
          <div className="absolute inset-0">
            {windows.map((w) => (
              <WindowFrame key={w.id} win={w}>
                <AppSurface win={w} onTransfer={() => setTransfer(true)} />
              </WindowFrame>
            ))}
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

      <Taskbar
        windows={windows}
        launcherOpen={launcher}
        onLauncher={() => setLauncher((v) => !v)}
      />

      <AppLauncher open={launcher} onClose={() => setLauncher(false)} onLaunch={launch} />
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
            Sohbet yükleniyor…
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
