/**
 * PAYWALL MODALI
 * ------------------------------------------------------------------
 * Ücretsiz katmanda 5 aktif düğüm sınırı aşıldığında çekirdek katmanı
 * `tedbirge:paywall` olayını yayınlar; bu bileşen bulanık arka planlı
 * bilgilendirme kartını açar ve Profil & Hesap penceresine yönlendirir.
 */

import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";

import { FREE_PEER_LIMIT, PAYWALL_EVENT } from "@/lib/peer-limit";
import { openWindow } from "@/shell/windows";

export function PaywallModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEvent = () => setOpen(true);
    window.addEventListener(PAYWALL_EVENT, onEvent);
    return () => window.removeEventListener(PAYWALL_EVENT, onEvent);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[color-mix(in_srgb,var(--tb-bg)_78%,transparent)] p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Kapat"
          className="wa-press absolute right-2 top-2 grid min-h-12 min-w-12 place-items-center rounded-xl text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex items-center gap-2 text-[var(--tb-accent)]">
          <ShieldAlert className="h-5 w-5" aria-hidden />
          <h2 className="text-[15px] font-semibold">
            Ücretsiz ağ limiti aşıldı ({FREE_PEER_LIMIT}/{FREE_PEER_LIMIT} düğüm)
          </h2>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-[var(--tb-muted)]">
          Tedbirge WebOS ücretsiz katmanı en fazla {FREE_PEER_LIMIT} aktif düğüm bağlantısını
          destekler. Daha fazla düğüm, öncelikli API limiti ve kurumsal orkestrasyon için paketinizi
          yükseltin.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openWindow("profile", "Profil ve Hesap");
            }}
            className="wa-press min-h-12 flex-1 rounded-xl bg-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-bg)]"
          >
            Paketi yükselt
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="wa-press min-h-12 flex-1 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-text)]"
          >
            Düğümleri yönet / kapat
          </button>
        </div>
      </div>
    </div>
  );
}
