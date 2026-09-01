/**
 * BARE-METAL ISO İNDİRME ROTASI
 * ------------------------------------------------------------------
 * Tek tık: tarayıcının İndirilenler klasörüne doğrudan akar.
 *
 * Önyüklenebilir imaj, kök yetkili bir Linux makinede
 * `scripts/build-iso.sh` ile üretilip yayın paketine
 * `/tedbirge-webos-v1.0-x86_64.iso` adresiyle eklenir. İmaj yüklüyse
 * bu rota onu aktarır; henüz yüklü değilse sahte/boş bir .iso ÜRETİLMEZ,
 * bunun yerine imajı yerelde üreten kurulum kiti indirilir.
 */

import { createFileRoute } from "@tanstack/react-router";

export const ISO_FILE_NAME = "tedbirge-webos-v1.0-x86_64.iso";
const KIT_FILE_NAME = "tedbirge-webos-iso-kurulum-kiti.sh";

const KIT = `#!/usr/bin/env bash
# Tedbirge® WebOS — Bare-Metal ISO üretim kiti
# Kullanim: bash ${KIT_FILE_NAME}
# Gereksinim: Linux (kok yetkisi), git, bun, rust toolchain, xorriso
set -euo pipefail

REPO=\${REPO:-https://github.com/tedbirgeai/aetheris}
WORK=\${WORK:-\$HOME/tedbirge-os-build}

echo "→ Kaynak alınıyor: \$REPO"
[ -d "\$WORK" ] || git clone --depth 1 "\$REPO" "\$WORK"
cd "\$WORK"

echo "→ Bağımlılıklar"
bun install --frozen-lockfile

echo "→ Kabuk paketi + yerel ikili + ISO"
bash scripts/build-iso.sh

echo "✓ Hazır: \$WORK/build/iso/tedbirge-os-x86_64.iso"
echo
echo "USB'ye yazdırma:"
echo "  Windows : Rufus → imajı seç → GPT/UEFI → Başlat"
echo "  Ventoy  : ISO dosyasını Ventoy USB'sine kopyalamanız yeterli"
echo "  macOS/Linux: BalenaEtcher → Flash from file → Select target → Flash"
`;

export const Route = createFileRoute("/api/public/iso")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        try {
          const image = await fetch(`${origin}/${ISO_FILE_NAME}`);
          const type = image.headers.get("content-type") ?? "";
          // Statik imaj gerçekten varsa (HTML fallback değilse) aktarılır.
          if (image.ok && !type.includes("text/html")) {
            const headers = new Headers({
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${ISO_FILE_NAME}"`,
              "X-Content-Type-Options": "nosniff",
              "Cache-Control": "public, max-age=3600",
            });
            const length = image.headers.get("content-length");
            if (length) headers.set("Content-Length", length);
            return new Response(image.body, { status: 200, headers });
          }
        } catch {
          /* imaj yayınlanmamış olabilir; kite düşülür */
        }

        return new Response(KIT, {
          status: 200,
          headers: {
            "Content-Type": "text/x-shellscript; charset=utf-8",
            "Content-Disposition": `attachment; filename="${KIT_FILE_NAME}"`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
