/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import { describe, expect, it } from "vitest";

import { apply, createState, delta, live, merge, put, remove } from "@/lib/axiom/sync/crdt";
import { createQueue, enqueue, flush } from "@/lib/axiom/sync/queue";

describe("CRDT birleşmesi", () => {
  it("birleşme sırası sonucu değiştirmez", () => {
    const a = put(createState("a"), "cid-1", { verdict: "200_PROVEN" });
    const b = put(createState("b"), "cid-2", { verdict: "409_REFUTED" });
    const ab = merge(a, b);
    const ba = merge(b, a);
    expect(live(ab).map((e) => e.key).sort()).toEqual(live(ba).map((e) => e.key).sort());
  });

  it("aynı delta iki kez uygulanınca durum değişmez", () => {
    const a = put(createState("a"), "cid-1", { verdict: "200_PROVEN" });
    const d = delta(a);
    const once = apply(createState("b"), d);
    const twice = apply(once.state, d);
    expect(once.applied).toBe(1);
    expect(twice.applied).toBe(0);
    expect(live(twice.state)).toHaveLength(1);
  });

  it("çakışmada en yüksek saat kazanır", () => {
    let a = put(createState("a"), "cid-1", { verdict: "422_UNDECIDED" });
    a = put(a, "cid-1", { verdict: "200_PROVEN" });
    const b = put(createState("b"), "cid-1", { verdict: "409_REFUTED" });
    const out = merge(b, a);
    expect(out.entries["cid-1"]?.fields.verdict).toBe("200_PROVEN");
  });

  it("silme tombstone olarak taşınır", () => {
    const a = remove(put(createState("a"), "cid-1", {}), "cid-1");
    expect(live(a)).toHaveLength(0);
    expect(Object.keys(a.entries)).toHaveLength(1);
  });
});

describe("çevrimdışı kuyruk", () => {
  it("ağ yokken kayıtları tutar, gelince gönderir", async () => {
    const a = put(createState("a"), "cid-1", { verdict: "200_PROVEN" });
    let q = enqueue(createQueue(), delta(a));
    const offline = await flush(q, () => true, false);
    expect(offline.sent).toBe(0);
    expect(offline.state.pending).toHaveLength(1);

    q = offline.state;
    const online = await flush(q, () => true, true);
    expect(online.sent).toBe(1);
    expect(online.state.pending).toHaveLength(0);
  });

  it("gönderim başarısızsa kayıt kuyrukta kalır", async () => {
    const a = put(createState("a"), "cid-1", {});
    const q = enqueue(createQueue(), delta(a));
    const out = await flush(q, () => false, true);
    expect(out.failed).toBe(1);
    expect(out.state.pending[0]?.attempts).toBe(1);
  });
});
