/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM MARKA SABİTLERİ
 * ------------------------------------------------------------------
 * Arayüzde görünen tek marka kaynağı. Sürüm ve altbilgi metni
 * bileşenlere gömülmez; buradan okunur.
 */

export const AXIOM_VERSION = "v12";

/** Ekranın altında kalıcı olarak gösterilen marka bandı. */
export const AXIOM_BRAND_BANNER =
  "AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs";

/** Pencere başlığı. */
export const AXIOM_WINDOW_TITLE = "AXIOM — Deterministik Doğrulama Konsolu";

/** Sanal RAM sert sınırı (bayt): 50 MB. */
export const AXIOM_RAM_LIMIT = 50 * 1024 * 1024;

/** Tahliye eşiği: sınırın %80'i (40 MB). */
export const AXIOM_RAM_THRESHOLD = 0.8;
