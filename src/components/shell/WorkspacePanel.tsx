import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { MusicApp } from "@/components/shell/apps/MusicApp";
import { MediaApp } from "@/components/shell/apps/MediaApp";
import { FilesApp } from "@/components/shell/apps/FilesApp";
import { StoreApp } from "@/components/shell/apps/StoreApp";
import { ComputerApp } from "@/components/shell/apps/ComputerApp";
import { AppsDialog } from "@/components/shell/AppsDialog";
import { RelaySettingsDialog } from "@/components/shell/RelaySettingsDialog";
import { MeshStatusDialog } from "@/components/shell/MeshStatusDialog";
import { FileTransferDialog } from "@/components/shell/FileTransferDialog";
import { GenericAppContainer } from "@/components/shell/GenericAppContainer";
import { WindowFrame } from "@/components/shell/WindowFrame";
import { Dock } from "@/components/shell/Dock";
import { SystemBar } from "@/components/shell/SystemBar";
import { Desktop } from "@/components/shell/Desktop";
import { pressFeedback } from "@/lib/chat/sounds";
import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/ShellProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { webApp } from "@/shell/web-apps";
import { catalogApp } from "@/shell/installed";
import { getApp } from "@/apps/registry";

import { closeWindow, openWindow, useWindows, type WindowRecord } from "@/shell/windows";

/** Messenger ağır bir uygulamadır: yalnız penceresi açıldığında yüklenir. */
const MessengerApp = lazy(() => import("@/components/Messenger"));

const WINDOW_TITLES: Record<string, string> = {
  messenger: "Sohbet — P2P Ses / Görüntü",
  music: "Müzik",
  media: "Medya — Wasm Kum Havuzu Oynatıcı",
  files: "Dosyalar",
  store: "Tedbirge Mağaza",
  computer: "Bilgisayarım",
};

/**
 * tOS MASAÜSTÜ (Web-OS Kabuğu)
 * ------------------------------------------------------------------
 * Üstte ince sistem çubuğu, ortada duvar kâğıdı + sürüklenebilir
 * kısayollar ve pencere katmanı, altta cam Dock. Mobilde (<768px)
 * pencere yöneticisi devre dışıdır: son açılan uygulama tam ekran
 * PWA kılıfında gösterilir.
 */
export function WorkspacePanel() {
  const [relay, setRelay] = useState(false);
  const [mesh, setMesh] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [packages, setPackages] = useState(false);
  const { node } = useShell();
  const status = describeNode(node);
  const isMobile = useIsMobile();
  const windows = useWindows();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surfaceH, setSurfaceH] = useState(600);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSurfaceH(el.clientHeight));
    ro.observe(el);
    setSurfaceH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const launch = useCallback((id: string) => {
    pressFeedback();
    if (id === "relay") return setRelay(true);
    if (id === "mesh") return setMesh(true);
    if (id === "transfer") return setTransfer(true);
    if (id === "apps") return setPackages(true);
    const web = webApp(id);
    // Kayıt kontrolü: kayıtsız kimlik sessizce yutulmaz, pencere yine açılır.
    if (!getApp(id) && !web && import.meta.env.DEV) {
      console.warn(`[tbos] "${id}" AppRegistry'de kayıtlı değil.`);
    }
    openWindow(id, web ? web.label : (WINDOW_TITLES[id] ?? catalogApp(id)?.label ?? id));

  }, []);

  const visible = windows.filter((w) => !w.minimized);
  const top = visible.length ? visible.reduce((a, b) => (a.z > b.z ? a : b)) : null;

  return (
    <div className="tbos flex min-h-0 flex-1 flex-col">
      <SystemBar
        status={status.text}
        peers={status.directPeers}
        rttMs={node.rttMs}
        onSettings={() => launch("computer")}
      />

      {/* Masaüstü yüzeyi: duvar kâğıdı, kısayollar ve pencereler. */}
      <div ref={surfaceRef} className="relative min-h-0 flex-1 overflow-hidden">
        <Desktop onOpen={launch} draggable={!isMobile} columnsHeight={surfaceH} />

        {!isMobile && windows.length > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            {windows.map((w) => (
              <div key={w.id} className="pointer-events-auto contents">
                <WindowFrame win={w}>
                  <AppSurface win={w} onLaunch={launch} onTransfer={() => setTransfer(true)} />
                </WindowFrame>
              </div>
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
            <h2 className="truncate font-osmono text-[13px] text-[var(--tb-muted)]">{top.title}</h2>
            <button
              type="button"
              onClick={() => closeWindow(top.id)}
              aria-label="Kapat"
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-[var(--tb-muted)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AppSurface win={top} onLaunch={launch} onTransfer={() => setTransfer(true)} />
          </div>
        </div>
      ) : null}

      <Dock windows={windows} onLaunch={launch} onStore={() => launch("store")} />

      <AppsDialog open={packages} onClose={() => setPackages(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
      <FileTransferDialog open={transfer} onClose={() => setTransfer(false)} />
    </div>
  );
}

/** Pencere gövdesi: yerleşik panel ya da harici web konteynırı. */
function AppSurface({
  win,
  onLaunch,
  onTransfer,
}: {
  win: WindowRecord;
  onLaunch: (id: string) => void;
  onTransfer: () => void;
}) {
  const web = webApp(win.appId);
  if (web) {
    return (
      <GenericAppContainer
        url={web.url}
        label={web.label}
        embed={web.embed}
        embedUrl={web.embedUrl}
        proxy={web.proxy}
      />
    );

  }
  if (win.appId === "messenger") {
    return (
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center font-osmono text-[12px] text-[var(--tb-muted)]">
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
  if (win.appId === "store") return <StoreApp onOpen={onLaunch} />;
  if (win.appId === "computer") return <ComputerApp onMesh={() => onLaunch("mesh")} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      {win.appId === "music" && <MusicApp />}
      {win.appId === "media" && <MediaApp />}
      {win.appId === "files" && <FilesApp onTransfer={onTransfer} />}
    </div>
  );
}
