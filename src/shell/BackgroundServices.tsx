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
import { CallHost } from "@/components/chat/CallHost";

export function BackgroundServicesProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Eski mükerrer kayıtları temizleyen tek seferlik sıfırlama; sayfa yenilenir.
    if (runOneTimePurge()) return;
    setupOfflineSupport();
    bootNodeRuntime();
    // Düğüm arka planda otomatik başlar; kullanıcı hiçbir butona basmaz.
    void startNode();
    bootAccessEngine();
    void ensureOfflineGrant();
    return syncViewportUnits();
  }, []);

  return (
    <>
      {/* Gelen arama her yüzeyde karşılanır (telefon mantığı). */}
      <CallHost />
      {children}
    </>
  );
}
