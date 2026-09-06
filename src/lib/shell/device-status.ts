/**
 * CİHAZ DURUM OKUYUCULARI (Nielsen #1 — Sistem Durumunun Görünürlüğü)
 * ------------------------------------------------------------------
 * Pil yüzdesi ve yerel depolama etkinliği. Desteklemeyen cihazlarda
 * göstergeler sessizce gizlenir; hiçbir sunucu çağrısı yapılmaz.
 */

import { useEffect, useState } from "react";

import { onVfsChange } from "@/lib/vfs/store";

type BatteryLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

export type BatteryStatus = { percent: number; charging: boolean } | null;

/** Pil yüzdesi; tarayıcı desteklemiyorsa null. */
export function useBattery(): BatteryStatus {
  const [state, setState] = useState<BatteryStatus>(null);

  useEffect(() => {
    let battery: BatteryLike | null = null;
    let alive = true;
    const read = () => {
      if (!battery || !alive) return;
      setState({ percent: Math.round(battery.level * 100), charging: battery.charging });
    };
    const getter = (
      navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }
    ).getBattery?.bind(navigator);
    if (!getter) return;
    void getter()
      .then((b) => {
        if (!alive) return;
        battery = b;
        b.addEventListener("levelchange", read);
        b.addEventListener("chargingchange", read);
        read();
      })
      .catch(() => {
        /* izin verilmemiş olabilir */
      });
    return () => {
      alive = false;
      battery?.removeEventListener("levelchange", read);
      battery?.removeEventListener("chargingchange", read);
    };
  }, []);

  return state;
}

/** Yerel depolamaya son 1,5 sn içinde yazıldı/okundu mu. */
export function useDiskActivity(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onVfsChange(() => {
      setActive(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setActive(false), 1500);
    });
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  }, []);

  return active;
}
