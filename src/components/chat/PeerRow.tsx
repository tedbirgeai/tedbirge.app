/**
 * EŞ SATIRI — Meshtastic/Briar kalıbında insan dostu düğüm kartı.
 * Solda cihaz ikonu, ortada insan dostu ad + silik kimlik rozeti,
 * sağda sinyal göstergesi ve tek tıkla mesaj/arama/yeniden adlandırma.
 */
import { useState } from "react";
import {
  Globe,
  MessageSquare,
  Monitor,
  Pencil,
  Phone,
  Radio,
  Smartphone,
  Tablet,
  UserPlus,
} from "lucide-react";

import type { DeviceKind } from "@/lib/identity/device";
import { setNickname } from "@/lib/identity/peer-nickname";

export type PeerRowData = {
  id: string;
  name: string;
  badge: string;
  kind: DeviceKind;
  handle: string;
  hint?: string;
  self?: boolean;
  direct?: boolean;
  named?: boolean;
  relay?: boolean;
};

function DeviceGlyph({ kind, relay }: { kind: DeviceKind; relay?: boolean }) {
  const cls = "h-4 w-4";
  if (relay) return <Radio className={cls} aria-hidden />;
  if (kind === "mobile") return <Smartphone className={cls} aria-hidden />;
  if (kind === "tablet") return <Tablet className={cls} aria-hidden />;
  if (kind === "desktop") return <Monitor className={cls} aria-hidden />;
  return <Globe className={cls} aria-hidden />;
}

/** Üç çubuklu minimal sinyal göstergesi. */
function SignalBars({ level, title }: { level: 1 | 2 | 3; title: string }) {
  return (
    <span className="flex shrink-0 items-end gap-[2px]" title={title} aria-label={title}>
      {[3, 6, 9].map((h, i) => (
        <span
          key={h}
          className="w-[3px] rounded-sm"
          style={{
            height: h,
            background: i < level ? "var(--tb-accent)" : "var(--tb-border)",
            opacity: i < level ? 1 : 0.7,
          }}
        />
      ))}
    </span>
  );
}

type Props = {
  peer: PeerRowData;
  onMessage?: (id: string) => void;
  onCall?: (id: string) => void;
  onRenamed?: () => void;
};

export function PeerRow({ peer, onMessage, onCall, onRenamed }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const save = () => {
    setNickname(peer.id, value);
    setEditing(false);
    setValue("");
    onRenamed?.();
  };

  const level: 1 | 2 | 3 = peer.self ? 3 : peer.direct ? 3 : 2;

  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-black/[0.03]">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{
          background: "var(--tb-panel-soft)",
          color: peer.self || peer.direct ? "var(--tb-accent)" : "var(--tb-muted)",
        }}
      >
        <DeviceGlyph kind={peer.kind} relay={peer.relay} />
      </span>

      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setEditing(false);
              setValue("");
            }
          }}
          placeholder="Örn: Ahmet Bey — Laptop"
          className="min-w-0 flex-1 rounded-md px-2 py-1 text-[13px] outline-none"
          style={{
            background: "var(--tb-panel-soft)",
            border: "1px solid var(--tb-border)",
            color: "var(--tb-text)",
          }}
        />
      ) : (
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{peer.self ? `${peer.name} (siz)` : peer.name}</span>
            <span
              className="shrink-0 text-[10px] tabular-nums"
              style={{ color: "var(--tb-muted)", opacity: 0.6 }}
              title="Cihaz kimliği rozeti"
            >
              {peer.badge}
            </span>
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "var(--tb-muted)" }}
            title={peer.hint}
          >
            <SignalBars level={level} title={peer.hint ?? peer.handle} />
            <span className="truncate">{peer.handle}</span>
          </span>
        </span>
      )}

      {!peer.self && !editing ? (
        <span className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button
            type="button"
            aria-label="Mesaj at"
            title="Mesaj at"
            onClick={() => onMessage?.(peer.id)}
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ border: "1px solid var(--tb-border)", color: "var(--tb-muted)" }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Arama yap"
            title="Arama yap"
            onClick={() => onCall?.(peer.id)}
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ border: "1px solid var(--tb-border)", color: "var(--tb-muted)" }}
          >
            <Phone className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={peer.named ? "Yeniden adlandır" : "Rehbere ekle"}
            title={peer.named ? "Yeniden adlandır" : "Rehbere ekle"}
            onClick={() => {
              setValue(peer.named ? peer.name : "");
              setEditing(true);
            }}
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{
              border: "1px solid var(--tb-border)",
              color: peer.named ? "var(--tb-muted)" : "var(--tb-accent)",
            }}
          >
            {peer.named ? <Pencil className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          </button>
        </span>
      ) : null}
    </div>
  );
}
