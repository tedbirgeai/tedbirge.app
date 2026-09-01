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

/**
 * Kurulum kiti: harici depo klonlamaz, `bun install` istemez.
 * Yayındaki hazır (pre-built) varlıkları indirir; ağ yoksa yanı başındaki
 * yerel `dist/` ağacını kullanır. Kaynaktan derleme yalnız son çare olarak,
 * bu projenin kendi betikleriyle ve yalnız istenirse çalışır.
 */
function buildKit(origin: string): string {
  return `#!/usr/bin/env bash
# Tedbirge® WebOS — Bare-Metal imaj kurulum kiti
# Kullanim: bash ${KIT_FILE_NAME}
# Gereksinim: Linux, curl veya wget, tar. (.iso icin ek olarak xorriso)
set -euo pipefail

ORIGIN=\${ORIGIN:-${origin}}
WORK=\${WORK:-\$PWD/tedbirge-os-build}
STAGE="\$WORK/root"

case "\$(uname -m)" in
  x86_64|amd64)   ARCH=x86_64 ;;
  aarch64|arm64)  ARCH=aarch64 ;;
  riscv64)        ARCH=riscv64 ;;
  *) echo "! Bilinmeyen mimari: \$(uname -m) — x86_64 varsayiliyor"; ARCH=x86_64 ;;
esac
echo "› Mimari: \$ARCH"

fetch() { # fetch <url> <hedef> ; basarisizsa 1 doner
  if command -v curl >/dev/null 2>&1; then curl -fsSL "\$1" -o "\$2"
  elif command -v wget >/dev/null 2>&1; then wget -qO "\$2" "\$1"
  else echo "! curl ya da wget gerekli"; return 1; fi
}

mkdir -p "\$STAGE/opt/tedbirge" "\$STAGE/etc"

# 1) Kabuk paketi: once yayindaki hazir paket, sonra yanibasindaki yerel dist/
if fetch "\$ORIGIN/dist-bundle.tar.gz" "\$WORK/dist-bundle.tar.gz" 2>/dev/null; then
  echo "› Hazir kabuk paketi indirildi"
  mkdir -p "\$STAGE/opt/tedbirge/dist"
  tar -xzf "\$WORK/dist-bundle.tar.gz" -C "\$STAGE/opt/tedbirge/dist"
elif [ -d "\${DIST:-./dist}" ]; then
  echo "› Yerel dist/ agaci kullaniliyor"
  cp -r "\${DIST:-./dist}" "\$STAGE/opt/tedbirge/dist"
else
  echo "! Kabuk paketi bulunamadi (ag yok ve yerel dist/ yok)"
  echo "  Bu projenin kok dizininde 'bun run build' calistirip kiti tekrar deneyin."
  exit 1
fi

# 2) Wasm cekirdegi (paket icinde yoksa ayrica indirilir)
if [ ! -f "\$STAGE/opt/tedbirge/dist/kernel/tedbirge_kernel.wasm" ]; then
  mkdir -p "\$STAGE/opt/tedbirge/dist/kernel"
  fetch "\$ORIGIN/kernel/tedbirge_kernel.wasm" \\
        "\$STAGE/opt/tedbirge/dist/kernel/tedbirge_kernel.wasm" || true
fi

# 3) Yerel kabuk ikilisi: hazir ikili -> yoksa istege bagli kaynak derlemesi
if fetch "\$ORIGIN/native/tedbirge-shell-\$ARCH" "\$STAGE/opt/tedbirge/tedbirge-shell" 2>/dev/null; then
  chmod +x "\$STAGE/opt/tedbirge/tedbirge-shell"
  echo "› Hazir kabuk ikilisi indirildi (\$ARCH)"
elif [ -f crates/tedbirge-shell-native/Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
  echo "› Hazir ikili yok — kaynaktan derleniyor (cargo)"
  cargo build --release --manifest-path crates/tedbirge-shell-native/Cargo.toml
  cp crates/tedbirge-shell-native/target/release/tedbirge-shell "\$STAGE/opt/tedbirge/"
else
  echo "! \$ARCH icin hazir ikili yok ve cargo bulunamadi."
  echo "  Dugum yine de baska bir makinedeki kabuktan sunulabilir; imaj ikilisiz uretilir."
fi

# 4) Acilis betigi (kiosk ya da bassiz role)
cat > "\$STAGE/opt/tedbirge/boot.sh" <<'BOOT'
#!/bin/sh
set -e
/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946 &
if command -v cog >/dev/null 2>&1; then
  exec cog --enable-developer-extras=false http://127.0.0.1:8377/
elif command -v chromium >/dev/null 2>&1; then
  exec chromium --kiosk --no-sandbox --app=http://127.0.0.1:8377/
else
  echo "Tedbirge kabugu hazir: http://127.0.0.1:8377/"
  wait
fi
BOOT
chmod +x "\$STAGE/opt/tedbirge/boot.sh"

cat > "\$STAGE/etc/tedbirge-release" <<REL
NAME="Tedbirge® WebOS"
VARIANT="Layer 1 · bare-metal"
ARCH=\$ARCH
SHELL_PORT=8377
MESH_PORT=7946
BUILD=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
REL

# 5) Paketleme: xorriso varsa .iso, yoksa tasinabilir kok agaci arsivi
if command -v xorriso >/dev/null 2>&1; then
  xorriso -as mkisofs -o "\$WORK/tedbirge-webos-\$ARCH.iso" -V TEDBIRGE "\$STAGE"
  echo "✓ Hazir: \$WORK/tedbirge-webos-\$ARCH.iso"
else
  tar -czf "\$WORK/tedbirge-webos-\$ARCH-rootfs.tar.gz" -C "\$STAGE" .
  echo "✓ Hazir: \$WORK/tedbirge-webos-\$ARCH-rootfs.tar.gz"
  echo "  .iso icin: xorriso kurup kiti tekrar calistirin."
fi

echo
echo "USB'ye yazdirma:"
echo "  Windows : Rufus → imaji sec → GPT/UEFI → Baslat"
echo "  Ventoy  : .iso dosyasini Ventoy USB'sine kopyalamaniz yeterli"
echo "  macOS/Linux: BalenaEtcher → Flash from file → Select target → Flash"
`;
}


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

        return new Response(buildKit(origin), {
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
