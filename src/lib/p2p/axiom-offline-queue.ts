/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { VerifyResult } from "@/lib/axiom/verify/types";

export type AxiomOfflineRecord = {
  id: string;
  at: number;
  cid: string;
  verdict: VerifyResult["verdict"];
  engine: VerifyResult["engine"];
  seal: string | null;
};

export type AxiomOfflineQueue = {
  pending: AxiomOfflineRecord[];
  pushed: number;
};

export function createAxiomOfflineQueue(): AxiomOfflineQueue {
  return { pending: [], pushed: 0 };
}

export function enqueueProof(
  queue: AxiomOfflineQueue,
  result: VerifyResult,
  at = Date.now(),
): AxiomOfflineQueue {
  const record: AxiomOfflineRecord = {
    id: `${result.cid}:${at}`,
    at,
    cid: result.cid,
    verdict: result.verdict,
    engine: result.engine,
    seal: result.seal,
  };
  return { ...queue, pending: [...queue.pending, record] };
}

export async function flushProofQueue(
  queue: AxiomOfflineQueue,
  send: (record: AxiomOfflineRecord) => Promise<boolean> | boolean,
  online = true,
): Promise<AxiomOfflineQueue> {
  if (!online) return queue;
  const pending: AxiomOfflineRecord[] = [];
  let pushed = queue.pushed;
  for (const record of queue.pending) {
    let ok = false;
    try {
      ok = await send(record);
    } catch {
      ok = false;
    }
    if (ok) pushed += 1;
    else pending.push(record);
  }
  return { pending, pushed };
}
