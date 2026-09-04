/**
 * UYGULAMA SİMGELERİ
 * ------------------------------------------------------------------
 * Kimlikten simgeye tek eşleme noktası; masaüstü, Dock ve Mağaza aynı
 * görseli kullanır. Bilinmeyen kimlikler küre simgesine düşer.
 */

import {
  Activity,
  Boxes,
  Coins,
  Info,
  LayoutDashboard,
  Settings2,
  FileUp,
  FolderOpen,
  Globe,
  Languages,
  Mail,
  Map as MapIcon,
  MessageCircle,
  MonitorSmartphone,
  Music,
  Network,
  NotebookPen,
  PlayCircle,
  Radio,
  Search,
  Share2,
  Store,
  Video,
  Wallet,
  BookOpen,
  Palette,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";

import { BrandIcon, domainOf } from "@/components/shell/BrandIcon";
import { webApp } from "@/shell/web-apps";

const MAP: Record<string, ComponentType<{ className?: string }>> = {
  messenger: MessageCircle,
  files: FolderOpen,
  media: PlayCircle,
  music: Music,
  store: Store,
  computer: MonitorSmartphone,
  wallpaper: Palette,
  profile: UserRound,
  settings: Settings2,
  sysinfo: Info,
  panel: LayoutDashboard,
  yonetim: ShieldCheck,
  transfer: FileUp,
  apps: Boxes,
  mesh: Activity,
  relay: Radio,
  "web.search": Search,
  "web.search.g": Search,
  "web.video": Video,
  "web.social.x": Share2,
  "web.social.li": Share2,
  "web.social.tt": Video,
  "web.maps": MapIcon,
  "web.docs": BookOpen,
  "web.mail": Mail,
  "web.notes": NotebookPen,
  "web.translate": Languages,
  "web3.explorer": Network,
  "web3.ipfs": Globe,
  "web3.market": Coins,
};

export function AppIcon({ id, className }: { id: string; className?: string }) {
  const Cmp = MAP[id] ?? (id.startsWith("web3.") ? Wallet : Globe);
  const fallback = <Cmp className={className} />;
  const web = webApp(id);
  if (!web) return fallback;
  // Harici hedeflerde servisin gerçek logosu kullanılır; katalogda
  // `iconDomain` varsa (proxy/eşdeğer adresli hedefler) o tercih edilir.
  const domain = web.iconDomain ?? domainOf(web.url);
  return <BrandIcon domain={domain} label={web.label} className={className} fallback={fallback} />;
}
