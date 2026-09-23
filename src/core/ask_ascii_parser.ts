/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface ByteDigest {
  bytes: number;
  chars: number;
  ascii: boolean;
  fingerprint: string;
  head: string;
}

export function parseAskAscii(text: string): ByteDigest {
  const encoder = new TextEncoder();
  const byteArray = encoder.encode(text);
  const bytes = byteArray.length;
  const chars = text.length;

  let isPureAscii = true;
  for (let i = 0; i < byteArray.length; i++) {
    if (byteArray[i] > 127) {
      isPureAscii = false;
      break;
    }
  }

  // FNV-1a 32-bit Hash Algoritması ile Hızlı Parmak İzi
  let hash = 0x811c9dc5;
  for (let i = 0; i < byteArray.length; i++) {
    hash ^= byteArray[i];
    hash = Math.imul(hash, 0x01000193);
  }
  const fingerprint = "0x" + (hash >>> 0).toString(16).padStart(8, "0");

  // İlk 16 Baytın Hex Gösterimi
  const headBytes = byteArray.slice(0, 16);
  const headHex = Array.from(headBytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  return {
    bytes,
    chars,
    ascii: isPureAscii,
    fingerprint,
    head: headHex || "—",
  };
}
