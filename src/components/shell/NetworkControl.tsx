/**
 * AĞ YAŞAM PANELİ
 * ------------------------------------------------------------------
 * Üst çubuktaki ağ simgesinden açılır. Dört çalışma modu, canlı eş
 * listesi ve "çevrede ara" eylemi tek kartta toplanır. İnternet yokken
 * de aynı ağdaki cihazlar burada görünür.
 */

import { useEffect, useRef } from "react";
import { Globe, Radar, RadioTower, ShieldOff, Signal, Wifi } from "lucide-react";

import { notify, notifyOk } from "@/lib/shell/notify";
import { NETWORK_MODES, setNetworkMode, useNetworkMode, type NetworkModeId } from "@/lib/shell/network-mode";
import { pingNodePeers } from "@/lib/node-runtime";
import { useShell } from "@/shell/shell-context";

const MODE_ICON: Record<NetworkModeId, typeof Globe> = {
  global: Globe,
  mesh: Wifi,
  cellular: RadioTower,
  offgrid: ShieldOff,
};

export function NetworkControl({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mode = useNetworkMode();
  const { node } = useShell();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const peers = node.peers;
  const direct = peers.filter((p) => p.direct).length;

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Ağ yönetimi"
      className="tbos-window absolute top-full left-3 z-[95] mt-1.5 w-80 rounded-2xl p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]">Ağ ve Bağlantı</span>
        <span className="font-osmono text-[11px] text-[var(--tb-accent)]">
          {direct} doğrudan · {peers.length} bilinen
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {NETWORK_MODES.map((m) => {
          const Icon = MODE_ICON[m.id];
          const active = mode === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setNetworkMode(m.id);
                  notifyOk(m.label, m.hint);
                }}
                aria-pressed={active}
                className={`wa-press flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left ${
                  active
                    ? "border-[var(--tb-accent)] bg-[var(--tb-accent)]/8"
                    : "border-[var(--tb-border)]"
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    active ? "text-[var(--tb-accent)]" : "text-[var(--tb-muted)]"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] text-[var(--tb-text)]">{m.label}</span>
                  <span className="block font-osmono text-[10.5px] text-[var(--tb-muted)]">
                    {m.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => {
          if (mode === "offgrid") {
            notify("Tam Gizlilik açık", "Çevre taraması için başka bir mod seçin.");
            return;
          }
          pingNodePeers();
          notify("Çevre taranıyor", "Aynı ağdaki cihazlar birkaç saniyede listelenir.");
        }}
        className="wa-press mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
      >
        <Radar className="h-4 w-4" aria-hidden /> Çevrede cihaz ara
      </button>

      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {peers.map((p) => (
          <li
            key={p.nodeId}
            className="flex items-center gap-2 rounded-lg border border-[var(--tb-border)] px-2.5 py-1.5"
          >
            <Signal
              className={`h-3.5 w-3.5 shrink-0 ${
                p.direct ? "text-[var(--tb-accent)]" : "text-[var(--tb-muted)]"
              }`}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--tb-text)]">
              {p.nodeId.slice(0, 14)}
            </span>
            <span className="font-osmono text-[10.5px] text-[var(--tb-muted)]">
              {p.direct ? "doğrudan" : "aktarımlı"}
            </span>
          </li>
        ))}
        {peers.length === 0 ? (
          <li className="px-1 py-3 text-center font-osmono text-[11px] text-[var(--tb-muted)]">
            {mode === "offgrid"
              ? "Tam gizlilik modunda cihaz yalıtılmıştır."
              : "Henüz cihaz yok. Aynı ağdaki bir cihazda Tedbirge'i açın."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
