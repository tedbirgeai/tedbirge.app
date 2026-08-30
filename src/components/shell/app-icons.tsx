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
} from "lucide-react";
import type { ComponentType } from "react";

const MAP: Record<string, ComponentType<{ className?: string }>> = {
  messenger: MessageCircle,
  files: FolderOpen,
  media: PlayCircle,
  music: Music,
  store: Store,
  computer: MonitorSmartphone,
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
  return <Cmp className={className} />;
}
