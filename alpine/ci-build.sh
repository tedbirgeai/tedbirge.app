#!/bin/sh
# CI içinde (alpine konteynerinde) çalışır. Yerel makinede çalıştırmak gerekmez.
# Girdi : /work/build-iso/web (kurulum imajına özel derlenmiş arayüz)
# Çıktı : /work/build-iso/iso/tedbirge-webos-<sürüm>-x86_64.iso
set -eu

VERSION="${TEDBIRGE_VERSION:-1.0.0}"
WORK=/work
OUT="$WORK/build-iso/iso"

echo "== Tedbirge(R) WebOS ISO derlemesi · $VERSION =="

# Kurulum imajı derlemesi arayüzü build-iso/web altına yazar; yayın çıktısı
# (dist/client) yalnızca geriye dönük yedek olarak kabul edilir.
if [ -f "$WORK/build-iso/web/index.html" ]; then
  WEBROOT="$WORK/build-iso/web"
elif [ -f "$WORK/dist/client/index.html" ]; then
  WEBROOT="$WORK/dist/client"
elif [ -f "$WORK/dist/index.html" ]; then
  WEBROOT="$WORK/dist"
else
  echo "! Web paketi bulunamadı: build-iso/web/index.html yok."
  echo "  Önce 'bun run build:iso' çalıştırın (ön-render açılış sayfasını üretir)."
  exit 1
fi

if [ ! -s "$WEBROOT/kernel/tedbirge_kernel.wasm" ]; then
  echo "! $WEBROOT/kernel/tedbirge_kernel.wasm yok — çekirdeksiz imaj yayınlanmaz."
  echo "  Önce 'bash scripts/build-kernel.sh' çalıştırın."
  exit 1
fi

echo "-- Web paketi kaynağı: $WEBROOT"

apk update
apk add --no-cache \
  alpine-sdk alpine-conf busybox-static apk-tools-static \
  xorriso squashfs-tools syslinux grub grub-efi mtools dosfstools \
  git bash coreutils tar

adduser -D -G abuild builder 2>/dev/null || true
addgroup builder abuild 2>/dev/null || true
mkdir -p /var/cache/distfiles
chmod a+w /var/cache/distfiles
su builder -c 'abuild-keygen -a -i -n'

# aports (mkimage altyapısı)
git clone --depth 1 https://gitlab.alpinelinux.org/alpine/aports.git /home/builder/aports
chown -R builder:abuild /home/builder/aports

# Tedbirge profili + apkovl üreticisi
cp "$WORK/alpine/mkimg.tedbirge.sh" /home/builder/aports/scripts/
cp "$WORK/alpine/genapkovl-tedbirge.sh" /home/builder/aports/scripts/
chmod +x /home/builder/aports/scripts/mkimg.tedbirge.sh /home/builder/aports/scripts/genapkovl-tedbirge.sh

# Web paketi + açılış menüsü + kurulum sihirbazı overlay'e taşınır
mkdir -p /home/builder/tedbirge
tar -czf /home/builder/tedbirge/htdocs.tar.gz -C "$WEBROOT" .
cp -r "$WORK/alpine/install" /home/builder/tedbirge/install
cp "$WORK/scripts/setup-tedbirge-disk.sh" /home/builder/tedbirge/install/setup-tedbirge-disk.sh
chmod +x /home/builder/tedbirge/install/*.sh
cp -r "$WORK/alpine/boot" /home/builder/tedbirge/boot
chown -R builder:abuild /home/builder/tedbirge

mkdir -p "$OUT" /home/builder/iso
chown -R builder:abuild /home/builder/iso

su builder -c "cd /home/builder/aports/scripts && \
  TEDBIRGE_VERSION='$VERSION' TEDBIRGE_PAYLOAD=/home/builder/tedbirge \
  sh mkimage.sh \
    --tag '$VERSION' \
    --outdir /home/builder/iso \
    --arch x86_64 \
    --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/main \
    --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/community \
    --profile tedbirge"

for f in /home/builder/iso/*.iso; do
  [ -e "$f" ] || continue
  cp "$f" "$OUT/tedbirge-webos-$VERSION-x86_64.iso"
done

ls -lh "$OUT"
