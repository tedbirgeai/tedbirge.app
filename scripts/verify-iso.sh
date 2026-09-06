#!/usr/bin/env bash
# Üretilen ISO'nun dağıtım, önyükleme ve kök dosya sistemi bütünlük kapısı.
set -euo pipefail

ISO="${1:-build-iso/iso/tedbirge-webos-x86_64.iso}"
MIN_SIZE="${TEDBIRGE_ISO_MIN_SIZE:-524288000}"

fail() { echo "::error::$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Gerekli doğrulama aracı yok: $1"; }

need xorriso
need unsquashfs
[ -s "$ISO" ] || fail "ISO üretilemedi: $ISO"
[ "$(stat -c%s "$ISO")" -ge "$MIN_SIZE" ] || fail "ISO beklenenden küçük; kök dosya sistemi eksik."

PVD=$(xorriso -indev "$ISO" -pvd_info 2>&1) || fail "ISO üst bilgisi okunamadı."
printf '%s\n' "$PVD"
printf '%s\n' "$PVD" | grep -q "TEDBIRGE_WEBOS" || fail "ISO birim etiketi TEDBIRGE_WEBOS değil."

ELTORITO=$(xorriso -indev "$ISO" -report_el_torito plain 2>&1) || fail "El Torito kaydı okunamadı."
printf '%s\n' "$ELTORITO"
printf '%s\n' "$ELTORITO" | grep -qiE 'BIOS' || fail "ISO içinde BIOS önyükleme kaydı yok."
printf '%s\n' "$ELTORITO" | grep -qiE 'UEFI|EFI' || fail "ISO içinde UEFI önyükleme kaydı yok."

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for path in filesystem.squashfs vmlinuz initrd.img; do
  xorriso -osirrox on -indev "$ISO" -extract "/live/$path" "$TMP/$path" >/dev/null 2>&1 \
    || fail "ISO içinde zorunlu açılış bileşeni yok: /live/$path"
  [ -s "$TMP/$path" ] || fail "ISO açılış bileşeni boş: /live/$path"
done

LIST="$TMP/squashfs.list"
unsquashfs -ll "$TMP/filesystem.squashfs" > "$LIST" 2>&1 || fail "Squashfs kökü okunamadı."
for path in \
  usr/lib/systemd/systemd \
  usr/bin/chromium \
  usr/sbin/nginx \
  usr/bin/zstd \
  usr/local/sbin/tedbirge-kur \
  var/www/tedbirge/index.html \
  var/www/tedbirge/kernel/tedbirge_kernel.wasm \
  etc/tedbirge-release \
  etc/tedbirge-image.json; do
  grep -Eq "(^|/)$path$" "$LIST" || fail "Squashfs içinde zorunlu bileşen yok: /$path"
done

if grep -qiE 'apkovl|alpine-release|vmlinuz-lts' "$LIST"; then
  fail "Yanlış dağıtım bulundu: eski Alpine imajı yayınlanamaz."
fi

for menu in /isolinux/live.cfg /boot/grub/grub.cfg; do
  xorriso -osirrox on -indev "$ISO" -extract "$menu" "$TMP/$(basename "$menu").txt" >/dev/null 2>&1 \
    || fail "Kurulum menüsü bulunamadı: $menu"
done
grep -q "tedbirge.install=1" "$TMP/live.cfg.txt" || fail "BIOS kurulum menüsü etkileşimli kurulumu başlatmıyor."
grep -q "tedbirge.install=1" "$TMP/grub.cfg.txt" || fail "UEFI kurulum menüsü etkileşimli kurulumu başlatmıyor."

# Menü sonsuz beklemeye düşerse sistem hiçbir zaman kendiliğinden açılmaz.
xorriso -osirrox on -indev "$ISO" -extract /isolinux/isolinux.cfg "$TMP/isolinux.cfg.txt" >/dev/null 2>&1 \
  || fail "BIOS önyükleyici yapılandırması ISO içinde yok."
grep -qE '^timeout [1-9][0-9]*$' "$TMP/isolinux.cfg.txt" \
  || fail "BIOS menüsü otomatik açılmıyor (timeout 0 = sonsuz bekleme)."
grep -q 'set timeout=' "$TMP/grub.cfg.txt" \
  || fail "UEFI menüsü otomatik açılmıyor."

echo "✓ ISO yapısı, Debian kökü, BIOS/UEFI menüleri ve otomatik açılış zaman aşımı doğrulandı."