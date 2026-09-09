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
# İki ürün sürümü: workstation (masaüstü/dizüstü) ve touch (tablet/2'si 1 arada).
# Ortak taban image/profiles/common.list; profil listesi yalnızca seçilen
# sürüme kopyalanır. Ayrıntı: .lovable/plan/ bölünmüş derleme planı.
EDITION="${TEDBIRGE_EDITION:-workstation}"
case "$EDITION" in
  workstation) SURUM_ADI="Workstation";  VOLID="TEDBIRGE_WS" ;;
  touch)       SURUM_ADI="Touch & Mobile"; VOLID="TEDBIRGE_TOUCH" ;;
  *) echo "! Geçersiz TEDBIRGE_EDITION: $EDITION (workstation|touch)" >&2; exit 1 ;;
esac
BUILD="$WORK/build-iso/live"
OUT="$WORK/build-iso/iso"

echo "== Tedbirge(R) WebOS $SURUM_ADI kurulum imajı · $VERSION =="

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
export APT_LISTCHANGES_FRONTEND=none
APT_OPTS=(-y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold")
timeout --foreground 10m stdbuf -oL -eL apt-get update
timeout --foreground 20m stdbuf -oL -eL apt-get install "${APT_OPTS[@]}" --no-install-recommends \
  live-build debootstrap squashfs-tools xorriso isolinux syslinux-common \
  grub-pc-bin grub-efi-amd64-bin mtools dosfstools ca-certificates rsync \
  file coreutils zstd python3

# ---------------------------------------------------------- çalışma alanı
rm -rf "$BUILD"
mkdir -p "$BUILD" "$OUT"
cp -r "$WORK/image/config" "$BUILD/config"
cd "$BUILD"

# Sürüm profili: ortak liste + seçilen sürümün listesi.
mkdir -p config/package-lists
cp "$WORK/image/profiles/common.list" config/package-lists/common.list.chroot
cp "$WORK/image/profiles/$EDITION.list" "config/package-lists/$EDITION.list.chroot"
echo "-- sürüm profili: $EDITION (common + $EDITION)"

# bookworm-backports deposu: çekirdek ve firmware bu depodan gelir.
mkdir -p config/archives
cat > config/archives/bookworm-backports.list.chroot <<'EOF'
deb http://deb.debian.org/debian bookworm-backports main contrib non-free non-free-firmware
EOF

# ------------------------------------------------- paket listesi ön denetimi
# Yanlış yazılmış ya da depoda olmayan tek bir paket, saatler süren derlemenin
# ortasında "Unable to locate package" ile çöker. Bu denetim aynı hatayı
# saniyeler içinde ve paket adını söyleyerek yakalar.
echo "-- paket listeleri depolara karşı doğrulanıyor"
python3 "$WORK/scripts/verify-packages.py" \
  "config/package-lists/common.list.chroot" \
  "config/package-lists/$EDITION.list.chroot" \
  || { echo "! Paket listesi hatalı — derleme başlatılmadı." >&2; exit 1; }


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
EDITION="$EDITION"
HTTP_PORT=80
EOF
cat > config/includes.chroot/etc/tedbirge-image.json <<EOF
{"product":"Tedbirge WebOS","edition":"$EDITION","distribution":"Debian","codename":"bookworm","version":"$VERSION","commit":"$COMMIT","built_at":"$BUILD_TIME","architecture":"x86_64"}
EOF
# Arayüz, çalıştığı sistemin sürümünü bu dosyadan okur (tek kod tabanı,
# sürüme göre dokunmatik varsayılanlar).
cp config/includes.chroot/etc/tedbirge-image.json \
   config/includes.chroot/var/www/tedbirge/tedbirge-image.json

chmod +x config/hooks/normal/*.hook.chroot

# ------------------------------------------------------------- yapılandırma
# console=ttyS0: CI açılış testinin hazır sinyalini okuyabilmesi için şart.
lb config \
  --distribution bookworm \
  --architectures amd64 \
  --archive-areas "main contrib non-free non-free-firmware" \
  --binary-images iso-hybrid \
  --bootloaders "syslinux,grub-efi" \
  --debian-installer none \
  --memtest none \
  --apt-recommends false \
  --backports false \
  --iso-application "Tedbirge WebOS $SURUM_ADI" \
  --iso-publisher "Mehmet DINC; tedbirge.app" \
  --iso-volume "$VOLID" \
  --image-name "tedbirge-webos-$EDITION" \
  --bootappend-live "boot=live components noeject quiet loglevel=3 rootdelay=5 usbcore.autosuspend=-1 live-media-timeout=20 modules=loop,squashfs,overlay,iso9660 console=tty0 console=ttyS0,115200 hostname=tedbirge"

# --------------------------------------------------------------- derleme
timeout --foreground 90m stdbuf -oL -eL lb build

ISO=$(ls -1 "$BUILD"/*.iso "$BUILD"/*.hybrid.iso 2>/dev/null | head -1 || true)
[ -n "$ISO" ] || { echo "! ISO üretilmedi." >&2; ls -la "$BUILD" >&2; exit 1; }

# UEFI güvencesi: bilgisayarlar UEFI açılışında ya ISO9660 ağacındaki
# EFI/boot/bootx64.efi dosyasını ya da El Torito'daki gömülü EFI (FAT) imajını
# kullanır. live-build çoğu kez yalnızca ikincisini üretir; bu yüzden ikisinden
# biri yeterlidir. Hiçbiri yoksa imaj UEFI'de açılmaz ve derleme durur.
if command -v xorriso >/dev/null 2>&1; then
  UEFI_OK=0
  # 1) ISO9660 ağacında dosya (buyuk/kucuk harf farkli olabilir)
  if xorriso -indev "$ISO" -find / -name 'bootx64.efi' 2>/dev/null | grep -qi 'bootx64.efi' \
    || xorriso -indev "$ISO" -find / -name 'BOOTX64.EFI' 2>/dev/null | grep -qi 'bootx64.efi'; then
    UEFI_OK=1
    echo "-- UEFI taşınabilir açılış dosyası ISO ağacında bulundu"
  fi
  # 2) El Torito EFI kaydı (gömülü FAT imajı)
  if [ "$UEFI_OK" = 0 ] \
    && xorriso -indev "$ISO" -report_el_torito plain 2>/dev/null | grep -qiE 'UEFI|efi'; then
    UEFI_OK=1
    echo "-- UEFI açılışı El Torito EFI kaydıyla doğrulandı"
  fi
  if [ "$UEFI_OK" = 0 ]; then
    echo "! ISO'da UEFI açılış yolu yok (ne EFI/boot/bootx64.efi ne El Torito EFI kaydı)." >&2
    xorriso -indev "$ISO" -report_el_torito plain 2>&1 | head -30 >&2 || true
    exit 1
  fi
fi


BASENAME="tedbirge-webos-$EDITION-x86_64"
TARGET="$OUT/$BASENAME.iso"
cp "$ISO" "$TARGET"
SAFE_VERSION=$(printf '%s' "$VERSION" | tr -c 'A-Za-z0-9._+-' '-')
VERSIONED="tedbirge-webos-${SAFE_VERSION}-$EDITION-x86_64.iso"
cp "$TARGET" "$OUT/$VERSIONED"
MANIFEST="TEDBIRGE-ISO-MANIFEST-$EDITION.json"
(
  cd "$OUT"
  sha256sum "$BASENAME.iso" "$VERSIONED" > "SHA256SUMS-$EDITION"
  SHA=$(sha256sum "$BASENAME.iso" | awk '{print $1}')
  SIZE=$(stat -c%s "$BASENAME.iso")
  cat > "$MANIFEST" <<EOF
{"schema":1,"product":"Tedbirge WebOS","edition":"$EDITION","distribution":"Debian","codename":"bookworm","architecture":"x86_64","version":"$VERSION","commit":"$COMMIT","built_at":"$BUILD_TIME","asset":"$BASENAME.iso","sha256":"$SHA","size":$SIZE,"validated":false}
EOF
)

echo "✓ ISO hazır: $TARGET ($(du -h "$TARGET" | cut -f1))"
