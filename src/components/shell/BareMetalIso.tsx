/**
 * BARE-METAL İMAJ AKIŞI — HAZIR İKİLİ TESLİMAT
 * ------------------------------------------------------------------
 * Son kullanıcı hiçbir şey derlemez. Tek akış:
 *   1) .iso dosyasını indir
 *   2) Rufus / BalenaEtcher / Ventoy ile USB'ye yaz
 *   3) Bilgisayarı USB'den başlat (Canlı Kiosk ya da Diske Kur)
 *
 * İmaj GitHub Actions hattında üretilir; bu bileşen yalnızca yayındaki
 * hazır dosyayı indirir. Yayında imaj yoksa sahte indirme başlatılmaz;
 * dürüst bir bilgi kartı açılır.
 *
 * Tüm renkler `--tb-*` değişkenlerinden okunur; dokunma hedefleri 48px.
 */

import { useCallback, useEffect, useState } from "react";
import { HardDriveDownload, Info, Loader2, Smartphone, X } from "lucide-react";

import {
  fetchIsoStatus,
  formatIsoSize,
  ISO_DOWNLOAD_ROUTE,
  ISO_RELEASES_PAGE,
  type IsoStatus,
} from "@/lib/iso-release";
import { isIosDevice, promptInstall } from "@/lib/pwa-install";

const STEPS: ReadonlyArray<{ tool: string; text: string }> = [
  {
    tool: "1 · İndirmeyi bekle",
    text: "Kurulum imajı İndirilenler klasörüne kaydedilir (bağlantı hızına göre birkaç dakika sürebilir).",
  },
  {
    tool: "2 · USB'ye yaz",
    text: "Rufus (GPT/UEFI), BalenaEtcher ya da Ventoy ile boş bir USB belleğe yazın.",
  },
  {
    tool: "3 · USB'den başlat",
    text: "Açılış menüsünde “Canlı Kiosk” hemen çalıştırır, “SSD/HDD'ye Kur” bilgisayara kalıcı kurar.",
  },
];

/* ------------------------------------------------------------------ */
/* Dürüst bilgi kartı için küçük genel depo                            */
/* ------------------------------------------------------------------ */

let fallbackOpen = false;
const listeners = new Set<() => void>();

function setFallback(open: boolean) {
  fallbackOpen = open;
  listeners.forEach((l) => l());
}

/** Yayında imaj yoksa açılan dürüst bilgi kartını gösterir. */
export function openIsoFallback() {
  setFallback(true);
}

function useFallbackOpen(): boolean {
  const [open, setOpen] = useState(fallbackOpen);
  useEffect(() => {
    const l = () => setOpen(fallbackOpen);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return open;
}

/* ------------------------------------------------------------------ */

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Yayındaki hazır imajı indirir. İmaj yoksa hiçbir dosya üretilmez;
 * dürüst bilgi kartı açılır.
 */
export async function startIsoDownload(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const status = await fetchIsoStatus();
  if (!status.ready) {
    openIsoFallback();
    return false;
  }
  triggerDownload(status.url || ISO_DOWNLOAD_ROUTE);
  return true;
}

export function useIsoDownload() {
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<IsoStatus | null>(null);

  const download = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const info = await fetchIsoStatus();
      setStatus(info);
      if (!info.ready) {
        openIsoFallback();
        return;
      }
      triggerDownload(info.url || ISO_DOWNLOAD_ROUTE);
      setGuide(true);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { guide, setGuide, download, busy, status };
}

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--tb-text)]">{title}</h2>
            <p className="mt-1 font-osmono text-[11px] text-[var(--tb-muted)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="wa-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--tb-muted)]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** İndirme başlayınca açılan USB yazdırma rehberi. */
export function IsoGuideDialog({
  open,
  onClose,
  status,
}: {
  open: boolean;
  onClose: () => void;
  status?: IsoStatus | null;
}) {
  if (!open) return null;
  const detay = [status?.version, formatIsoSize(status?.size ?? 0)].filter(Boolean).join(" · ");
  return (
    <Shell
      title="İndirme başladı — USB'ye yazdırma"
      subtitle={detay ? `Tedbirge® WebOS · ${detay}` : "Tedbirge® WebOS · bare-metal x86_64"}
      onClose={onClose}
    >
      <ol className="mt-4 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.tool} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tb-accent)_16%,transparent)] font-osmono text-[11px] text-[var(--tb-accent)]">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium text-[var(--tb-text)]">{s.tool}</span>
              <span className="block font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
                {s.text}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-osmono text-[11px] leading-relaxed text-[var(--tb-muted)]">
        Not: Bazı bilgisayarlarda USB'den açılış için BIOS/UEFI ayarlarından “Secure Boot”
        kapatılmalıdır.
      </p>
    </Shell>
  );
}

/**
 * Yayında imaj yokken açılan dürüst bilgi kartı.
 * Tek bir örneği kök düzende (`IsoFallbackHost`) monte edilir.
 */
export function IsoFallbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [iosHint, setIosHint] = useState(false);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") setIosHint(true);
    if (result === "accepted") onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <Shell
      title="Kurulum imajı hazırlanıyor"
      subtitle="Tedbirge® WebOS · bare-metal x86_64"
      onClose={onClose}
    >
      <p className="mt-3 flex gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3 font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Yeni sürüm derleniyor; hazır olduğunda bu düğme doğrudan .iso dosyasını indirir. Sahte bir
          dosya üretilmez. Sistemi hemen kullanmak için uygulamayı cihazınıza kurabilirsiniz.
        </span>
      </p>

      <button
        type="button"
        onClick={() => void install()}
        className="wa-press mt-4 flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--tb-accent)]/40 bg-[color-mix(in_srgb,var(--tb-accent)_10%,transparent)] px-4 py-3 text-left"
      >
        <Smartphone className="h-5 w-5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-[var(--tb-text)]">
            Uygulamayı Cihaza Yükle
          </span>
          <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
            Mobil, tablet ve bilgisayarda anında çalışır
          </span>
        </span>
      </button>

      {iosHint && (
        <p className="mt-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3 font-osmono text-[11px] leading-relaxed text-[var(--tb-muted)]">
          {isIosDevice()
            ? "iPhone/iPad: Safari'de Paylaş düğmesine dokunun → “Ana Ekrana Ekle”."
            : "Tarayıcınız kurulum penceresini açmadı. Adres çubuğundaki kurulum simgesini ya da menüdeki “Uygulamayı yükle” seçeneğini kullanın."}
        </p>
      )}

      <a
        href={ISO_RELEASES_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-press mt-3 flex min-h-12 items-center justify-center rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-text)]"
      >
        Yayınlanan sürümleri görüntüle
      </a>
    </Shell>
  );
}

/** Kök düzende bir kez monte edilir; genel bilgi kartını yönetir. */
export function IsoFallbackHost() {
  const open = useFallbackOpen();
  return <IsoFallbackDialog open={open} onClose={() => setFallback(false)} />;
}

/** Üst bar ve Sistem Ayarları'nda kullanılan indirme düğmesi. */
export function BareMetalIsoButton({ compact = false }: { compact?: boolean }) {
  const { guide, setGuide, download, busy, status } = useIsoDownload();
  const label = "Kurulum İmajını İndir (.iso)";
  return (
    <>
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        title={label}
        aria-label={label}
        className={
          compact
            ? "tbos-winbtn wa-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-accent)] sm:h-7 sm:w-7"
            : "wa-press inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-text)]"
        }
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <HardDriveDownload className="h-4 w-4" aria-hidden />
        )}
        {!compact && <span>{label}</span>}
      </button>
      <IsoGuideDialog open={guide} onClose={() => setGuide(false)} status={status} />
    </>
  );
}
