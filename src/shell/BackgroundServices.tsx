/**
 * ARKA PLAN SERVİS KATMANI
 * ------------------------------------------------------------------
 * Düğüm çalışma zamanı, P2P dinleyicileri, erişim motoru, çevrimdışı
 * lisans ve gelen arama karşılayıcısı gibi görünmeyen işler burada
 * toplanır. Ekranda yer kaplamaz: kullanıcı hangi pencerede olursa
 * olsun arka plan sessizce çalışmaya devam eder.
 */

import { useEffect, type ReactNode } from "react";

import { runOneTimePurge } from "@/lib/hard-reset";
import { safeBoot, installGlobalRuntimeGuards } from "@/lib/runtime-guard";
import { serviceManager, markLeader } from "@/shell/services/services";
import { acquireLeadership } from "@/shell/services/registry";
import { CallHost } from "@/components/chat/CallHost";

export function BackgroundServicesProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Hiçbir arka plan hatası ilk çizimi düşürmez; hepsi günlüğe yazılır.
    const removeGuards = installGlobalRuntimeGuards();
    let releaseLead: (() => void) | undefined;

    // Eski mükerrer kayıtları temizleyen tek seferlik sıfırlama; sayfa yenilenir.
    let purged = false;
    safeBoot("hard-reset", () => {
      purged = runOneTimePurge();
    });

    if (!purged) {
      // Servisler bağımlılık sırasıyla başlar ve denetleyici tarafından izlenir.
      safeBoot("services", () => serviceManager().startAll());
      safeBoot("leader", () => {
        releaseLead = acquireLeadership("tedbirge-services-leader", markLeader);
      });
    }

    return () => {
      releaseLead?.();
      serviceManager().stopAll();
      removeGuards();
    };
  }, []);

  return (
    <>
      {/* Gelen arama her yüzeyde karşılanır (telefon mantığı). */}
      <CallHost />
      {children}
    </>
  );
}
