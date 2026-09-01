/**
 * BARE-METAL ISO İNDİRME AKIŞI
 * ------------------------------------------------------------------
 * "Bare-Metal ISO İndir (.iso)" düğmesi indirmeyi anında başlatır ve
 * USB'ye yazdırma adımlarını anlatan rehber kartını açar. Tüm renkler
 * `--tb-*` değişkenlerinden okunur.
 */

import { useCallback, useState } from "react";
import { HardDriveDownload, X } from "lucide-react";

const ISO_ROUTE = "/api/public/iso";

const STEPS: ReadonlyArray<{ tool: string; text: string }> = [
  {
    tool: "Rufus (Windows)",
    text: "USB belleği tak → imajı seç → Bölüm düzeni GPT, hedef sistem UEFI → Başlat.",
  },
  {
    tool: "Ventoy (tüm sistemler)",
    text: "USB'yi bir kez Ventoy ile hazırla, sonra .iso dosyasını kopyalaman yeterli.",
  },
  {
    tool: "BalenaEtcher (macOS/Linux)",
    text: "Flash from file → imaj → Select target → USB → Flash.",
  },
  {
    tool: "Açılış",
    text: "Cihazı USB'den başlat; kabuk 127.0.0.1:8377 üzerinde kiosk modda açılır.",
  },
];

/** Sessiz indirme: hiçbir arayüz katmanı açmadan imajı indirmeye başlar. */
export function startIsoDownload() {
  if (typeof document === "undefined") return;
  // Aynı sekmede gizli bir indirme: sayfa terk edilmez, kabuk kapanmaz.
  const a = document.createElement("a");
  a.href = ISO_ROUTE;
  a.rel = "noopener";
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function useIsoDownload() {
  const [guide, setGuide] = useState(false);
  const download = useCallback(() => {
    startIsoDownload();
    setGuide(true);
  }, []);
  return { guide, setGuide, download };
}

/** Rehber kartı: indirme başlar başlamaz görünür. */
export function IsoGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Bare-Metal ISO kurulum rehberi"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--tb-text)]">
              İndirme başladı — USB'ye yazdırma
            </h2>
            <p className="mt-1 font-osmono text-[11px] text-[var(--tb-muted)]">
              Tedbirge® WebOS · bare-metal x86_64
            </p>
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

        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.tool} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tb-accent)_16%,transparent)] font-osmono text-[11px] text-[var(--tb-accent)]">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-[var(--tb-text)]">
                  {s.tool}
                </span>
                <span className="block font-osmono text-[11.5px] leading-relaxed text-[var(--tb-muted)]">
                  {s.text}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3 font-osmono text-[11px] leading-relaxed text-[var(--tb-muted)]">
          Yayın paketinde imaj yoksa indirilen dosya, imajı kendi makinenizde
          üreten kurulum kitidir (<code>bash ...kurulum-kiti.sh</code>). Sahte bir
          .iso asla üretilmez.
        </p>
      </div>
    </div>
  );
}

/** Üst bar ve Sistem Ayarları'nda kullanılan indirme düğmesi. */
export function BareMetalIsoButton({ compact = false }: { compact?: boolean }) {
  const { guide, setGuide, download } = useIsoDownload();
  return (
    <>
      <button
        type="button"
        onClick={download}
        title="Bare-Metal ISO İndir (.iso)"
        aria-label="Bare-Metal ISO İndir"
        className={
          compact
            ? "tbos-winbtn wa-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-accent)] sm:h-7 sm:w-7"
            : "wa-press inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-text)]"
        }
      >
        <HardDriveDownload className="h-4 w-4" aria-hidden />
        {!compact && <span>Bare-Metal ISO İndir (.iso)</span>}
      </button>
      <IsoGuideDialog open={guide} onClose={() => setGuide(false)} />
    </>
  );
}
