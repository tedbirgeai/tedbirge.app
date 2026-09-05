/**
 * ARKA PLAN SERVİS KATMANI
 * ------------------------------------------------------------------
 * Düğüm çalışma zamanı, P2P dinleyicileri, erişim motoru, çevrimdışı
 * lisans ve gelen arama karşılayıcısı gibi görünmeyen işler burada
 * toplanır. Ekranda yer kaplamaz: kullanıcı hangi pencerede olursa
 * olsun arka plan sessizce çalışmaya devam eder.
 */

import { useEffect, type ReactNode } from "react";

import { setupOfflineSupport } from "@/lib/pwa";
import { bootNodeRuntime, startNode } from "@/lib/node-runtime";
import { bootAccessEngine } from "@/lib/access-tiers";
import { ensureOfflineGrant } from "@/lib/offline-license";
import { runOneTimePurge } from "@/lib/hard-reset";
import { syncViewportUnits } from "@/lib/ui/viewport";
import { safeBoot, installGlobalRuntimeGuards } from "@/lib/runtime-guard";
import { CallHost } from "@/components/chat/CallHost";

export function BackgroundServicesProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Hiçbir arka plan hatası ilk çizimi düşürmez; hepsi günlüğe yazılır.
    const removeGuards = installGlobalRuntimeGuards();
    let stopViewport: (() => void) | undefined;

    // Eski mükerrer kayıtları temizleyen tek seferlik sıfırlama; sayfa yenilenir.
    let purged = false;
    safeBoot("hard-reset", () => {
      purged = runOneTimePurge();
    });

    if (!purged) {
      safeBoot("offline-support", () => setupOfflineSupport());
      safeBoot("node-runtime", () => bootNodeRuntime());
      // Düğüm arka planda otomatik başlar; kullanıcı hiçbir butona basmaz.
      safeBoot("node-start", () => startNode());
      safeBoot("access-engine", () => bootAccessEngine());
      safeBoot("offline-license", () => ensureOfflineGrant());
      safeBoot("viewport", () => {
        stopViewport = syncViewportUnits();
      });
    }

    return () => {
      stopViewport?.();
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
