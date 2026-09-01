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
const KIT_PS1 = "kur-indir.ps1";
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
OUT_TAR="\$WORK/tedbirge-webos-\$ARCH-rootfs.tar.gz"
if command -v xorriso >/dev/null 2>&1; then
  xorriso -as mkisofs -o "\$OUT_ISO" -V TEDBIRGE "\$STAGE" || true
elif [ -n "\${XORRISO:-}" ]; then
  \$XORRISO -as mkisofs -o "\$OUT_ISO" -V TEDBIRGE "\$STAGE" || true
else
  tar -czf "\$OUT_TAR" -C "\$STAGE" . || true
fi

# 6) Dogrulama: dosya gercekten olustu mu? Olusmadan "tamam" yazilmaz.
if [ -s "\$OUT_ISO" ]; then
  echo; echo "TAMAM: \$OUT_ISO"
elif [ -s "\$OUT_TAR" ]; then
  echo; echo "TAMAM (arsiv): \$OUT_TAR"
  echo "  Onyuklenebilir .iso icin xorriso kurup kiti tekrar calistirin."
else
  echo; echo "! BASARISIZ: ne .iso ne de arsiv uretilebildi."
  echo "  Neden: paketleme araci (xorriso/tar) calismadi ya da diskte yer yok."
  read -r -p "Kapatmak icin Enter'a basin " _ || true
  exit 1
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

/**
 * Windows kurulum betiği: kur.bat bunu çağırır. Sıra:
 *  [1/3] hazır .iso yayında mı → doğrudan indir
 *  [2/3] değilse canlı paketi indir (WSL varsa gerçek .iso üretimi denenir)
 *  [3/3] sonucu bildir ve Read-Host ile pencereyi açık tut.
 * Sahte .iso ASLA üretilmez.
 */
function buildKitPs1(origin: string): string {
  return [
    `param([string]$Origin = "${origin}", [string]$OutDir = $PSScriptRoot)`,
    "$ErrorActionPreference = 'Continue'",
    "chcp 65001 > $null",
    "Write-Host ''",
    "Write-Host '============================================'",
    "Write-Host '  Tedbirge(R) WebOS - Kurulum'",
    "Write-Host '============================================'",
    "Write-Host ''",
    "",
    "# --- Yardimci: WSL icinde gercekten calisan bir bash var mi? ---",
    "function Test-WslBash {",
    "  $wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue",
    "  if (-not $wsl) { return $false }",
    "  try {",
    "    $old = $ErrorActionPreference",
    "    $ErrorActionPreference = 'SilentlyContinue'",
    "    $out = & wsl.exe -e bash -c 'echo TBOK' 2>$null",
    "    $code = $LASTEXITCODE",
    "    $ErrorActionPreference = $old",
    "    if ($code -eq 0 -and ($out -join '') -match 'TBOK') { return $true }",
    "    return $false",
    "  } catch { return $false }",
    "}",
    "",
    "$bitti = $false",
    `$isoUrl = "$Origin/${ISO_FILE_NAME}"`,
    "$isoOut = Join-Path $OutDir 'tedbirge-webos.iso'",
    "Write-Host '[1/3] Hazir kurulum imaji araniyor...'",
    "try {",
    "  $head = Invoke-WebRequest -Uri $isoUrl -Method Head -UseBasicParsing -TimeoutSec 20",
    "  $ct = $head.Headers['Content-Type']",
    "  if ($ct -and $ct -notmatch 'text/html') {",
    "    Write-Host '      Imaj bulundu, indiriliyor (birkac dakika surebilir)...'",
    "    try {",
    "      Invoke-WebRequest -Uri $isoUrl -OutFile $isoOut -UseBasicParsing",
    "    } catch {",
    "      Write-Host '      Indirme yarida kesildi: internet baglantiniz koptu ya da sunucuya ulasilamadi.'",
    "    }",
    "    if ((Test-Path $isoOut) -and ((Get-Item $isoOut).Length -gt 1MB)) {",
    "      $mb = [math]::Round((Get-Item $isoOut).Length / 1MB, 1)",
    "      Write-Host \"[3/3] Basarili! tedbirge-webos.iso hazir ($mb MB).\"",
    "      Write-Host \"      Konum: $isoOut\"",
    "      Write-Host '      Rufus veya Ventoy ile USB belleginize yazdirabilirsiniz.'",
    "      $bitti = $true",
    "    } else {",
    "      if (Test-Path $isoOut) { Remove-Item $isoOut -Force -ErrorAction SilentlyContinue }",
    "      Write-Host '      Imaj indirilemedi.'",
    "    }",
    "  } else {",
    "    Write-Host '      Yayinda hazir imaj yok.'",
    "  }",
    "} catch {",
    "  Write-Host '      Yayinda hazir imaj yok (ya da sunucuya ulasilamadi).'",
    "}",
    "",
    "if (-not $bitti) {",
    "  Write-Host '[2/3] Tedbirge(R) WebOS canli paketi indiriliyor...'",
    "  $pkg = Join-Path $OutDir 'tedbirge-webos-paket'",
    "  New-Item -ItemType Directory -Force -Path $pkg | Out-Null",
    "  $bundle = Join-Path $OutDir 'dist-bundle.tar.gz'",
    "  $paketVar = $false",
    "  try {",
    '    Invoke-WebRequest -Uri "$Origin/dist-bundle.tar.gz" -OutFile $bundle -UseBasicParsing -TimeoutSec 120',
    "    if ((Test-Path $bundle) -and ((Get-Item $bundle).Length -gt 0)) {",
    "      $paketVar = $true",
    "      $tar = Get-Command tar.exe -ErrorAction SilentlyContinue",
    "      if ($tar) {",
    "        tar -xzf $bundle -C $pkg",
    "        Remove-Item $bundle -Force -ErrorAction SilentlyContinue",
    "        Write-Host '      Paket tedbirge-webos-paket klasorune acildi.'",
    "      } else {",
    "        Write-Host '      Paket dist-bundle.tar.gz olarak indirildi.'",
    "      }",
    "    } else {",
    "      Write-Host '      Paket bos indi; sunucudaki dosya su an hazir degil.'",
    "    }",
    "  } catch {",
    "    $m = $_.Exception.Message",
    "    if ($m -match '404') {",
    "      Write-Host '      Paket sunucuda bulunamadi (henuz yayinlanmamis olabilir).'",
    "    } elseif ($m -match 'resolve|ad çöz|remote name|DNS') {",
    "      Write-Host '      Internet baglantisi yok gibi gorunuyor (adres cozulemedi).'",
    "    } else {",
    "      Write-Host '      Sunucuya ulasilamadi. Internet baglantinizi kontrol edip tekrar deneyin.'",
    "    }",
    "  }",
    "  if ($paketVar) {",
    "    try {",
    '      Invoke-WebRequest -Uri "$Origin/kernel/tedbirge_kernel.wasm" -OutFile (Join-Path $pkg \'tedbirge_kernel.wasm\') -UseBasicParsing -TimeoutSec 60',
    "    } catch { Write-Host '      Not: cekirdek dosyasi indirilemedi (kurulum icin zorunlu degil).' }",
    "  }",
    "",
    "  $isoUretildi = $null",
    "  if (Test-WslBash) {",
    "    Write-Host '      Linux ortami (WSL) dogrulandi - gercek .iso uretiliyor...'",
    `    $sh = Join-Path $OutDir '${KIT_SH}'`,
    "    if (Test-Path $sh) {",
    "      try {",
    "        $wslDir = & wsl.exe wslpath -a ($OutDir -replace '\\\\$','')",
    `        & wsl.exe -e bash -lc "cd '$wslDir' && ORIGIN='$Origin' bash ./${KIT_SH}"`,
    "      } catch {",
    "        Write-Host '      Linux ortaminda derleme tamamlanamadi.'",
    "      }",
    "    }",
    "    $bulunan = Get-ChildItem -Path $OutDir -Recurse -Filter '*.iso' -ErrorAction SilentlyContinue |",
    "      Where-Object { $_.Length -gt 1MB } | Sort-Object Length -Descending | Select-Object -First 1",
    "    if ($bulunan) { $isoUretildi = $bulunan }",
    "  }",
    "",
    "  if ($isoUretildi) {",
    "    $mb = [math]::Round($isoUretildi.Length / 1MB, 1)",
    "    Write-Host \"[3/3] Basarili! .iso dosyaniz hazir ($mb MB).\"",
    "    Write-Host \"      Konum: $($isoUretildi.FullName)\"",
    "    Write-Host '      Rufus veya Ventoy ile USB belleginize yazdirabilirsiniz.'",
    "  } else {",
    "    Write-Host '[3/3] .iso olusturulamadi.'",
    "    Write-Host '      Sunucuda hazir .iso bulunamadi ve bu sistemde Linux (WSL/bash)'",
    "    Write-Host '      ortami olmadigi icin ISO derlenemedi.'",
    "    if ($paketVar) {",
    "      Write-Host '      Yine de WebOS paketi indirildi: tedbirge-webos-paket klasoru.'",
    "    }",
    '    Write-Host "      Tek tikla .iso icin Yonetici PowerShell penceresinde: wsl --install -d Ubuntu"',
    "    Write-Host '      Bilgisayari yeniden baslattiktan sonra kur.bat dosyasina tekrar cift tiklayin.'",
    "  }",
    "}",
    "Write-Host ''",
    "Read-Host 'Kapatmak icin Enter tusuna basin'",
    "",
  ].join("\r\n");
}

/**
 * Windows kiti: çift tıklanır. Tüm iş PowerShell betiğinde yapılır;
 * `cmd /k` sayesinde pencere hata durumunda dahi kapanmaz.
 */
function buildKitBat(): string {
  return [
    "@echo off",
    "chcp 65001 > nul",
    "title Tedbirge(R) WebOS - Kurulum",
    `cmd /k powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0${KIT_PS1}"`,
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
    "  2. WSL varsa imaj otomatik üretilir; WSL yoksa paket PowerShell ile indirilir.",
    "  3. İşlem bitince aynı klasörde .iso dosyanız (veya paket klasörünüz) hazır olur.",
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
          { name: KIT_BAT, data: buildKitBat() },
          { name: KIT_PS1, data: buildKitPs1(origin) },
          { name: "OKUBENI.txt", data: buildReadme(origin) },
        ]);

        return new Response(zip.buffer as ArrayBuffer, {
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
