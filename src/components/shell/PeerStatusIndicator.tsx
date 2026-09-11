/**
 * EŞ DURUM GÖSTERGESİ
 * ------------------------------------------------------------------
 * Üst bardaki ağ durumu şeridi. Ağ akışına yalnız bu bileşen abone
 * olur; kabuk ve pencereler eş sinyalinden etkilenmez. Alan genişlikleri
 * sabittir: sayaç değişimi komşu öğeleri kaydırmaz (titreme yok).
 */

import { memo } from "react";

import { usePeerStatus } from "@/lib/shell/peer-status";
import { useMemoryMb } from "@/lib/shell/telemetry-store";

export const PeerStatusIndicator = memo(function PeerStatusIndicator() {
  const { text, peers, rttMs } = usePeerStatus();
  const memMb = useMemoryMb();

  return (
    <span className="flex items-center gap-1 font-osmono text-[11px] leading-4 text-[var(--tb-muted)] tabular-nums">
      <span className="inline-block w-[min(34vw,220px)] truncate text-left">{text}</span>
      <span className="inline-block w-[62px] shrink-0 text-right">{peers} cihaz</span>
      <span className="inline-block w-[62px] shrink-0 text-right">
        {rttMs != null ? `${rttMs} ms` : ""}
      </span>
      <span className="inline-block w-[62px] shrink-0 text-right">
        {memMb != null ? `${memMb} MB` : ""}
      </span>
    </span>
  );
});
