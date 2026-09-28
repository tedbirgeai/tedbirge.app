/**
 * PORTAL DIŞA AKTARMA
 * ------------------------------------------------------------------
 * CSV (hesap tablosu enjeksiyonuna karşı kaçışlı) ve NDJSON üretimi.
 */

import type { PortalLog } from "@/lib/portal/types";

/** Hücre `= + - @` veya sekme/satır başı ile başlıyorsa formül sayılmasın diye önek eklenir. */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function isoMs(at: number): string {
  return new Date(at).toISOString(); // milisaniye dahil
}

export function logsToCsv(logs: PortalLog[]): string {
  const head = "zaman,seviye,kaynak,mesaj";
  const rows = logs.map((l) => [isoMs(l.at), l.level, l.source, l.message].map(csvCell).join(","));
  return [head, ...rows].join("\n");
}

export function logsToNdjson(logs: PortalLog[]): string {
  return logs
    .map((l) => JSON.stringify({ at: isoMs(l.at), level: l.level, source: l.source, message: l.message }))
    .join("\n");
}
