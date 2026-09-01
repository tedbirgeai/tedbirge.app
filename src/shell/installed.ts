/**
 * KURULU UYGULAMALAR + MASAÜSTÜ İKON KONUMLARI
 * ------------------------------------------------------------------
 * Tek mağaza: hangi uygulamalar "kurulu" (masaüstü + Dock'ta görünür) ve
 * masaüstü ikonlarının serbest sürükleme konumları. Her ikisi de
 * localStorage'da kalıcıdır; SSR'de güvenli varsayılanlara düşer.
 */

import { useSyncExternalStore } from "react";

import { WEB_APPS, type AppCategory } from "@/shell/web-apps";

export type CatalogApp = {
  id: string;
  label: string;
  hint: string;
  category: AppCategory;
  /** Yerleşik modüller kaldırılamaz. */
  builtin: boolean;
};

/** Kabuk içindeki yerleşik modüller. */
export const LOCAL_APPS: CatalogApp[] = [
  {
    id: "messenger",
    label: "Sohbet",
    hint: "Mesaj, sesli ve görüntülü arama",
    category: "sistem",
    builtin: true,
  },
  { id: "files", label: "Dosyalar", hint: "Dosya yöneticisi", category: "sistem", builtin: true },
  { id: "media", label: "Medya", hint: "Video oynatıcı", category: "sistem", builtin: true },
  { id: "music", label: "Müzik", hint: "Cihazdaki parçalar", category: "sistem", builtin: true },
  {
    id: "store",
    label: "Mağaza",
    hint: "Uygulama mağazası",
    category: "sistem",
    builtin: true,
  },
  {
    id: "computer",
    label: "Bilgisayarım",
    hint: "Düğüm ve sistem durumu",
    category: "sistem",
    builtin: true,
  },
  {
    id: "wallpaper",
    label: "Görünüm",
    hint: "Duvar kâğıdı ve tema",
    category: "sistem",
    builtin: true,
  },

  {
    id: "transfer",
    label: "Aktarım",
    hint: "Eşler arası dosya gönderimi",
    category: "araclar",
    builtin: false,
  },
  {
    id: "apps",
    label: "Paketler",
    hint: "Kurulu .tbapp paketleri",
    category: "araclar",
    builtin: false,
  },
  { id: "mesh", label: "Ağ", hint: "Mesh durumu", category: "araclar", builtin: false },
  { id: "relay", label: "Röle", hint: "Taşıma ayarları", category: "araclar", builtin: false },
];

export const CATALOG: CatalogApp[] = [
  ...LOCAL_APPS,
  ...WEB_APPS.map((a) => ({
    id: a.id,
    label: a.label,
    hint: a.hint,
    category: a.category,
    builtin: false,
  })),
];

export function catalogApp(id: string): CatalogApp | undefined {
  const app = CATALOG.find((a) => a.id === id);
  if (!app) return undefined;
  // "Bilgisayarım" etiketi cihaz türüne göre isimlendirilir.
  if (app.id === "computer") return { ...app, label: deviceScopeLabel() };
  return app;
}

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  sistem: "Sistem",
  sosyal: "Sosyal Medya",
  uretkenlik: "Üretkenlik",
  araclar: "Araçlar",
  web3: "Web3",
};

const INSTALLED_KEY = "tbos.installed";
const ICONS_KEY = "tbos.desktop.icons";

const DEFAULT_INSTALLED = LOCAL_APPS.filter((a) => a.builtin).map((a) => a.id);

export type IconPos = { x: number; y: number };

type State = { installed: string[]; icons: Record<string, IconPos> };

const listeners = new Set<() => void>();
let state: State = { installed: DEFAULT_INSTALLED, icons: {} };
let hydrated = false;

function persist() {
  try {
    localStorage.setItem(INSTALLED_KEY, JSON.stringify(state.installed));
    localStorage.setItem(ICONS_KEY, JSON.stringify(state.icons));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(INSTALLED_KEY);
    const ic = localStorage.getItem(ICONS_KEY);
    const installed = raw ? (JSON.parse(raw) as string[]) : DEFAULT_INSTALLED;
    state = {
      installed: Array.from(new Set([...DEFAULT_INSTALLED, ...installed])).filter((id) =>
        catalogApp(id),
      ),
      icons: ic ? (JSON.parse(ic) as Record<string, IconPos>) : {},
    };
  } catch {
    state = { installed: DEFAULT_INSTALLED, icons: {} };
  }
  emit();
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

const SERVER_STATE: State = { installed: DEFAULT_INSTALLED, icons: {} };

export function useDesktopState(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

export function installApp(id: string) {
  if (!catalogApp(id) || state.installed.includes(id)) return;
  state.installed = [...state.installed, id];
  persist();
  emit();
}

export function uninstallApp(id: string) {
  const app = catalogApp(id);
  if (!app || app.builtin) return;
  state.installed = state.installed.filter((x) => x !== id);
  const { [id]: _drop, ...rest } = state.icons;
  state.icons = rest;
  persist();
  emit();
}

export function setIconPos(id: string, pos: IconPos) {
  state.icons = { ...state.icons, [id]: pos };
  persist();
  emit();
}
