/**
 * TEDBIRGE® WEBOS — ÇALIŞMA ALANI
 * ------------------------------------------------------------------
 * Sade, tek renk "Açık Kristal" B2B çalışma alanı: Sohbet · Dosyalar ·
 * Ekip · Ağ & Sistem Durumu. Tüm renkler `--tb-*` token'larından okunur.
 *
 * VERİ DÜRÜSTLÜĞÜ: Bu ekranda hiçbir sayı uydurulmaz. Gerçek bir eş
 * bağlanmadıkça durum "1 Düğüm (Bu Cihaz) · Yerel Mod" olarak gösterilir,
 * ölçülmemiş metrikler "—" basar.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  FolderOpen,
  Lock,
  Globe,
  MessageSquare,
  Mic,
  Monitor,
  MonitorUp,
  Paperclip,
  PhoneOff,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Tablet,
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
import { getPeerIdentity, onPeerIdentity, peerDisplayLabel } from "@/lib/identity/peer-identity";

const LINK_HINTS = {
  direct: "Aynı yerel ağda aracı olmadan doğrudan bağlı",
  relay: "Şifreli paketler bir ara düğüm üzerinden taşınıyor; içerik açılamaz",
} as const;

function DeviceIcon({ kind }: { kind: DeviceKind }) {
  const cls = "h-4 w-4 shrink-0";
  const style = { color: "var(--tb-muted)" };
  if (kind === "mobile") return <Smartphone className={cls} style={style} aria-hidden />;
  if (kind === "tablet") return <Tablet className={cls} style={style} aria-hidden />;
  if (kind === "desktop") return <Monitor className={cls} style={style} aria-hidden />;
  return <Globe className={cls} style={style} aria-hidden />;
}

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
  const streamRef = useRef<MediaStream | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("data");
  };

  const request = async (kind: "av" | "audio") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("data");
      toast.error("Bu cihazda kamera/mikrofon erişimi yok. Veri düğümü olarak devam ediliyor.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "av" ? { audio: true, video: true } : { audio: true },
      );
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
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

  return { mode, request, stop };
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
  const { mode: media, request: requestMedia, stop: stopMedia } = useLocalMedia();

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
  useEffect(() => setHydrated(true), []);
  useEffect(() => onPeerIdentity(() => setIdentityTick((n) => n + 1)), []);

  useEffect(() => subscribeLivePeers(setSignalPeers), []);

  useEffect(() => {
    void ensureLiveNode();
    return onLiveMessage((msg) => setFeed((prev) => [...prev.slice(-80), msg]));
  }, []);

  useEffect(() => {
    let alive = true;
    void measureRoute(node.nodeId, node.peers, node.rttMs).then((r) => {
      if (alive) setRoute(r);
    });
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
        badge: shortBadge(node.nodeId),
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
      ...livePeers.map((p) => ({
        id: p.id,
        name: peerDisplayLabel(p.id),
        badge: shortBadge(p.id),
        kind: getPeerIdentity(p.id).kind ?? "browser",
        handle: p.direct ? "Doğrudan bağlı" : "Güvenli röle aktarımı",
        hint: p.direct ? LINK_HINTS.direct : LINK_HINTS.relay,
        direct: p.direct,
      })),
      ...signalPeers
        .filter((id) => !livePeers.some((p) => p.id === id))
        .map((id) => ({
          id,
          name: peerDisplayLabel(id),
          badge: shortBadge(id),
          kind: getPeerIdentity(id).kind ?? ("browser" as DeviceKind),
          handle: "Güvenli röle aktarımı · çevrimiçi",
          hint: LINK_HINTS.relay,
          direct: false,
        })),
    ];
  }, [hydrated, identityTick, livePeers, media, node.nodeId, selfLabel, signalPeers]);

  const peerCount = participants.length - 1;
  const localMode = peerCount === 0;
  const nodeCountLabel = localMode ? "1 düğüm (bu cihaz)" : `${participants.length} düğüm`;
  const networkLabel = localMode ? "Yerel Mod" : status.text;

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
    await broadcastText(text);
  };

  const navItems: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Sohbet", icon: MessageSquare },
    { id: "files", label: "Dosyalar", icon: FolderOpen },
    { id: "team", label: "Ekip", icon: Users },
  ];

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden font-osui"
      style={{ background: "var(--tb-bg)", color: "var(--tb-text)" }}
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
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-3">
              <div
                className="flex min-h-0 flex-col overflow-hidden rounded-xl backdrop-blur-sm xl:col-span-2"
                style={{ background: "var(--tb-panel)", border: "1px solid var(--tb-border)" }}
              >
                <div
                  className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--tb-border)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">Mesh Yayını</div>
                    <div className="truncate text-[12px]" style={{ color: "var(--tb-muted)" }}>
                      {localMode
                        ? "Yerel Mod · eş bekleniyor"
                        : `${peerCount} eş${route ? ` · ${route.hops} adım` : ""}`}
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
                      void requestMedia("av").then((ok) => {
                        setInCall(true);
                        setCamOn(ok);
                        setMicOn(ok);
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
                          void requestMedia("av").then((ok) => setCamOn(ok));
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
                          void requestMedia(camOn ? "av" : "audio").then((ok) => setMicOn(ok));
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

              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
                <Card title="Katılımcılar">
                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 text-[13px]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <DeviceIcon kind={p.kind} />
                          <span className="truncate">{p.self ? `${p.name} (siz)` : p.name}</span>
                          <span
                            className="shrink-0 text-[10px] tabular-nums"
                            style={{ color: "var(--tb-muted)", opacity: 0.65 }}
                            title="Teknik düğüm kimliği"
                          >
                            {p.badge}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-[11px]"
                          style={{ color: "var(--tb-muted)" }}
                          title={p.hint}
                        >
                          {p.handle}
                        </span>
                      </div>
                    ))}
                  </div>
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
                        İkinci bir cihaz ağa girdiğinde otomatik listelenecek
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
                    Şu an yalnızca bu cihaz bağlı (Yerel Mod). Bir eş katıldığında burada
                    listelenir.
                  </p>
                ) : null}
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px]"
                      style={{ background: "var(--tb-panel-soft)" }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <DeviceIcon kind={p.kind} />
                        <span className="truncate font-medium">
                          {p.self ? `${p.name} (siz)` : p.name}
                        </span>
                        <span
                          className="shrink-0 text-[10px] tabular-nums"
                          style={{ color: "var(--tb-muted)", opacity: 0.65 }}
                          title="Teknik düğüm kimliği"
                        >
                          {p.badge}
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-[12px]"
                        style={{ color: "var(--tb-muted)" }}
                        title={p.hint}
                      >
                        {p.handle}
                      </span>
                    </div>
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
                          Yerel Mod: henüz eş bağlanmadı, bu yüzden topolojide yalnızca bu cihaz
                          var.
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
