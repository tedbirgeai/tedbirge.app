/**
 * PREMIUM UYGULAMA İKON YÜZEYİ
 * ------------------------------------------------------------------
 * Masaüstü, Dock, görev çubuğu ve başlatıcı aynı cam/neomorphic yüzeyi
 * kullanır. Marka ikonları yerel SVG, sistem ikonları WebOS cam katmanıdır.
 */

import { ShieldCheck, WifiOff } from "lucide-react";

import { AppIcon, isBrandApp } from "@/components/shell/app-icons";
import { getApp } from "@/apps/registry";
import { catalogApp } from "@/shell/installed";
import { webApp } from "@/shell/web-apps";

type Size = "desk" | "launcher" | "dock" | "task" | "window";

const SIZE: Record<Size, { box: string; icon: string; radius: string }> = {
  desk: { box: "h-12 w-12", icon: "h-6 w-6", radius: "rounded-2xl" },
  launcher: { box: "h-12 w-12", icon: "h-6 w-6", radius: "rounded-2xl" },
  dock: { box: "h-8 w-8", icon: "h-4 w-4", radius: "rounded-xl" },
  task: { box: "h-6 w-6", icon: "h-3.5 w-3.5", radius: "rounded-lg" },
  window: { box: "h-7 w-7", icon: "h-4 w-4", radius: "rounded-lg" },
};

export function appSecurityLabels(id: string): string[] {
  const web = webApp(id);
  const manifest = getApp(id);
  const app = catalogApp(id);
  if (web) return ["Harici web hedefi", "Geçit/kısıtlı pencere", "Çekirdek yetkisi yok"];
  return [
    app?.builtin || manifest ? "Ed25519 imzalı" : "Yerel paket",
    id === "messenger" || id === "calls" ? "E2EE / P2P" : "Off-Grid uyumlu",
    id === "axiom" ? "STATUS: 200_PROVEN" : "AES-GCM appdata",
  ];
}

export function AppSecurityBadge({ id, compact = false }: { id: string; compact?: boolean }) {
  const web = webApp(id);
  const label = web ? "WEB" : id === "axiom" ? "ZKP" : "OK";
  const title = appSecurityLabels(id).join(" · ");
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--tb-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--tb-accent)_16%,transparent)] font-osmono font-semibold text-[var(--tb-accent)] shadow-sm ${
        compact ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
    >
      {web ? <WifiOff className="h-2.5 w-2.5" aria-hidden /> : <ShieldCheck className="h-2.5 w-2.5" aria-hidden />}
      {label}
    </span>
  );
}

export function AppIconSurface({
  id,
  size = "launcher",
  className = "",
  showBadge = false,
}: {
  id: string;
  size?: Size;
  className?: string;
  showBadge?: boolean;
}) {
  const s = SIZE[size];
  const brand = isBrandApp(id);
  return (
    <span
      className={`tbos-app-icon ${brand ? "tbos-app-icon--brand" : "tbos-app-icon--system"} ${s.box} ${s.radius} ${className}`}
    >
      <AppIcon id={id} className={`${s.icon} tbos-app-icon__glyph`} />
      {showBadge ? (
        <span className="absolute -right-1 -bottom-1">
          <AppSecurityBadge id={id} compact />
        </span>
      ) : null}
    </span>
  );
}
