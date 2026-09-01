/**
 * KABUK BAĞLAMI (Context)
 * ------------------------------------------------------------------
 * Bağlam ve `useShell` kancası bilerek bileşen dosyasından ayrıdır:
 * bir dosya hem bileşen hem kanca dışa aktarınca Vite Fast Refresh
 * modülü geçersiz kılıyor ve sağlayıcı ile tüketici farklı modül
 * örneklerine düşüp "useShell yalnız <ShellProvider> içinde" hatası
 * veriyordu.
 */

import { createContext, useContext } from "react";

import type { ShellAppId } from "@/shell/apps";
import type { SurfaceApi } from "@/shell/surfaces";
import type { BrowserNodeState } from "@/lib/browser-node";
import type { Kernel } from "@/kernel/contract";

export type ShellContextValue = {
  /** Etkin uygulama (sekme). */
  app: ShellAppId;
  setApp: (id: ShellAppId) => void;
  surfaces: SurfaceApi;
  /** Kabuk seviyesinde yönetilen düğüm durumu. */
  node: BrowserNodeState;
  /** Uygulamanın yetenekleriyle sınırlanmış çekirdek vekili. */
  kernelFor: (appId: string) => Kernel;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell yalnız <ShellProvider> içinde kullanılabilir.");
  return ctx;
}
