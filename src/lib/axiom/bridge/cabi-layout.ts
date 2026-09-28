/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * tb_proof_t BAYT DÜZENİ
 * ------------------------------------------------------------------
 * `sdk/tedbirge_truth.h` ve `crates/tedbirge-kernel/src/lib.rs::TbProof`
 * ile birebir aynı ofsetler (küçük-endian, 4-bayt hizalı, 212 bayt).
 */

export const TB_PROOF_SIZE = 212;
export const TB_PROOF_OFFSETS = {
  verdict: 0,
  engine: 4,
  wasmVerified: 8,
  ms: 12,
  cid: 16,
  seal: 81,
  pad: 210,
} as const;
const CID_LEN = 65;
const SEAL_LEN = 129;

export type TbProof = {
  verdict: number;
  engine: number;
  wasmVerified: boolean;
  ms: number;
  cid: string;
  seal: string;
};

function writeCStr(buf: Uint8Array, at: number, max: number, s: string) {
  const bytes = new TextEncoder().encode(s);
  if (bytes.length >= max) throw new RangeError(`alan ${max - 1} baytı aşıyor`);
  buf.set(bytes, at);
}

function readCStr(buf: Uint8Array, at: number, max: number): string {
  const slice = buf.subarray(at, at + max);
  const end = slice.indexOf(0);
  if (end === -1) throw new RangeError("NUL sonlandırıcı yok");
  return new TextDecoder().decode(slice.subarray(0, end));
}

export function encodeProof(p: TbProof): Uint8Array {
  const buf = new Uint8Array(TB_PROOF_SIZE);
  const dv = new DataView(buf.buffer);
  dv.setInt32(TB_PROOF_OFFSETS.verdict, p.verdict, true);
  dv.setInt32(TB_PROOF_OFFSETS.engine, p.engine, true);
  dv.setInt32(TB_PROOF_OFFSETS.wasmVerified, p.wasmVerified ? 1 : 0, true);
  dv.setUint32(TB_PROOF_OFFSETS.ms, p.ms >>> 0, true);
  writeCStr(buf, TB_PROOF_OFFSETS.cid, CID_LEN, p.cid);
  writeCStr(buf, TB_PROOF_OFFSETS.seal, SEAL_LEN, p.seal);
  return buf;
}

export function decodeProof(buf: Uint8Array): TbProof {
  if (buf.byteLength !== TB_PROOF_SIZE) throw new RangeError(`tb_proof_t ${TB_PROOF_SIZE} bayt olmalı`);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    verdict: dv.getInt32(TB_PROOF_OFFSETS.verdict, true),
    engine: dv.getInt32(TB_PROOF_OFFSETS.engine, true),
    wasmVerified: dv.getInt32(TB_PROOF_OFFSETS.wasmVerified, true) === 1,
    ms: dv.getUint32(TB_PROOF_OFFSETS.ms, true),
    cid: readCStr(buf, TB_PROOF_OFFSETS.cid, CID_LEN),
    seal: readCStr(buf, TB_PROOF_OFFSETS.seal, SEAL_LEN),
  };
}

/** Düzen öz-denetimi: ofset zinciri ve gidiş-dönüş kodlama tutarlı mı? */
export function verifyProofLayout(): boolean {
  const o = TB_PROOF_OFFSETS;
  if (o.cid + CID_LEN !== o.seal || o.seal + SEAL_LEN !== o.pad || o.pad + 2 !== TB_PROOF_SIZE)
    return false;
  try {
    const d = decodeProof(encodeProof({ verdict: 1, engine: 2, wasmVerified: false, ms: 7, cid: "a", seal: "" }));
    return d.ms === 7 && d.cid === "a" && d.seal === "" && !d.wasmVerified;
  } catch {
    return false;
  }
}
