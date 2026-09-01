/**
 * BİLGİSAYARIM
 * ------------------------------------------------------------------
 * Beş sekmeli sistem paneli: Sistem Özeti, Depolama & VFS, Ağ & Mesh,
 * Uygulamalar & İzinler, Sistem Ayarları. Tüm değerler canlı okunur;
 * hiçbir sayı sabit yazılmaz. Renkler yalnız `--tb-*` değişkenlerinden.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { WindowEmpty, WindowShell } from "@/components/shell/WindowShell";
import { BUILD_LABEL } from "@/lib/build-id";
import { describeNode } from "@/lib/node-runtime";
import { listTransfers, onTransferChange, type Transfer } from "@/lib/p2p/file-transfer";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import {
  NETWORK_MODES,
  setNetworkMode,
  useNetworkMode,
} from "@/lib/shell/network-mode";
import { setVolume, useVolume } from "@/lib/ui/audio-gain";
import { FONT_SCALES, setFontScale, useFontScale } from "@/lib/ui/font-scale";
import { setTheme, THEMES, type ThemeId, getTheme } from "@/lib/ui/theme";
import { setBrightness, setNightLight, useWallpaper } from "@/lib/ui/wallpaper";
import {
  clearVfs,
  exportVfs,
  importVfs,
  isPersistentStorage,
  requestPersistentStorage,
  storageUsage,
  type StorageUsage,
} from "@/lib/vfs/store";
import { BareMetalIsoButton } from "@/components/shell/BareMetalIso";
import { CAPABILITY_LABELS } from "@/shell/permissions";
import { grantedCapabilities, revokeCapabilities } from "@/shell/permissions";
import { catalogApp, useDesktopState } from "@/shell/installed";
import { useShell } from "@/shell/ShellProvider";
import { capabilitiesOf } from "@/apps/registry";

type TabId = "ozet" | "depolama" | "ag" | "uygulamalar" | "ayarlar";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "ozet", label: "Sistem Özeti" },
  { id: "depolama", label: "Depolama & VFS" },
  { id: "ag", label: "Ağ & Mesh" },
  { id: "uygulamalar", label: "Uygulamalar & İzinler" },
  { id: "ayarlar", label: "Sistem Ayarları" },
];

const card =
  "rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-4";
const btn =
  "wa-press rounded-lg border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-text)]";

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="font-osmono text-[12px] text-[var(--tb-muted)]">{k}</dt>
      <dd className="truncate text-[13px] font-medium text-[var(--tb-text)]">{v}</dd>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between font-osmono text-[12px] text-[var(--tb-muted)]">
        {label}
        <span>{hint}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--tb-accent)]"
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */

function SummaryTab() {
  const { node } = useShell();
  const status = describeNode(node);
  const [uptime, setUptime] = useState(0);
  const [mem, setMem] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setUptime(Math.round(performance.now() / 1000));
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      setMem(perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : null);
    };
    tick();
    const t = window.setInterval(tick, 2000);
    return () => window.clearInterval(t);
  }, []);

  const device =
    typeof navigator === "undefined" ? "Bu cihaz" : navigator.platform || "Bu cihaz";
  const cores = typeof navigator === "undefined" ? 0 : (navigator.hardwareConcurrency ?? 0);
  const hh = Math.floor(uptime / 3600);
  const mm = Math.floor((uptime % 3600) / 60);
  const ss = uptime % 60;

  return (
    <div className="grid gap-3">
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Bu cihaz</h3>
        <dl className="mt-2">
          <Row k="Cihaz" v={device} />
          <Row k="Sistem" v={`Tedbirge OS · ${BUILD_LABEL}`} />
          <Row
            k="Çalışma süresi"
            v={`${hh > 0 ? `${hh} sa ` : ""}${mm} dk ${ss} sn`}
          />
          <Row k="Bellek kullanımı" v={mem != null ? `${mem} MB` : "ölçülemiyor"} />
          <Row k="İşlem hattı" v={cores ? `${cores} çekirdek` : "bilinmiyor"} />
        </dl>
      </div>
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Ağ ve çekirdek</h3>
        <dl className="mt-2">
          <Row k="Ağ durumu" v={status.text} />
          <Row k="Bağlı cihaz" v={String(status.directPeers)} />
          <Row k="Yönlendirme çekirdeği" v={node.running ? "çalışıyor" : "duraklatıldı"} />
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StorageTab() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [persist, setPersist] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setUsage(await storageUsage());
    setPersist(await isPersistentStorage());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const used = usage?.bytes ?? 0;
  const quota = usage?.quota ?? null;
  const pct = quota ? Math.min(100, Math.round((used / quota) * 1000) / 10) : 0;

  const doExport = async () => {
    setBusy(true);
    try {
      const backup = await exportVfs();
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tedbirge-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifyOk("Yedek indirildi", `${backup.files.length} dosya`);
    } catch {
      notifyError("Yedek alınamadı", "Yerel depolama okunamadı.");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const count = await importVfs(JSON.parse(await file.text()));
      notifyOk("Yedek yüklendi", `${count} dosya geri getirildi`);
      await refresh();
    } catch {
      notifyError("Yedek yüklenemedi", "Dosya bir Tedbirge yedeği değil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Yerel depolama</h3>
        <p className="mt-1 font-osmono text-[12px] text-[var(--tb-muted)]">
          {bytes(used)} kullanıldı{quota ? ` · ${bytes(quota)} ayrılmış alan` : ""} ·{" "}
          {usage?.files ?? 0} dosya
        </p>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--tb-border)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Depolama kullanımı"
        >
          <div className="h-full bg-[var(--tb-accent)]" style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--tb-text)]">Kalıcı depolama</p>
            <p className="text-[12px] text-[var(--tb-muted)]">
              Açıkken tarayıcı yer açmak için dosyalarınızı silmez.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={persist}
            onClick={async () => {
              const ok = await requestPersistentStorage();
              setPersist(ok);
              if (ok) notifyOk("Kalıcı depolama açık");
              else notifyError("İzin verilmedi", "Tarayıcı kalıcı depolamayı reddetti.");
            }}
            className={`${btn} shrink-0 ${persist ? "border-[var(--tb-accent)] text-[var(--tb-accent)]" : ""}`}
          >
            {persist ? "Açık" : "İzin ver"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={btn} onClick={() => void doExport()}>
          Verileri dışa aktar (.json)
        </button>
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => fileRef.current?.click()}
        >
          Yedek yükle
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${btn} border-[var(--tb-accent)] text-[var(--tb-accent)]`}
          onClick={async () => {
            await clearVfs();
            await refresh();
            notifyOk("Yerel önbellek temizlendi");
          }}
        >
          VFS önbelleğini temizle
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void doImport(f);
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NetworkTab() {
  const mode = useNetworkMode();
  const { node } = useShell();
  const [queue, setQueue] = useState<Transfer[]>([]);

  useEffect(() => {
    const sync = () => setQueue(listTransfers().filter((t) => t.status !== "tamam"));
    sync();
    return onTransferChange(sync);
  }, []);

  return (
    <div className="grid gap-3">
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Ağ modu</h3>
        <div className="mt-3 grid gap-2">
          {NETWORK_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setNetworkMode(m.id)}
              aria-pressed={mode === m.id}
              className={`wa-press rounded-xl border px-3 py-2 text-left ${
                mode === m.id
                  ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                  : "border-[var(--tb-border)] text-[var(--tb-text)]"
              }`}
            >
              <span className="block text-[13px] font-medium">{m.label}</span>
              <span className="block text-[12px] text-[var(--tb-muted)]">{m.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Bağlı cihazlar</h3>
        {node.peers.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--tb-muted)]">
            Henüz eşleşen cihaz yok — çevredeki cihazlar aranıyor.
          </p>
        ) : (
          <ul className="mt-2 grid gap-1">
            {node.peers.map((p) => (
              <li key={p.nodeId} className="flex items-center justify-between gap-3">
                <span className="truncate font-osmono text-[12px] text-[var(--tb-text)]">
                  {p.nodeId}
                </span>
                <span className="shrink-0 text-[12px] text-[var(--tb-muted)]">
                  {p.direct ? "doğrudan" : "aktarıcı üzerinden"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Aktarım kuyruğu</h3>
        {queue.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--tb-muted)]">Kuyruk boş.</p>
        ) : (
          <ul className="mt-2 grid gap-1">
            {queue.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[13px] text-[var(--tb-text)]">{t.name}</span>
                <span className="shrink-0 font-osmono text-[12px] text-[var(--tb-muted)]">
                  {t.percent}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AppsTab({ onLaunch }: { onLaunch: (id: string) => void }) {
  const { installed } = useDesktopState();
  const [, bump] = useState(0);

  if (installed.length === 0) {
    return <WindowEmpty title="Kurulu uygulama yok" hint="Mağazadan uygulama ekleyebilirsiniz." />;
  }

  return (
    <div className="grid gap-3">
      {installed.map((id) => {
        const app = catalogApp(id);
        if (!app) return null;
        const wanted = capabilitiesOf(id);
        const granted = grantedCapabilities(id);
        return (
          <div key={id} className={card}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[var(--tb-text)]">
                  {app.label}
                </p>
                <p className="truncate text-[12px] text-[var(--tb-muted)]">{app.hint}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className={btn} onClick={() => onLaunch(id)}>
                  Yeniden başlat
                </button>
                {granted.length > 0 ? (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      revokeCapabilities(id);
                      bump((v) => v + 1);
                      notifyOk("İzinler sıfırlandı", app.label);
                    }}
                  >
                    Sıfırla
                  </button>
                ) : null}
              </div>
            </div>
            {wanted.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {wanted.map((c) => (
                  <li
                    key={c}
                    className={`rounded-full border px-2 py-0.5 font-osmono text-[11px] ${
                      granted.includes(c)
                        ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                        : "border-[var(--tb-border)] text-[var(--tb-muted)]"
                    }`}
                  >
                    {CAPABILITY_LABELS[c]?.title ?? c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-[var(--tb-muted)]">Ek izin istemiyor.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SettingsTab() {
  const wp = useWallpaper();
  const volume = useVolume();
  const fontScale = useFontScale();
  const [theme, setThemeState] = useState<ThemeId>(() => getTheme());

  return (
    <div className="grid gap-3">
      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">
          Hakkında · Cihaza kurulum
        </h3>
        <p className="mt-1 font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
          Tedbirge® WebOS'i bir bilgisayara işletim sistemi olarak kurmak için
          önyüklenebilir imajı indirin.
        </p>
        <div className="mt-3">
          <BareMetalIsoButton />
        </div>
      </div>

      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Tema</h3>
        <div className="mt-3 grid gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={theme === t.id}
              onClick={() => {
                setTheme(t.id);
                setThemeState(t.id);
              }}
              className={`wa-press rounded-xl border px-3 py-2 text-left ${
                theme === t.id
                  ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                  : "border-[var(--tb-border)] text-[var(--tb-text)]"
              }`}
            >
              <span className="block text-[13px] font-medium">{t.label}</span>
              <span className="block text-[12px] text-[var(--tb-muted)]">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} grid gap-4`}>
        <Slider
          label="Ekran parlaklığı"
          value={wp.brightness}
          min={0.4}
          max={1.2}
          step={0.05}
          onChange={setBrightness}
          hint={`${Math.round(wp.brightness * 100)}%`}
        />
        <Slider
          label="Gece filtresi"
          value={wp.night}
          min={0}
          max={0.6}
          step={0.05}
          onChange={setNightLight}
          hint={wp.night === 0 ? "kapalı" : `${Math.round((wp.night / 0.6) * 100)}%`}
        />
        <Slider
          label="Sistem sesi"
          value={volume}
          min={0}
          max={1}
          step={0.05}
          onChange={setVolume}
          hint={`${Math.round(volume * 100)}%`}
        />
      </div>

      <div className={card}>
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Yazı tipi boyutu</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {FONT_SCALES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={fontScale === s.id}
              onClick={() => setFontScale(s.id)}
              className={`wa-press rounded-xl border px-3 py-2 text-[13px] ${
                fontScale === s.id
                  ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                  : "border-[var(--tb-border)] text-[var(--tb-text)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ComputerApp({
  onMesh,
  onLaunch,
}: {
  onMesh: () => void;
  onLaunch?: (id: string) => void;
}) {
  const [tab, setTab] = useState<TabId>("ozet");

  return (
    <WindowShell
      title="Bilgisayarım"
      subtitle="Cihaz, depolama, ağ ve sistem ayarları"
      padded={false}
      toolbar={
        <button type="button" className={btn} onClick={onMesh}>
          Ağ durumu
        </button>
      }
    >
      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-[var(--tb-border)] bg-[var(--tb-panel-solid)] px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`wa-press shrink-0 rounded-lg px-3 py-1.5 font-osmono text-[12px] ${
              tab === t.id
                ? "bg-[var(--tb-accent)]/12 text-[var(--tb-accent)]"
                : "text-[var(--tb-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "ozet" ? <SummaryTab /> : null}
        {tab === "depolama" ? <StorageTab /> : null}
        {tab === "ag" ? <NetworkTab /> : null}
        {tab === "uygulamalar" ? <AppsTab onLaunch={onLaunch ?? (() => onMesh())} /> : null}
        {tab === "ayarlar" ? <SettingsTab /> : null}
      </div>
    </WindowShell>
  );
}
