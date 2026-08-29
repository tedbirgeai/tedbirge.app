/**
 * TEDBIRGE® WEBOS — ÇALIŞMA ALANI
 * ------------------------------------------------------------------
 * Sade, tek renk "Açık Kristal" B2B çalışma alanı: Sohbet · Dosyalar ·
 * Ekip · Ağ & Sistem Durumu. Tüm renkler `--tb-*` token'larından okunur.
 *
 * VERİ DÜRÜSTLÜĞÜ: Bu ekranda hiçbir sayı uydurulmaz. Gerçek bir eş
 * bağlanmadıkça durum "1 Cihaz (bu cihaz) · Özel Ağ" olarak gösterilir,
 * ölçülmemiş metrikler "—" basar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  FolderOpen,
  Lock,
  MessageSquare,
  Mic,
  MonitorUp,
  Paperclip,
  PhoneOff,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

import { toast } from "sonner";

import { useNodeRuntime, describeNode } from "@/lib/node-runtime";
import { useLiveTelemetry, formatUptime } from "@/lib/telemetry/live-store";
import { NodeSettingsPanel } from "@/components/shell/NodeSettingsPanel";
import { SecurityPanel } from "@/components/shell/SecurityPanel";
import { AppErrorBoundary } from "@/components/shell/AppErrorBoundary";
import { FilesApp } from "@/components/shell/apps/FilesApp";

import {
  broadcastText,
  ensureLiveNode,
  measureRoute,
  nodeLabel,
  subscribeLivePeers,
  toLivePeers,
  onLiveMessage,
  type LiveMessage,
  type LivePeer,
} from "@/services/signaling";

import {
  composeIdentityLabel,
  getDeviceKind,
  getDeviceName,
  shortBadge,
  type DeviceKind,
} from "@/lib/identity/device";
import { getAlias } from "@/lib/chat/profile";
import { guard } from "@/lib/chat/errors";
import {
  getPeerIdentity,
  isNamedPeer,
  onPeerIdentity,
  peerDisplayLabel,
} from "@/lib/identity/peer-identity";
import { onNickname } from "@/lib/identity/peer-nickname";
import { PeerRow, type PeerRowData } from "@/components/chat/PeerRow";

const LINK_HINTS = {
  direct: "Aynı yerel ağda aracı olmadan doğrudan bağlı",
  relay: "Şifreli paketler bir ara düğüm üzerinden taşınıyor; içerik açılamaz",
} as const;

type Participant = {
  id: string;
  /** İnsan dostu ad: "Ahmet — Windows PC" */
  name: string;
  /** Teknik kimlik rozeti: #B32 */
  badge: string;
  handle: string;
  /** Durum etiketi üzerindeki açıklama. */
  hint?: string;
  kind: DeviceKind;
  self?: boolean;
  direct?: boolean;
  /** İnsan tarafından adlandırılmış (rehberde) eş mi? */
  named?: boolean;
  /** Röle üzerinden görünen düğüm. */
  relay?: boolean;
};

type TabId = "chat" | "files" | "team" | "system";

/** Ölçüm yoksa asla değer uydurmaz. */
function metric(value: number | null | undefined, unit = "", digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

/**
 * Yerel medya — TALEP ÜZERİNE.
 * Sayfa açılışında ASLA izin istenmez; cihaz "sadece veri düğümü" olarak
 * ağa katılır. Kamera/mikrofon yalnız kullanıcı butona bastığında açılır.
 */
function useLocalMedia() {
  const [mode, setMode] = useState<"av" | "audio" | "data">("data");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setMode("data");
  };

  const request = async (kind: "av" | "audio") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("data");
      toast.error("Bu cihazda kamera/mikrofon erişimi yok. Veri düğümü olarak devam ediliyor.");
      return false;
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia(
        kind === "av"
          ? {
              audio: { echoCancellation: true, noiseSuppression: true },
              // Ham RGB akış: renk dönüşümü veya filtre uygulanmaz.
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: "user",
              },
            }
          : { audio: { echoCancellation: true, noiseSuppression: true } },
      );

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = next;
      setStream(next);
      setMode(kind);
      return true;
    } catch {
      setMode("data");
      toast.error(
        kind === "av"
          ? "Kamera ve mikrofon izni verilmedi. Görüşme veri düğümü olarak sürüyor."
          : "Mikrofon izni verilmedi. Görüşme veri düğümü olarak sürüyor.",
      );
      return false;
    }
  };

  useEffect(() => () => stop(), []);

  return { mode, stream, request, stop };
}

/**
 * Mesh topolojisi — YALNIZCA gerçek düğümleri çizer.
 * Eş yoksa tek bir merkez düğüm (bu cihaz) görünür; sahte uydu düğüm yoktur.
 */
function MeshCanvas({ peerIds }: { peerIds: string[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const peersKey = peerIds.join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ids = peersKey ? peersKey.split("|") : [];
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--tb-accent").trim() || "#0f9d76";
    const muted = styles.getPropertyValue("--tb-muted").trim() || "#52627a";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(parent);

    function draw() {
      if (!ctx) return;
      const w = parent!.clientWidth;
      const h = parent!.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.max(40, Math.min(w, h) / 2 - 34);

      ids.forEach((id, i) => {
        const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
        const nx = cx + Math.cos(angle) * radius;
        const ny = cy + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = muted;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();

        if (w > 200) {
          ctx.font = "9px ui-monospace, monospace";
          ctx.fillStyle = muted;
          ctx.textAlign = nx > cx ? "right" : "left";
          ctx.fillText(id.slice(0, 10), nx + (nx > cx ? -9 : 9), ny - 8);
        }
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (w > 180) {
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillStyle = muted;
        ctx.textAlign = "center";
        ctx.fillText("Bu cihaz", cx, cy + 24);
      }
    }

    draw();
    return () => observer.disconnect();
  }, [peersKey]);

  return <canvas ref={ref} className="block h-full w-full bg-transparent" />;
}

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl p-4 backdrop-blur-sm ${className ?? ""}`}
      style={{
        background: "var(--tb-panel)",
        border: "1px solid var(--tb-border)",
        color: "var(--tb-text)",
      }}
    >
      {title ? (
        <h3
          className="mb-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--tb-muted)" }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-[13px]">
      <span style={{ color: "var(--tb-muted)" }}>{k}</span>
      <span className="truncate font-medium" style={{ color: "var(--tb-text)" }}>
        {v}
      </span>
    </div>
  );
}

/** Tedbirge® WebOS çalışma alanı. */
export default function Messenger() {
  const node = useNodeRuntime();
  const tele = useLiveTelemetry();
  const status = describeNode(node);
  const {
    mode: media,
    stream: localStream,
    request: requestMedia,
    stop: stopMedia,
  } = useLocalMedia();

  const [tab, setTab] = useState<TabId>("chat");
  const [systemView, setSystemView] = useState<"network" | "security" | "settings">("network");
  const [draft, setDraft] = useState("");
  const [feed, setFeed] = useState<LiveMessage[]>([]);
  const [route, setRoute] = useState<{ hops: number; cost: number } | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [signalPeers, setSignalPeers] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [identityTick, setIdentityTick] = useState(0);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const draftRef = useRef<HTMLInputElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => setHydrated(true), []);
  useEffect(() => onPeerIdentity(() => setIdentityTick((n) => n + 1)), []);
  useEffect(() => onNickname(() => setIdentityTick((n) => n + 1)), []);

  // Presence kalp atışı saniyede birkaç kez gelebilir; arayüzün titrememesi
  // için güncellemeler 300 ms geciktirilerek tek seferde uygulanır.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeLivePeers((ids) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        setSignalPeers((prev) => (prev.join("|") === ids.join("|") ? prev : ids));
      }, 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void guard("messenger.ensureLiveNode", ensureLiveNode());
    return onLiveMessage((msg) => setFeed((prev) => [...prev.slice(-80), msg]));
  }, []);

  useEffect(() => {
    let alive = true;
    void guard("messenger.measureRoute", measureRoute(node.nodeId, node.peers, node.rttMs)).then(
      (r) => {
        if (alive) setRoute(r);
      },
    );
    return () => {
      alive = false;
    };
  }, [node.nodeId, node.peers, node.rttMs]);

  const selfLabel = hydrated ? nodeLabel(node.nodeId) : nodeLabel("");
  const livePeers: LivePeer[] = useMemo(() => toLivePeers(node.peers), [node.peers]);

  const participants: Participant[] = useMemo(() => {
    void identityTick;
    const selfName =
      composeIdentityLabel(hydrated ? getAlias() : "", hydrated ? getDeviceName() : "") ||
      selfLabel;
    return [
      {
        id: node.nodeId || "self",
        name: selfName,
        // Sunucuda kimlik yoktur; hidrasyon uyuşmazlığı olmasın diye rozet
        // yalnızca istemci tarafında çözülür.
        badge: hydrated ? shortBadge(node.nodeId) : shortBadge(""),
        kind: hydrated ? getDeviceKind() : "browser",
        handle:
          media === "data"
            ? "Bu cihaz · yalnız veri"
            : media === "audio"
              ? "Bu cihaz · ses"
              : "Bu cihaz · ses ve görüntü",
        hint: "Şu an kullandığınız cihaz",
        self: true,
      },
      // Eş listesi yalnızca istemcide anlamlıdır; sunucu çıktısıyla
      // uyuşmazlık olmaması için hidrasyon tamamlanmadan render edilmez.
      ...(hydrated ? livePeers : []).map((p) => ({
        id: p.id,
        name: peerDisplayLabel(p.id),
        badge: shortBadge(p.id),
        kind: getPeerIdentity(p.id).kind ?? "browser",
        handle: p.direct ? "Doğrudan Güvenli Bağlantı" : "Güvenli Aktarıcı",
        hint: p.direct ? LINK_HINTS.direct : LINK_HINTS.relay,
        direct: p.direct,
        relay: !p.direct,
        named: isNamedPeer(p.id),
      })),
      ...(hydrated ? signalPeers : [])
        .filter((id) => !livePeers.some((p) => p.id === id))
        .map((id) => ({
          id,
          name: peerDisplayLabel(id),
          badge: shortBadge(id),
          kind: getPeerIdentity(id).kind ?? ("browser" as DeviceKind),
          handle: "Cihaz bulundu · bağlanıyor…",
          hint: "Cihaz ağda görünüyor; doğrudan hat kurulmaya çalışılıyor. Kurulamazsa şifreli röle üzerinden bağlanılır.",

          direct: false,
          relay: true,
          named: isNamedPeer(id),
        })),
    ];
  }, [hydrated, identityTick, livePeers, media, node.nodeId, selfLabel, signalPeers]);

  const knownPeers = useMemo(() => participants.filter((p) => !p.self && p.named), [participants]);
  const nearbyPeers = useMemo(
    () => participants.filter((p) => !p.self && !p.named),
    [participants],
  );
  const selfParticipant = participants[0]!;

  const openChatWith = useCallback((id: string) => {
    setTab("chat");
    setActivePeer(id);
    window.setTimeout(() => draftRef.current?.focus(), 0);
  }, []);

  const startCallWith = useCallback(
    (id: string) => {
      setTab("chat");
      setActivePeer(id);
      void guard("messenger.startCall", requestMedia("av")).then((ok) => {
        setInCall(true);
        setCamOn(Boolean(ok));
        setMicOn(Boolean(ok));
      });
    },
    [requestMedia],
  );

  const activePeerName = activePeer
    ? (participants.find((p) => p.id === activePeer)?.name ?? null)
    : null;

  const peerCount = participants.length - 1;
  const localMode = peerCount === 0;
  const bumpIdentity = useCallback(() => setIdentityTick((n) => n + 1), []);
  const nodeCountLabel = localMode
    ? "1 Cihaz (bu cihaz)"
    : `${participants.length} Aktif Cihaz Bağlı`;
  const networkLabel = localMode ? "Özel Ağ · Cihaz Bağlantısı Bekleniyor" : status.text;
  const p2pActive = !localMode && status.directPeers > 0;

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = camOn ? localStream : null;
  }, [camOn, localStream, inCall]);

  const stamp = () =>
    new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setFeed((prev) => [
      ...prev,
      { id: `self-${Date.now()}`, from: selfLabel, at: stamp(), text, self: true },
    ]);
    await guard("messenger.broadcastText", broadcastText(text), "Mesaj gönderilemedi.");
  };

  const navItems: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Sohbet", icon: MessageSquare },
    { id: "files", label: "Dosyalar", icon: FolderOpen },
    { id: "team", label: "Ekip", icon: Users },
  ];

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden font-osui"
      style={{
        background: "var(--tb-bg)",
        color: "var(--tb-text)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* ÜST BAR */}
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] backdrop-blur-sm"
        style={{ background: "var(--tb-panel)", borderBottom: "1px solid var(--tb-border)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[14px] font-semibold" style={{ color: "var(--tb-text)" }}>
            Tedbirge® WebOS
          </span>
          <span className="hidden truncate sm:inline" style={{ color: "var(--tb-muted)" }}>
            tedbirge.app çalışma alanı
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{ background: "var(--tb-panel-soft)", border: "1px solid var(--tb-border)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: localMode ? "var(--tb-muted)" : "var(--tb-accent)" }}
            />
            <span style={{ color: "var(--tb-muted)" }}>Ağ durumu:</span>
            <strong style={{ color: "var(--tb-text)" }}>{networkLabel}</strong>
          </span>
          {p2pActive ? (
            <span
              className="inline-flex animate-fade-in items-center gap-2 rounded-full px-3 py-1 transition-all duration-300 ease-in-out"
              style={{
                background: "var(--tb-panel-soft)",
                border: "1px solid var(--tb-border)",
                color: "var(--tb-text)",
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: "var(--tb-accent)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "var(--tb-accent)" }}
                />
              </span>
              Güvenli P2P Bağlantısı Aktif
            </span>
          ) : null}
          <span
            className="hidden items-center gap-1.5 rounded-full px-3 py-1 sm:inline-flex"
            style={{
              background: "var(--tb-panel-soft)",
              border: "1px solid var(--tb-border)",
              color: "var(--tb-muted)",
            }}
          >
            <Lock className="h-3.5 w-3.5" /> Uçtan uca şifreli
          </span>
          <Link
            to="/panel"
            className="rounded-full px-3 py-1 transition-colors"
            style={{
              background: "var(--tb-panel-soft)",
              border: "1px solid var(--tb-border)",
              color: "var(--tb-text)",
            }}
          >
            Hesabım
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        {/* SOL MENÜ */}
        <aside
          className="hidden w-56 shrink-0 flex-col justify-between rounded-xl p-3 backdrop-blur-sm lg:flex"
          style={{ background: "var(--tb-panel)", border: "1px solid var(--tb-border)" }}
        >
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors"
                style={
                  tab === id
                    ? {
                        background: "var(--tb-panel-soft)",
                        color: "var(--tb-accent)",
                        fontWeight: 600,
                      }
                    : { color: "var(--tb-muted)" }
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTab("system")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors"
              style={
                tab === "system"
                  ? {
                      background: "var(--tb-panel-soft)",
                      color: "var(--tb-accent)",
                      fontWeight: 600,
                    }
                  : { color: "var(--tb-muted)" }
              }
            >
              <Settings2 className="h-4 w-4" /> Ağ &amp; Sistem Durumu
            </button>
            <div
              className="rounded-lg p-3 text-[12px]"
              style={{ background: "var(--tb-panel-soft)", color: "var(--tb-muted)" }}
            >
              <div className="truncate">
                Kimlik: <strong style={{ color: "var(--tb-text)" }}>{selfLabel}</strong>
              </div>
              <div>{nodeCountLabel}</div>
            </div>
          </div>
        </aside>

        {/* İÇERİK */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Mobil sekme çubuğu */}
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {[...navItems, { id: "system" as TabId, label: "Ağ & Sistem", icon: Settings2 }].map(
              ({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
                  style={{
                    background: tab === id ? "var(--tb-panel-soft)" : "var(--tb-panel)",
                    border: "1px solid var(--tb-border)",
                    color: tab === id ? "var(--tb-accent)" : "var(--tb-muted)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ),
            )}
          </div>

          {tab === "chat" ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-3 xl:overflow-hidden">
              <div
                className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl backdrop-blur-sm xl:col-span-2 xl:min-h-0"
                style={{ background: "var(--tb-panel)", border: "1px solid var(--tb-border)" }}
              >
                <div
                  className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--tb-border)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">Mesh Yayını</div>
                    <div className="truncate text-[12px]" style={{ color: "var(--tb-muted)" }}>
                      {activePeerName
                        ? `${activePeerName} ile görüşme`
                        : localMode
                          ? "Özel Ağ · Cihaz Bağlantısı Bekleniyor"
                          : `${peerCount} Aktif Cihaz Bağlı${route ? ` · ${route.hops} adım` : ""}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (inCall) {
                        setInCall(false);
                        setCamOn(false);
                        setMicOn(false);
                        setScreenOn(false);
                        stopMedia();
                        return;
                      }
                      void guard("messenger.callToggle", requestMedia("av")).then((ok) => {
                        setInCall(true);
                        setCamOn(Boolean(ok));
                        setMicOn(Boolean(ok));
                      });
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium"
                    style={
                      inCall
                        ? {
                            background: "var(--tb-panel-soft)",
                            border: "1px solid var(--tb-border)",
                            color: "var(--tb-text)",
                          }
                        : { background: "var(--tb-accent)", color: "var(--tb-bg)" }
                    }
                  >
                    {inCall ? <PhoneOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {inCall ? "Görüşmeyi bitir" : "Görüşme başlat"}
                  </button>
                </div>

                {inCall ? (
                  <div
                    className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 text-[12px]"
                    style={{ borderBottom: "1px solid var(--tb-border)", color: "var(--tb-muted)" }}
                  >
                    {[
                      {
                        icon: Video,
                        label: camOn ? "Kamerayı kapat" : "Kamerayı aç",
                        on: camOn,
                        toggle: () => {
                          if (camOn) {
                            setCamOn(false);
                            if (!micOn) stopMedia();
                            return;
                          }
                          void guard("messenger.camera", requestMedia("av")).then((ok) =>
                            setCamOn(Boolean(ok)),
                          );
                        },
                      },
                      {
                        icon: Mic,
                        label: micOn ? "Mikrofonu kapat" : "Mikrofonu aç",
                        on: micOn,
                        toggle: () => {
                          if (micOn) {
                            setMicOn(false);
                            if (!camOn) stopMedia();
                            return;
                          }
                          void guard("messenger.mic", requestMedia(camOn ? "av" : "audio")).then(
                            (ok) => setMicOn(Boolean(ok)),
                          );
                        },
                      },
                      {
                        icon: MonitorUp,
                        label: screenOn ? "Ekran paylaşımını durdur" : "Ekran paylaş",
                        on: screenOn,
                        toggle: () => setScreenOn((v) => !v),
                      },
                    ].map(({ icon: Icon, label, on, toggle }) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={label}
                        aria-pressed={on}
                        title={label}
                        onClick={toggle}
                        className="grid h-9 w-9 place-items-center rounded-lg"
                        style={{
                          border: "1px solid var(--tb-border)",
                          background: on ? "var(--tb-panel-soft)" : "transparent",
                          color: on ? "var(--tb-accent)" : "var(--tb-muted)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                    <span>
                      Gecikme: {node.rttMs != null ? `${node.rttMs} ms` : "—"} · Katılımcı:{" "}
                      {participants.length}
                    </span>
                  </div>
                ) : null}

                <div
                  className={`shrink-0 overflow-hidden px-4 transition-all duration-300 ease-out ${
                    inCall ? "max-h-[70vh] pt-3 opacity-100" : "max-h-0 pt-0 opacity-0"
                  }`}
                  aria-hidden={!inCall}
                >
                  <div
                    className="grid gap-2 rounded-xl p-2 sm:grid-cols-2"
                    style={{
                      background: "var(--tb-panel-soft)",
                      border: "1px solid var(--tb-border)",
                    }}
                  >
                    <div
                      className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg sm:aspect-video"
                      style={{
                        background: "var(--tb-bg)",
                        // Cam efekti (backdrop-filter) üst katmanlardan sızıp
                        // kamera akışında renk kaymasına yol açmasın diye
                        // video kutusu ayrı bir kompozit katmana alınır.
                        isolation: "isolate",
                        backdropFilter: "none",
                        WebkitBackdropFilter: "none",
                        mixBlendMode: "normal",
                      }}
                    >
                      <video
                        ref={localVideoRef}
                        muted
                        playsInline
                        autoPlay
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{
                          display: camOn ? "block" : "none",
                          // Ham RGB: hiçbir renk dönüşümü / karışım uygulanmaz.
                          filter: "none",
                          backdropFilter: "none",
                          mixBlendMode: "normal",
                          opacity: 1,
                        }}
                      />
                      {!camOn ? (
                        <span className="text-[12px]" style={{ color: "var(--tb-muted)" }}>
                          {micOn ? "Ses görüşmesi sürüyor" : "Kamera kapalı"}
                        </span>
                      ) : null}
                      <span
                        className="absolute bottom-1.5 left-2 text-[11px]"
                        style={{ color: "var(--tb-muted)" }}
                      >
                        Siz
                      </span>
                    </div>
                    <div
                      className="grid aspect-[4/3] place-items-center rounded-lg text-center text-[12px] sm:aspect-video"
                      style={{ background: "var(--tb-bg)", color: "var(--tb-muted)" }}
                    >
                      {activePeerName
                        ? `${activePeerName} bağlanıyor…`
                        : "Karşı taraf bağlandığında görüntü burada belirir"}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
                  {feed.length === 0 ? (
                    <p
                      className="pt-10 text-center text-[13px]"
                      style={{ color: "var(--tb-muted)" }}
                    >
                      Henüz mesaj yok. Eş bağlandığında konuşma burada görünür.
                    </p>
                  ) : null}
                  {feed.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <div
                        className="flex justify-between gap-2 text-[11px]"
                        style={{ color: "var(--tb-muted)" }}
                      >
                        <span className="truncate font-medium">
                          {m.self ? `Siz · ${selfLabel}` : m.from}
                        </span>
                        <span className="shrink-0">{m.at}</span>
                      </div>
                      <p
                        className="inline-block max-w-full rounded-lg px-3 py-2 text-[14px]"
                        style={{
                          background: m.self ? "var(--tb-panel-soft)" : "transparent",
                          border: "1px solid var(--tb-border)",
                        }}
                      >
                        {m.text}
                      </p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                  className="flex shrink-0 items-center gap-2 px-3 py-3"
                  style={{ borderTop: "1px solid var(--tb-border)" }}
                >
                  <button
                    type="button"
                    aria-label="Dosya ekle"
                    onClick={() => setTab("files")}
                    className="grid h-9 w-9 place-items-center rounded-lg"
                    style={{ color: "var(--tb-muted)" }}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={draftRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Mesaj yazın…"
                    className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[14px] outline-none"
                    style={{
                      background: "var(--tb-panel-soft)",
                      border: "1px solid var(--tb-border)",
                      color: "var(--tb-text)",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium disabled:opacity-40"
                    style={{ background: "var(--tb-accent)", color: "var(--tb-bg)" }}
                  >
                    <Send className="h-4 w-4" /> Gönder
                  </button>
                </form>
              </div>

              <div className="flex min-h-0 flex-col gap-3 xl:overflow-y-auto">
                <Card title="Katılımcılar">
                  {knownPeers.length + nearbyPeers.length > 0 ? (
                    <p
                      className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--tb-muted)" }}
                    >
                      Rehberiniz
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    <PeerRow peer={selfParticipant as PeerRowData} />
                    {knownPeers.map((p) => (
                      <PeerRow
                        key={p.id}
                        peer={p as PeerRowData}
                        onMessage={openChatWith}
                        onCall={startCallWith}
                        onRenamed={bumpIdentity}
                      />
                    ))}
                  </div>

                  {nearbyPeers.length > 0 ? (
                    <>
                      <p
                        className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: "var(--tb-muted)" }}
                      >
                        Çevredeki ağ cihazları
                      </p>
                      <div className="space-y-1">
                        {nearbyPeers.map((p) => (
                          <PeerRow
                            key={p.id}
                            peer={p as PeerRowData}
                            onMessage={openChatWith}
                            onCall={startCallWith}
                            onRenamed={bumpIdentity}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}

                  {participants.length <= 1 ? (
                    <div
                      className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px]"
                      style={{
                        background: "var(--tb-panel-soft)",
                        border: "1px solid var(--tb-border)",
                        color: "var(--tb-muted)",
                      }}
                    >
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                          style={{ background: "var(--tb-accent)" }}
                        />
                        <span
                          className="relative inline-flex h-2 w-2 rounded-full"
                          style={{ background: "var(--tb-accent)" }}
                        />
                      </span>
                      <span className="min-w-0">
                        Ağ taranıyor, yeni cihazlar otomatik eklenecek
                      </span>
                    </div>
                  ) : null}
                </Card>
                <Card title="Oturum">
                  <Row k="Düğüm" v={nodeCountLabel} />
                  <Row k="Ağ durumu" v={networkLabel} />
                  <Row k="Kuyruk" v={String(node.queued)} />
                  <Row k="Gecikme" v={node.rttMs != null ? `${node.rttMs} ms` : "—"} />
                </Card>
              </div>
            </div>
          ) : null}

          {tab === "files" ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto rounded-xl p-4 backdrop-blur-sm"
              style={{ background: "var(--tb-panel)", border: "1px solid var(--tb-border)" }}
            >
              <AppErrorBoundary title="Dosyalar yüklenemedi">
                <FilesApp />
              </AppErrorBoundary>
            </div>
          ) : null}

          {tab === "team" ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              <Card title="Ekip">
                {participants.length === 1 ? (
                  <p className="text-[13px]" style={{ color: "var(--tb-muted)" }}>
                    Şu an yalnızca bu cihaz bağlı (Özel Ağ). Yeni bir cihaz katıldığında burada
                    listelenir.
                  </p>
                ) : null}
                <div className="space-y-1">
                  {participants.map((p) => (
                    <PeerRow
                      key={p.id}
                      peer={p as PeerRowData}
                      onMessage={openChatWith}
                      onCall={startCallWith}
                      onRenamed={bumpIdentity}
                    />
                  ))}
                </div>
              </Card>
            </div>
          ) : null}

          {tab === "system" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex shrink-0 gap-2">
                {(
                  [
                    { id: "network", label: "Ağ durumu", icon: Settings2 },
                    { id: "security", label: "Güvenlik", icon: ShieldCheck },
                    { id: "settings", label: "Düğüm ayarları", icon: Settings2 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSystemView(id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
                    style={{
                      background: systemView === id ? "var(--tb-panel-soft)" : "var(--tb-panel)",
                      border: "1px solid var(--tb-border)",
                      color: systemView === id ? "var(--tb-accent)" : "var(--tb-muted)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {systemView === "settings" ? (
                  <AppErrorBoundary title="Ayarlar penceresi yüklenemedi">
                    <NodeSettingsPanel />
                  </AppErrorBoundary>
                ) : systemView === "security" ? (
                  <AppErrorBoundary title="Güvenlik penceresi yüklenemedi">
                    <SecurityPanel />
                  </AppErrorBoundary>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Card title="Ağ özeti">
                      <div className="flex items-baseline justify-between pb-2">
                        <span
                          className="text-3xl font-semibold"
                          style={{ color: "var(--tb-accent)" }}
                        >
                          {participants.length}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--tb-muted)" }}>
                          {localMode ? "düğüm (yalnızca bu cihaz)" : "aktif düğüm"}
                        </span>
                      </div>
                      <Row k="Ağ durumu" v={networkLabel} />
                      <Row k="Doğrudan P2P eş" v={String(tele.directPeers)} />
                      <Row k="Kuyruktaki zarf" v={String(tele.queued)} />
                      <Row k="Oturum süresi" v={formatUptime(tele.uptimeMs)} />
                    </Card>

                    <Card title="Ölçümler">
                      <Row k="Ortalama gecikme" v={metric(tele.avgRttMs, " ms")} />
                      <Row k="Kalan bant genişliği" v={metric(tele.totalFreeKbps, " kbps")} />
                      <Row
                        k="Rota"
                        v={route ? `${route.hops} adım · maliyet ${route.cost}` : "—"}
                      />
                      <Row k="Gönderilen / hatalı" v={`${tele.sent} / ${tele.failed}`} />
                      <Row k="İmzasız reddedilen" v={String(tele.droppedUnsigned)} />
                    </Card>

                    <Card title="P2P topolojisi" className="lg:col-span-2">
                      <div
                        className="relative h-64 w-full overflow-hidden rounded-lg"
                        style={{ background: "var(--tb-bg-soft)" }}
                      >
                        <MeshCanvas
                          peerIds={participants.filter((p) => !p.self).map((p) => p.id)}
                        />
                      </div>
                      {localMode ? (
                        <p className="pt-3 text-[12px]" style={{ color: "var(--tb-muted)" }}>
                          Özel Ağ: henüz başka bir cihaz bağlanmadı, bu yüzden haritada yalnızca bu
                          cihaz var.
                        </p>
                      ) : null}
                    </Card>

                    <Card title="Çekirdek" className="lg:col-span-2">
                      <Row k="İşçi" v={tele.worker.alive ? "çalışıyor" : "kapalı"} />
                      <Row k="Wasm çekirdeği" v={tele.worker.wasm ? "etkin" : "devre dışı"} />
                      <Row
                        k="Taşıma"
                        v={tele.worker.shared ? "paylaşımlı bellek (kopyasız)" : "transferable"}
                      />
                      <Row k="Son hata" v={tele.lastError ?? "—"} />
                    </Card>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* ALT BAR */}
      <footer
        className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[11px]"
        style={{
          background: "var(--tb-panel)",
          borderTop: "1px solid var(--tb-border)",
          color: "var(--tb-muted)",
        }}
      >
        <span>
          {nodeCountLabel} · {networkLabel}
        </span>
        <span className="flex items-center gap-3">
          <span>Gecikme: {metric(tele.avgRttMs, " ms")}</span>
          <span>Kuyruk: {tele.queued}</span>
          <Link
            to="/dokumanlar"
            title="Geliştirici Portalı & API Dokümantasyonu"
            aria-label="Geliştirici Portalı & API Dokümantasyonu"
            className="hover:underline"
            style={{ color: "var(--tb-accent)" }}
          >
            Geliştirici Portalı
          </Link>
        </span>
      </footer>
    </div>
  );
}
