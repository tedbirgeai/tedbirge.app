/**
 * BARE-METAL ISO İNDİRME ROTASI
 * ------------------------------------------------------------------
 * Tek tık: tarayıcının İndirilenler klasörüne doğrudan akar.
 *
 * Önyüklenebilir imaj yayın paketine `/tedbirge-webos-v1.0-x86_64.iso`
 * adresiyle eklendiyse doğrudan o aktarılır. Değilse sahte bir .iso
 * ÜRETİLMEZ; bunun yerine kullanıcı hiçbir komut yazmadan çift tıklayarak
 * çalıştırabileceği sıfır-konfigürasyon kurulum kiti (.zip) indirilir:
 * kit, canlı üretim sunucusundan derlenmiş WebOS paketini kendisi indirir.
 */

import { createFileRoute } from "@tanstack/react-router";

import { createZip } from "@/lib/zip";

export const ISO_FILE_NAME = "tedbirge-webos-v1.0-x86_64.iso";
const KIT_SH = "tedbirge-webos-iso-kurulum-kiti.sh";
const KIT_BAT = "kur.bat";
const KIT_ZIP = "tedbirge-webos-kurulum-kiti.zip";

/**
 * Linux/macOS kiti: yerel `dist/` klasörü ARAMAZ; önce canlı üretim
 * sunucusundan hazır statik paketi indirir. Kullanıcıdan derleme, kod
 * bilgisi ya da ek komut beklenmez.
 */
function buildKitSh(origin: string): string {
  return `#!/usr/bin/env bash
# Tedbirge(R) WebOS — sifir-konfigurasyon bare-metal kurulum kiti
# Cift tikla calistirin; hicbir komut yazmaniza gerek yoktur.
set -euo pipefail

ORIGIN="\${ORIGIN:-${origin}}"
WORK="\${WORK:-\$(cd "\$(dirname "\$0")" && pwd)/tedbirge-os-build}"
STAGE="\$WORK/root"
DIST="\$STAGE/opt/tedbirge/dist"

echo "== Tedbirge(R) WebOS bare-metal kurulum kiti =="
echo "   Kaynak: \$ORIGIN"
echo "   Calisma klasoru: \$WORK"
echo

case "\$(uname -m)" in
  x86_64|amd64)   ARCH=x86_64 ;;
  aarch64|arm64)  ARCH=aarch64 ;;
  riscv64)        ARCH=riscv64 ;;
  *) echo "! Bilinmeyen mimari: \$(uname -m) — x86_64 varsayiliyor"; ARCH=x86_64 ;;
esac
echo "> Mimari: \$ARCH"

fetch() { # fetch <url> <hedef>
  if command -v curl >/dev/null 2>&1; then curl -fsSL "\$1" -o "\$2"
  elif command -v wget >/dev/null 2>&1; then wget -qO "\$2" "\$1"
  else echo "! curl ya da wget gerekli"; return 1; fi
}

rm -rf "\$STAGE"; mkdir -p "\$DIST" "\$STAGE/etc"

# 1) WebOS statik paketi — dogrudan canli sunucudan
echo "> WebOS paketi indiriliyor..."
if fetch "\$ORIGIN/dist-bundle.tar.gz" "\$WORK/dist-bundle.tar.gz" 2>/dev/null; then
  tar -xzf "\$WORK/dist-bundle.tar.gz" -C "\$DIST"
  echo "  hazir paket alindi"
elif command -v wget >/dev/null 2>&1; then
  echo "  hazir paket yok — site aynalaniyor (wget)"
  wget -q --mirror --convert-links --adjust-extension --page-requisites \\
       --no-parent --no-host-directories --directory-prefix="\$DIST" "\$ORIGIN/" || true
  [ -f "\$DIST/index.html" ] || { echo "! Paket alinamadi (internet baglantisini kontrol edin)"; exit 1; }
elif fetch "\$ORIGIN/" "\$DIST/index.html"; then
  echo "  yalniz kabuk sayfasi alindi (wget yoksa varliklar ilk acilista onbelleklenir)"
else
  echo "! Paket alinamadi (internet baglantisini kontrol edin)"; exit 1
fi

# 2) Wasm cekirdegi
if [ ! -f "\$DIST/kernel/tedbirge_kernel.wasm" ]; then
  mkdir -p "\$DIST/kernel"
  fetch "\$ORIGIN/kernel/tedbirge_kernel.wasm" "\$DIST/kernel/tedbirge_kernel.wasm" || true
fi

# 3) Yerel kabuk ikilisi (varsa)
if fetch "\$ORIGIN/native/tedbirge-shell-\$ARCH" "\$STAGE/opt/tedbirge/tedbirge-shell" 2>/dev/null; then
  chmod +x "\$STAGE/opt/tedbirge/tedbirge-shell"
  echo "> Yerel kabuk ikilisi alindi (\$ARCH)"
else
  rm -f "\$STAGE/opt/tedbirge/tedbirge-shell"
  echo "> \$ARCH icin hazir ikili yok — imaj tarayici kiosk moduyla uretilir"
fi

# 4) Acilis betigi
cat > "\$STAGE/opt/tedbirge/boot.sh" <<'BOOT'
#!/bin/sh
set -e
if [ -x /opt/tedbirge/tedbirge-shell ]; then
  /opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946 &
fi
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
NAME="Tedbirge(R) WebOS"
VARIANT="Layer 1 - bare-metal"
ARCH=\$ARCH
SHELL_PORT=8377
MESH_PORT=7946
BUILD=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
REL

# 5) Paketleme: xorriso yoksa otomatik kurulmaya calisilir
if ! command -v xorriso >/dev/null 2>&1; then
  echo "> xorriso bulunamadi — otomatik kurulum deneniyor"
  if command -v nix >/dev/null 2>&1; then XORRISO="nix run nixpkgs#xorriso --"
  elif command -v apt-get >/dev/null 2>&1; then sudo apt-get update -qq && sudo apt-get install -y xorriso || true
  elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y xorriso || true
  elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --noconfirm libisoburn || true
  elif command -v brew >/dev/null 2>&1; then brew install xorriso || true
  fi
fi

OUT_ISO="\$WORK/tedbirge-webos-\$ARCH.iso"
if command -v xorriso >/dev/null 2>&1; then
  xorriso -as mkisofs -o "\$OUT_ISO" -V TEDBIRGE "\$STAGE"
  echo; echo "TAMAM: \$OUT_ISO"
elif [ -n "\${XORRISO:-}" ]; then
  \$XORRISO -as mkisofs -o "\$OUT_ISO" -V TEDBIRGE "\$STAGE"
  echo; echo "TAMAM: \$OUT_ISO"
else
  tar -czf "\$WORK/tedbirge-webos-\$ARCH-rootfs.tar.gz" -C "\$STAGE" .
  echo; echo "TAMAM (arsiv): \$WORK/tedbirge-webos-\$ARCH-rootfs.tar.gz"
  echo "  .iso icin xorriso kurup kiti tekrar calistirin."
fi

echo
echo "USB'ye yazdirma:"
echo "  Windows : Rufus -> imaji sec -> GPT/UEFI -> Baslat"
echo "  Ventoy  : .iso dosyasini Ventoy USB'sine kopyalamak yeterli"
echo "  macOS/Linux: BalenaEtcher -> Flash from file -> Select target -> Flash"
echo
read -r -p "Kapatmak icin Enter'a basin " _ || true
`;
}

/** Windows kiti: çift tıklanır; WSL varsa .sh kitini orada çalıştırır. */
function buildKitBat(origin: string): string {
  return [
    "@echo off",
    "chcp 65001 >nul",
    "title Tedbirge(R) WebOS - Bare-Metal Kurulum Kiti",
    "setlocal",
    `set ORIGIN=${origin}`,
    'echo == Tedbirge(R) WebOS bare-metal kurulum kiti ==',
    "echo.",
    "where wsl >nul 2>nul",
    "if %errorlevel%==0 (",
    '  echo [1/1] WSL bulundu - imaj WSL icinde uretiliyor...',
    `  wsl -e bash -lc "cd \\"$(wslpath '%~dp0')\\" && ORIGIN=%ORIGIN% bash ./${KIT_SH}"`,
    "  goto son",
    ")",
    "echo WSL bulunamadi.",
    "echo Tek tikla .iso uretimi icin Windows'ta WSL gerekir.",
    "echo Yonetici PowerShell'de su komutu calistirip bilgisayari yeniden baslatin:",
    "echo     wsl --install",
    "echo Ardindan bu dosyaya tekrar cift tiklayin.",
    "echo.",
    "echo Alternatif: Ventoy USB kullanip WebOS'u tarayicidan da calistirabilirsiniz:",
    "echo     %ORIGIN%",
    ":son",
    "echo.",
    "pause",
  ].join("\r\n");
}

function buildReadme(origin: string): string {
  return [
    "TEDBİRGE® WebOS — Bare-Metal Kurulum Kiti",
    "==========================================",
    "",
    "Hiçbir kod veya derleme bilgisine ihtiyacınız yok.",
    "",
    "Windows:",
    `  1. ${KIT_BAT} dosyasına çift tıklayın.`,
    "  2. İşlem bitince aynı klasörde .iso dosyanız hazır olur.",
    "",
    "Linux / macOS:",
    `  1. ${KIT_SH} dosyasına çift tıklayın (ya da: bash ${KIT_SH}).`,
    "  2. İşlem bitince tedbirge-os-build klasöründe .iso dosyanız hazır olur.",
    "",
    "USB'ye yazdırma: Rufus (Windows), Ventoy (hepsi) veya BalenaEtcher.",
    "",
    `Kurulum yapmadan denemek için: ${origin}`,
    "",
  ].join("\r\n");
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

        const zip = createZip([
          { name: KIT_SH, data: buildKitSh(origin) },
          { name: KIT_BAT, data: buildKitBat(origin) },
          { name: "OKUBENI.txt", data: buildReadme(origin) },
        ]);

        return new Response(zip, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${KIT_ZIP}"`,
            "Content-Length": String(zip.byteLength),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
