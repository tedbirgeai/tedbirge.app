/**
 * EKRAN OKUYUCU DUYURU BÖLGESİ
 * ------------------------------------------------------------------
 * Kabukta tek örnek olarak durur; `announce()` ile gönderilen metinleri
 * görsel olarak gizli bir `aria-live` alanında seslendirir.
 */

import { useAnnouncement } from "@/lib/shell/announce";

export function LiveRegion() {
  const message = useAnnouncement();
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
