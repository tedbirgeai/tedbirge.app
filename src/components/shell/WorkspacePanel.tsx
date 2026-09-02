import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

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
import { AyarlarApp } from "@/components/shell/apps/AyarlarApp";
import { SistemBilgisiApp } from "@/components/shell/apps/SistemBilgisiApp";
import { PanelApp } from "@/components/shell/apps/PanelApp";
import { ProfileApp } from "@/components/shell/apps/ProfileApp";

import { WindowFrame } from "@/components/shell/WindowFrame";
import { AppErrorBoundary } from "@/components/shell/AppErrorBoundary";
import { WindowSwitcher } from "@/components/shell/WindowSwitcher";
import { LiveRegion } from "@/components/shell/LiveRegion";
import { Dock } from "@/components/shell/Dock";
import { SystemBar } from "@/components/shell/SystemBar";
import { Desktop } from "@/components/shell/Desktop";
import { Spotlight } from "@/components/shell/Spotlight";
import { pressFeedback } from "@/lib/chat/sounds";
import { notify, notifyError, notifyOk } from "@/lib/shell/notify";
import { objectUrl, readFile, requestPersistentStorage } from "@/lib/vfs/store";
import { TransfersApp } from "@/components/shell/apps/TransfersApp";
import { sendFileToPeer } from "@/lib/p2p/file-transfer";
import { describeNode } from "@/lib/node-runtime";
import { deviceScopeLabel } from "@/lib/identity/device";
import { useShell } from "@/shell/shell-context";
import { useIsCompact } from "@/hooks/use-mobile";
import { webApp } from "@/shell/web-apps";
import { catalogApp } from "@/shell/installed";
import { getApp } from "@/apps/registry";
import { getFontScale } from "@/lib/ui/font-scale";

import { closeWindow, openWindow, useWindows, type WindowRecord } from "@/shell/windows";

/** Messenger ağır bir uygulamadır: yalnız penceresi açıldığında yüklenir. */
const MessengerApp = lazy(() => import("@/components/Messenger"));

const WINDOW_TITLES: Record<string, string> = {
  messenger: "Sohbet — P2P Ses / Görüntü",
  music: "Müzik",
  media: "Medya — Wasm Kum Havuzu Oynatıcı",
  files: "Dosyalar",
  store: "Tedbirge Mağaza",
  wallpaper: "Görünüm — Duvar Kâğıdı ve Tema",
  transfer: "Aktarım Merkezi",
  settings: "Ayarlar",
  sysinfo: "Sistem Bilgisi",
  panel: "Panel — Lisans ve Saha",
  profile: "Profil ve Hesap",

};

/** Pencere başlığı: "computer" cihaz türüne göre adlandırılır. */
function windowTitle(id: string): string | undefined {
  if (id === "computer") return deviceScopeLabel();
  return WINDOW_TITLES[id];
}


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
  // Telefon ve tablet: pencere yöneticisi yerine tam ekran kart düzeni.
  const isMobile = useIsCompact();
  const windows = useWindows();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState(false);



  // Çevrimdışı güvence: dosyalar yer baskısında bile silinmesin.
  useEffect(() => {
    void requestPersistentStorage();
    // Kayıtlı yazı tipi ölçeği açılışta uygulanır.
    getFontScale();
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
    openWindow(id, web ? web.label : (windowTitle(id) ?? catalogApp(id)?.label ?? id), fresh);

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
      <AppErrorBoundary title="Sistem çubuğu" appId="shell.systembar">
        <SystemBar
          status={status.text}
        peers={status.directPeers}
        rttMs={node.rttMs}
        onSettings={() => launch("settings")}
        onProfile={() => launch("profile")}
        onPersonalize={() => launch("wallpaper")}
          onSearch={() => setSpotlight(true)}
        />
      </AppErrorBoundary>


      {/* Masaüstü yüzeyi: duvar kâğıdı, kısayollar ve pencereler. */}
      <div ref={surfaceRef} className="relative min-h-0 flex-1 overflow-hidden">
        <AppErrorBoundary title="Masaüstü" appId="shell.desktop">
          <Desktop onOpen={launch} onOpenNew={launchNew} />
        </AppErrorBoundary>

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
                  {/* Hata yalıtımı: uygulama çökse de kabuk ayakta kalır. */}
                  <AppErrorBoundary title={w.title} appId={w.appId}>
                    <AppSurface win={w} onLaunch={launch} onTransfer={() => launch("transfer")} />
                  </AppErrorBoundary>
                </WindowFrame>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Mobil/tablet: tek uygulama tam ekran kart olarak açılır. */}
      {isMobile && top ? (
        <MobileAppShell win={top} onLaunch={launch} onTransfer={() => launch("transfer")} />
      ) : null}


      <AppErrorBoundary title="Görev çubuğu" appId="shell.dock">
        <Dock
          windows={windows}
          onLaunch={launch}
          onLaunchNew={launchNew}
          onStore={() => launch("store")}
        />
      </AppErrorBoundary>

      <WindowSwitcher surface={surfaceRef} />
      <LiveRegion />

      <Spotlight open={spotlight} onClose={() => setSpotlight(false)} onLaunch={launch} />

      {/* Parlaklık ve gece ışığı filtresi tüm arayüzün üstünde durur. */}
      <div className="tbos-screen-filter" aria-hidden />

      <AppsDialog open={packages} onClose={() => setPackages(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
    </div>
  );
}

/**
 * MOBİL / TABLET UYGULAMA KABUĞU
 * Tam ekran kart; başlıktan aşağı kaydırma (swipe) ile kapanır ve
 * kapatma düğmesi 48px dokunma alanındadır.
 */
function MobileAppShell({
  win,
  onLaunch,
  onTransfer,
}: {
  win: WindowRecord;
  onLaunch: (id: string) => void;
  onTransfer: () => void;
}) {
  const start = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  // Sol kenardan sağa kaydırma: pencereyi yumuşakça kapatır.
  const edge = useEdgeBackGesture(() => closeWindow(win.id));

  // Donanım geri tuşu / kenar jesti: uygulamayı kapatır, siteden çıkarmaz.
  useEffect(() => {
    const id = win.id;
    let popped = false;
    window.history.pushState({ tbosWindow: id }, "");
    const onPop = () => {
      popped = true;
      closeWindow(id);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Düğmeyle kapatıldıysa bizim eklediğimiz geçmiş katmanı geri alınır.
      if (!popped && (window.history.state as { tbosWindow?: string } | null)?.tbosWindow === id) {
        window.history.back();
      }
    };
  }, [win.id]);

  return (
    <div
      className="tbos tbos-mobile-app fixed inset-0 z-[70] flex flex-col bg-[var(--tb-bg)]"
      style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
    >
      <div
        className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--tb-border)] bg-[var(--tb-bg)] px-2 py-2"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
        onTouchStart={(e) => {
          start.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(e) => {
          if (start.current == null) return;
          const dy = (e.touches[0]?.clientY ?? 0) - start.current;
          setDrag(Math.max(0, dy));
        }}
        onTouchEnd={() => {
          if (drag > 90) closeWindow(win.id);
          start.current = null;
          setDrag(0);
        }}
      >
        <button
          type="button"
          onClick={() => closeWindow(win.id)}
          aria-label="Ana ekrana dön"
          className="wa-press flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--tb-fg)]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <span className="flex min-w-0 flex-1 flex-col">
          <span aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-[var(--tb-border)]" />
          <h2 className="truncate text-center font-osmono text-[13px] text-[var(--tb-muted)]">
            {win.title}
          </h2>
        </span>
        <button
          type="button"
          onClick={() => closeWindow(win.id)}
          aria-label="Kapat"
          className="wa-press flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--tb-muted)]"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppErrorBoundary title={win.title} appId={win.appId}>
          <AppSurface win={win} onLaunch={onLaunch} onTransfer={onTransfer} />
        </AppErrorBoundary>
      </div>
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
  if (win.appId === "settings") return <AyarlarApp />;
  if (win.appId === "sysinfo") return <SistemBilgisiApp />;
  if (win.appId === "panel") return <PanelApp />;
  if (win.appId === "profile") return <ProfileApp onOpen={onLaunch} />;

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
  if (win.appId === "transfer") return <TransfersApp />;
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
