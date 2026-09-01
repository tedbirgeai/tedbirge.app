/**
 * BARE-METAL İMAJ AKIŞI — DÜRÜST SÜRÜM
 * ------------------------------------------------------------------
 * • Hazır imaj adresi (VITE_ISO_DOWNLOAD_URL) tanımlıysa: tek tıkla
 *   indirme başlar ve USB'ye yazdırma rehberi açılır.
 * • Tanımlı değilse: hiçbir sahte indirme ya da çalışmayan betik
 *   döngüsü başlatılmaz; kullanıcıya iki gerçek seçenek sunulur —
 *   (a) uygulamayı cihaza kur (PWA), (b) yerel ISO derleme rehberi.
 *
 * Tüm renkler `--tb-*` değişkenlerinden okunur; dokunma hedefleri 48px.
 */

import { useCallback, useEffect, useState } from "react";
import { HardDriveDownload, Info, Smartphone, Terminal, X } from "lucide-react";

import { hasRemoteIso, ISO_DOWNLOAD_URL, ISO_KIT_ROUTE } from "@/lib/iso-release";
import { isIosDevice, promptInstall } from "@/lib/pwa-install";

const STEPS: ReadonlyArray<{ tool: string; text: string }> = [
  {
    tool: "1 · İndirmeyi bekle",
    text: "İmaj dosyası İndirilenler klasörüne kaydedilir (bağlantı hızına göre birkaç dakika sürebilir).",
  },
  {
    tool: "2 · USB'ye yaz",
    text: "Rufus (GPT/UEFI), Ventoy (.iso'yu kopyala) veya BalenaEtcher ile USB belleğe yaz.",
  },
  {
    tool: "3 · Açılış",
    text: "Cihazı USB'den başlat; kabuk 127.0.0.1:8377 üzerinde kiosk modda açılır.",
  },
];

/* ------------------------------------------------------------------ */
/* Dürüst geri-dönüş kartı için küçük genel depo                       */
/* ------------------------------------------------------------------ */

let fallbackOpen = false;
const listeners = new Set<() => void>();

function setFallback(open: boolean) {
  fallbackOpen = open;
  listeners.forEach((l) => l());
}

/** Hazır imaj yoksa açılan dürüst seçenek kartını gösterir. */
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

/**
 * Hazır imaj adresi tanımlıysa sessizce indirmeyi başlatır ve `true`
 * döner. Tanımlı değilse indirme yapmaz, dürüst seçenek kartını açar.
 */
export function startIsoDownload(): boolean {
  if (typeof document === "undefined") return false;
  if (!hasRemoteIso()) {
    openIsoFallback();
    return false;
  }
  const a = document.createElement("a");
  a.href = ISO_DOWNLOAD_URL;
  a.rel = "noopener";
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export function useIsoDownload() {
  const [guide, setGuide] = useState(false);
  const download = useCallback(() => {
    if (startIsoDownload()) setGuide(true);
  }, []);
  return { guide, setGuide, download };
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

/** Hazır imaj indirilirken açılan USB yazdırma rehberi. */
export function IsoGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Shell
      title="İndirme başladı — USB'ye yazdırma"
      subtitle="Tedbirge® WebOS · bare-metal x86_64"
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
    </Shell>
  );
}

/**
 * Hazır imaj yayında değilken açılan dürüst seçenek kartı.
 * Tek bir örneği kök düzende (`IsoFallbackHost`) monte edilir.
 */
export function IsoFallbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [devGuide, setDevGuide] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") setIosHint(true);
    if (result === "accepted") onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <Shell
      title="Hazır bare-metal imaj henüz yayında değil"
      subtitle="Tedbirge® WebOS · dürüst kurulum seçenekleri"
      onClose={onClose}
    >
      <p className="mt-3 flex gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3 font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Sahte bir .iso üretilmez. Sistemi hemen kullanmak için uygulamayı cihazınıza kurun;
          önyüklenebilir imajı kendiniz üretmek istiyorsanız yerel derleme rehberini izleyin.
        </span>
      </p>

      {/* a) PWA kurulumu */}
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

      {/* b) Yerel derleme rehberi */}
      <button
        type="button"
        onClick={() => setDevGuide((v) => !v)}
        aria-expanded={devGuide}
        className="wa-press mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--tb-border)] px-4 py-3 text-left"
      >
        <Terminal className="h-5 w-5 shrink-0 text-[var(--tb-muted)]" aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-[var(--tb-text)]">
            Yerel ISO Derleme Rehberi
          </span>
          <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
            Yalnızca geliştiriciler için
          </span>
        </span>
      </button>

      {devGuide && (
        <ol className="mt-3 space-y-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3 font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
          <li>
            1. Windows'ta yönetici PowerShell açın ve şunu çalıştırın:
            <code className="mt-1 block rounded-lg bg-[var(--tb-panel-solid)] px-2 py-1 text-[var(--tb-text)]">
              wsl --install -d Ubuntu
            </code>
          </li>
          <li>2. Bilgisayarı yeniden başlatın ve Ubuntu oturumunu tamamlayın.</li>
          <li>
            3. Kurulum kitini indirin ve Linux kabuğunda çalıştırın:
            <code className="mt-1 block rounded-lg bg-[var(--tb-panel-solid)] px-2 py-1 text-[var(--tb-text)]">
              bash tedbirge-webos-iso-kurulum-kiti.sh
            </code>
          </li>
          <li>4. Üretilen .iso dosyasını Rufus, Ventoy veya BalenaEtcher ile USB'ye yazın.</li>
        </ol>
      )}

      {devGuide && (
        <a
          href={ISO_KIT_ROUTE}
          download
          className="wa-press mt-3 flex min-h-12 items-center justify-center rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-text)]"
        >
          Kurulum kitini indir (.zip)
        </a>
      )}
    </Shell>
  );
}

/** Kök düzende bir kez monte edilir; genel dürüst kartı yönetir. */
export function IsoFallbackHost() {
  const open = useFallbackOpen();
  return <IsoFallbackDialog open={open} onClose={() => setFallback(false)} />;
}

/** Üst bar ve Sistem Ayarları'nda kullanılan indirme düğmesi. */
export function BareMetalIsoButton({ compact = false }: { compact?: boolean }) {
  const { guide, setGuide, download } = useIsoDownload();
  const label = hasRemoteIso() ? "Bare-Metal ISO İndir (.iso)" : "Bare-Metal kurulum seçenekleri";
  return (
    <>
      <button
        type="button"
        onClick={download}
        title={label}
        aria-label={label}
        className={
          compact
            ? "tbos-winbtn wa-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-accent)] sm:h-7 sm:w-7"
            : "wa-press inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-text)]"
        }
      >
        <HardDriveDownload className="h-4 w-4" aria-hidden />
        {!compact && <span>{label}</span>}
      </button>
      <IsoGuideDialog open={guide} onClose={() => setGuide(false)} />
    </>
  );
}
