#!/bin/bash
# Tedbirge(R) WebOS — kurulum imajı derleyicisi (Debian live-build)
# ------------------------------------------------------------------
# Ayrıcalıklı bir debian:bookworm konteynerinde çalışır:
#   docker run --rm --privileged -v "$PWD:/work" -w /work debian:bookworm \
#     bash /work/image/build.sh
#
# ÇEKİRDEK İLKE: kök dosya sistemi BURADA, derleme sırasında bir kez kurulur ve
# tek bir sıkıştırılmış dosyaya (squashfs) paketlenir. Kullanıcının bilgisayarı
# açılışta hiçbir paket kurmaz; yalnızca hazır kökü bağlar. Eski Alpine hattı
# her açılışta paket kurduğu için "Attempted to kill init" paniği veriyordu.
#
# Girdi : /work/build-iso/web        (arayüz paketi, bun run build:iso)
#         /work/build-iso/payload/bin (isteğe bağlı güç köprüsü ikilisi)
# Çıktı : /work/build-iso/iso/tedbirge-webos-x86_64.iso
set -euo pipefail

WORK="${WORK:-/work}"
VERSION="${TEDBIRGE_VERSION:-1.0.0}"
COMMIT="${TEDBIRGE_COMMIT:-${GITHUB_SHA:-unknown}}"
BUILD_TIME="${TEDBIRGE_BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
BUILD="$WORK/build-iso/live"
OUT="$WORK/build-iso/iso"
VOLID="TEDBIRGE_WEBOS"

echo "== Tedbirge(R) WebOS kurulum imajı · $VERSION =="

# ----------------------------------------------------------- girdi denetimi
if [ -s "$WORK/build-iso/web/index.html" ]; then
  WEBROOT="$WORK/build-iso/web"
else
  echo "! Arayüz paketi yok: build-iso/web/index.html" >&2
  echo "  Önce 'bun run build:iso' çalıştırın." >&2
  exit 1
fi
if [ ! -s "$WEBROOT/kernel/tedbirge_kernel.wasm" ]; then
  echo "! Çekirdek dosyası yok: $WEBROOT/kernel/tedbirge_kernel.wasm" >&2
  exit 1
fi

# ------------------------------------------------------------- araç zinciri
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  live-build debootstrap squashfs-tools xorriso isolinux syslinux-common \
  grub-pc-bin grub-efi-amd64-bin mtools dosfstools ca-certificates rsync \
  file coreutils

# ---------------------------------------------------------- çalışma alanı
rm -rf "$BUILD"
mkdir -p "$BUILD" "$OUT"
cp -r "$WORK/image/config" "$BUILD/config"
cd "$BUILD"

# Arayüz paketi kök dosya sistemine gömülür (ağ gerektirmez).
mkdir -p config/includes.chroot/var/www/tedbirge
rsync -a --delete "$WEBROOT/" config/includes.chroot/var/www/tedbirge/

# Güç köprüsü ikilisi varsa gömülür; yoksa kabuk yedeği kullanılır.
if [ -s "$WORK/build-iso/payload/bin/tedbirge-sysbridge" ]; then
  install -Dm755 "$WORK/build-iso/payload/bin/tedbirge-sysbridge" \
    config/includes.chroot/opt/tedbirge/tedbirge-sysbridge
  echo "-- güç köprüsü ikilisi paketlendi"
else
  echo "-- güç köprüsü ikilisi yok; kabuk yedeği kullanılacak"
fi

# Kalıcı disk kurulumu aracı
install -Dm755 "$WORK/image/install/tedbirge-kur" \
  config/includes.chroot/usr/local/sbin/tedbirge-kur

# Sürüm damgası
mkdir -p config/includes.chroot/etc
cat > config/includes.chroot/etc/tedbirge-release <<EOF
NAME="Tedbirge(R) WebOS"
VERSION=$VERSION
ID=tedbirge-webos
ID_LIKE=debian
DEBIAN_CODENAME=bookworm
BUILD_COMMIT=$COMMIT
BUILD_TIME=$BUILD_TIME
VARIANT="live-kiosk"
HTTP_PORT=80
EOF
cat > config/includes.chroot/etc/tedbirge-image.json <<EOF
{"product":"Tedbirge WebOS","distribution":"Debian","codename":"bookworm","version":"$VERSION","commit":"$COMMIT","built_at":"$BUILD_TIME","architecture":"x86_64"}
EOF

chmod +x config/hooks/normal/*.hook.chroot

# ------------------------------------------------------------- yapılandırma
# console=ttyS0: CI açılış testinin hazır sinyalini okuyabilmesi için şart.
lb config \
  --distribution bookworm \
  --architectures amd64 \
  --archive-areas "main contrib non-free-firmware" \
  --binary-images iso-hybrid \
  --bootloaders "syslinux,grub-efi" \
  --debian-installer none \
  --memtest none \
  --apt-recommends false \
  --backports false \
  --iso-application "Tedbirge WebOS" \
  --iso-publisher "Mehmet DINC; tedbirge.app" \
  --iso-volume "$VOLID" \
  --image-name "tedbirge-webos" \
  --bootappend-live "boot=live components noeject quiet loglevel=3 rootdelay=5 live-media-timeout=20 modules=loop,squashfs,overlay,iso9660 console=tty0 console=ttyS0,115200 hostname=tedbirge"

# --------------------------------------------------------------- derleme
lb build

ISO=$(ls -1 "$BUILD"/*.iso "$BUILD"/*.hybrid.iso 2>/dev/null | head -1 || true)
[ -n "$ISO" ] || { echo "! ISO üretilmedi." >&2; ls -la "$BUILD" >&2; exit 1; }

TARGET="$OUT/tedbirge-webos-x86_64.iso"
cp "$ISO" "$TARGET"
SAFE_VERSION=$(printf '%s' "$VERSION" | tr -c 'A-Za-z0-9._+-' '-')
VERSIONED="tedbirge-webos-${SAFE_VERSION}-x86_64.iso"
cp "$TARGET" "$OUT/$VERSIONED"
(
  cd "$OUT"
  sha256sum tedbirge-webos-x86_64.iso "$VERSIONED" > SHA256SUMS
  SHA=$(sha256sum tedbirge-webos-x86_64.iso | awk '{print $1}')
  SIZE=$(stat -c%s tedbirge-webos-x86_64.iso)
  cat > TEDBIRGE-ISO-MANIFEST.json <<EOF
{"schema":1,"product":"Tedbirge WebOS","distribution":"Debian","codename":"bookworm","architecture":"x86_64","version":"$VERSION","commit":"$COMMIT","built_at":"$BUILD_TIME","asset":"tedbirge-webos-x86_64.iso","sha256":"$SHA","size":$SIZE,"validated":false}
EOF
)

echo "✓ ISO hazır: $TARGET ($(du -h "$TARGET" | cut -f1))"
