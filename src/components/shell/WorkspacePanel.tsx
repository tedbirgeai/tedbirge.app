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
import { TedbirgeWebView } from "@/components/shell/TedbirgeWebView";
import { WallpaperSettingsApp } from "@/components/shell/apps/WallpaperSettingsApp";

import { WindowFrame } from "@/components/shell/WindowFrame";
import { Dock } from "@/components/shell/Dock";
import { SystemBar } from "@/components/shell/SystemBar";
import { Desktop } from "@/components/shell/Desktop";
import { Spotlight } from "@/components/shell/Spotlight";
import { pressFeedback } from "@/lib/chat/sounds";
import { notify, notifyError, notifyOk } from "@/lib/shell/notify";
import { objectUrl, readFile, requestPersistentStorage } from "@/lib/vfs/store";
import { sendFileToPeer } from "@/lib/p2p/file-transfer";
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
  wallpaper: "Görünüm — Duvar Kâğıdı ve Tema",
  transfer: "Aktarım Merkezi",

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
  const [packages, setPackages] = useState(false);
  const { node } = useShell();
  const status = describeNode(node);
  const isMobile = useIsMobile();
  const windows = useWindows();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surfaceH, setSurfaceH] = useState(600);
  const [spotlight, setSpotlight] = useState(false);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSurfaceH(el.clientHeight));
    ro.observe(el);
    setSurfaceH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Çevrimdışı güvence: dosyalar yer baskısında bile silinmesin.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // Evrensel arama kısayolu: Ctrl/Cmd + Boşluk.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSpotlight((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const launch = useCallback((id: string, fresh = false) => {
    pressFeedback();
    if (id === "relay") return setRelay(true);
    if (id === "mesh") return setMesh(true);
    if (id === "apps") return setPackages(true);

    const web = webApp(id);
    // Kayıt kontrolü: kayıtsız kimlik sessizce yutulmaz, pencere yine açılır.
    if (!getApp(id) && !web && import.meta.env.DEV) {
      console.warn(`[tbos] "${id}" AppRegistry'de kayıtlı değil.`);
    }
    openWindow(id, web ? web.label : (WINDOW_TITLES[id] ?? catalogApp(id)?.label ?? id), fresh);

  }, []);

  /** Sağ tık menüsündeki "Yeni Pencerede Aç": var olan pencere yeniden kullanılmaz. */
  const launchNew = useCallback((id: string) => launch(id, true), [launch]);

  /** Dosyalar penceresinden sürüklenen dosyayı hedef uygulamaya iletir. */
  const dropFile = useCallback(
    async (appId: string, raw: string) => {
      let meta: { id: string; name: string } | null = null;
      try {
        meta = JSON.parse(raw) as { id: string; name: string };
      } catch {
        return;
      }
      if (!meta?.id) return;
      if (appId === "media") {
        const url = await objectUrl(meta.id);
        if (!url) return notifyError("Dosya açılamadı", meta.name);
        window.dispatchEvent(new CustomEvent("tedbirge:open-media", { detail: { url } }));
        notifyOk("Medyada açıldı", meta.name);
        return;
      }
      if (appId === "messenger") {
        const peer = node.peers.find((p) => p.direct);
        if (!peer) return notify("Bağlı cihaz yok", "Önce bir cihazla eşleşin.");
        const file = await readFile(meta.id);
        if (!file) return notifyError("Dosya okunamadı", meta.name);
        try {
          await sendFileToPeer(peer.nodeId, file);
          notifyOk("Gönderiliyor", `${meta.name} → ${peer.nodeId.slice(0, 10)}`);
        } catch (err) {
          notifyError("Gönderim başarısız", err instanceof Error ? err.message : undefined);
        }
      }
    },
    [node.peers],
  );

  const visible = windows.filter((w) => !w.minimized);
  const top = visible.length ? visible.reduce((a, b) => (a.z > b.z ? a : b)) : null;

  return (
    <div className="tbos flex min-h-0 flex-1 flex-col">
      <SystemBar
        status={status.text}
        peers={status.directPeers}
        rttMs={node.rttMs}
        onSettings={() => launch("computer")}
        onPersonalize={() => launch("wallpaper")}
        onSearch={() => setSpotlight(true)}
      />


      {/* Masaüstü yüzeyi: duvar kâğıdı, kısayollar ve pencereler. */}
      <div ref={surfaceRef} className="relative min-h-0 flex-1 overflow-hidden">
        <Desktop onOpen={launch} onOpenNew={launchNew} draggable={!isMobile} columnsHeight={surfaceH} />

        {!isMobile && windows.length > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            {windows.map((w) => (
              <div
                key={w.id}
                className="pointer-events-auto contents"
                onDragOver={(e) => {
                  if (
                    (w.appId === "messenger" || w.appId === "media") &&
                    e.dataTransfer.types.includes("application/x-tedbirge-file")
                  ) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }
                }}
                onDrop={(e) => {
                  const raw = e.dataTransfer.getData("application/x-tedbirge-file");
                  if (!raw) return;
                  e.preventDefault();
                  void dropFile(w.appId, raw);
                }}
              >
                <WindowFrame win={w}>
                  <AppSurface win={w} onLaunch={launch} onTransfer={() => launch("transfer")} />
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
            <AppSurface win={top} onLaunch={launch} onTransfer={() => launch("transfer")} />
          </div>
        </div>
      ) : null}

      <Dock
        windows={windows}
        onLaunch={launch}
        onLaunchNew={launchNew}
        onStore={() => launch("store")}
      />

      <Spotlight open={spotlight} onClose={() => setSpotlight(false)} onLaunch={launch} />

      {/* Parlaklık ve gece ışığı filtresi tüm arayüzün üstünde durur. */}
      <div className="tbos-screen-filter" aria-hidden />

      <AppsDialog open={packages} onClose={() => setPackages(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
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
      <TedbirgeWebView
        url={web.url}
        label={web.label}
        embed={web.embed}
        {...(web.embedUrl ? { embedUrl: web.embedUrl } : {})}
        {...(web.proxy ? { proxy: web.proxy } : {})}
      />
    );
  }
  if (win.appId === "wallpaper") return <WallpaperSettingsApp />;

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
  if (win.appId === "computer")
    return <ComputerApp onMesh={() => onLaunch("mesh")} onLaunch={onLaunch} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      {win.appId === "music" && <MusicApp />}
      {win.appId === "media" && <MediaApp />}
      {win.appId === "files" && <FilesApp onTransfer={onTransfer} />}
    </div>
  );
}
