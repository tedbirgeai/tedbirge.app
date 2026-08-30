/**
 * UYGULAMA ÇALIŞMA ZAMANI KAYDI (App Runtime Registry)
 * ------------------------------------------------------------------
 * Faz B: kabuk artık "sekme" değil "uygulama" çalıştırır. Her uygulama
 * kimliğini, türünü (yerleşik / Wasm) ve istediği yetenekleri bildirir.
 * Yerleşik uygulamalar bugünkü panellerdir; Wasm uygulamaları ileride
 * aynı kayda eklenir, kabuk kodu değişmez.
 */

import { SHELL_APPS, type ShellApp, type ShellAppId } from "@/shell/apps";
import type { Capability } from "@/kernel/capabilities";
import { WEB_APPS, type EmbedPolicy } from "@/shell/web-apps";

export type AppKind = "builtin" | "wasm" | "web";

export type AppManifest = Omit<ShellApp, "id"> & {
  /** Yerleşiklerde `ShellAppId`, .tbapp paketlerinde paket kimliği. */
  id: ShellAppId | string;
  kind: AppKind;
  /** Uygulamanın çekirdekten istediği yetenekler. */
  capabilities: Capability[];
  /** Wasm uygulamaları için modül adresi (yerleşiklerde yoktur). */
  moduleUrl?: string;
  /** Harici web uygulamaları için hedef adres. */
  url?: string;
  /** Gömme politikası (iframe / popup / auto). */
  embed?: EmbedPolicy;
  /** Kısa açıklama (ızgara kartında görünür). */
  hint?: string;
};

const CAPS: Record<ShellAppId, Capability[]> = {
  chats: ["mesh.send", "mesh.receive", "mesh.route", "identity.read", "status.read"],
  calls: ["mesh.send", "mesh.receive", "mesh.route", "identity.read", "status.read"],
  communities: ["mesh.send", "mesh.receive", "identity.read", "status.read"],
  feed: ["mesh.send", "mesh.receive", "identity.read", "status.read"],
  me: ["identity.read", "status.read"],
};

const registry = new Map<string, AppManifest>([
  ...SHELL_APPS.map(
    (a) => [a.id, { ...a, kind: "builtin" as const, capabilities: CAPS[a.id] }] as const,
  ),
  // Harici web hedefleri: hiçbir marka adı kabuk koduna gömülmez,
  // tamamı veri kataloğundan gelir (src/shell/web-apps.ts).
  ...WEB_APPS.map(
    (a) =>
      [
        a.id,
        {
          id: a.id,
          label: a.label,
          hint: a.hint,
          url: a.url,
          embed: a.embed,
          kind: "web" as const,
          capabilities: [] as Capability[],
          mobileOrder: 99,
          railOrder: null,
        },
      ] as const,
  ),
]);

export function listApps(): AppManifest[] {
  return [...registry.values()];
}

export function getApp(id: string): AppManifest | undefined {
  return registry.get(id);
}

export function capabilitiesOf(id: string): Capability[] {
  return registry.get(id)?.capabilities ?? [];
}

/** İleride Wasm uygulamaları bu kapıdan eklenir. */
export function registerApp(app: AppManifest) {
  registry.set(app.id, app);
}
