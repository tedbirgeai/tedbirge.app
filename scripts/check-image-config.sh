#!/usr/bin/env bash
# Kurulum imajı yapılandırmasının bütünlük denetimi (derlemeden ÖNCE çalışır).
# Amaç: hatalı bir yapılandırmayla saatler süren bir ISO derlemesi başlatmamak.
set -euo pipefail
cd "$(dirname "$0")/.."

hata() { echo "! $*" >&2; exit 1; }

# 1) Eski, açılışta paket kuran Alpine hattı üretimde kullanılmamalı.
[ ! -d alpine ] || hata "alpine/ hâlâ etkin: eski hat arşive taşınmalı (archive/alpine)."
grep -rq "alpine/ci-build.sh" .github/workflows/ && hata "Yayın hattı hâlâ Alpine derlemesini çağırıyor."

# 2) Zorunlu dosyalar
for f in \
  image/build.sh \
  image/install/tedbirge-kur \
  image/config/package-lists/tedbirge.list.chroot \
  image/config/hooks/normal/9000-tedbirge.hook.chroot \
  image/config/includes.chroot/etc/nginx/sites-available/tedbirge.conf \
  image/config/includes.chroot/opt/tedbirge/kiosk.sh \
  image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh \
  image/config/includes.chroot/etc/systemd/system/tedbirge-kiosk.service \
  image/config/includes.chroot/etc/systemd/system/tedbirge-ready.service \
  image/config/includes.chroot/etc/systemd/system/tedbirge-installer.service \
  image/config/bootloaders/syslinux_common/live.cfg.in \
  image/config/bootloaders/grub-pc/grub.cfg \
  scripts/verify-iso.sh \
  scripts/test-install-qemu.sh
do
  [ -s "$f" ] || hata "Zorunlu dosya yok: $f"
done

# 3) Paket listesi: sistemin açılması için zorunlu paketler
for p in live-boot live-config linux-image-amd64 systemd-sysv chromium nginx-light \
         xserver-xorg xinit squashfs-tools grub-pc-bin grub-efi-amd64-bin parted; do
  grep -qx "$p" image/config/package-lists/tedbirge.list.chroot \
    || hata "Paket listesinde '$p' yok."
done

# 4) Açılış hattı: hazır sinyali ve seri konsol
grep -q "console=ttyS0" image/build.sh || hata "Seri konsol açılış satırında yok; CI testi kör kalır."
grep -q "TEDBIRGE_BOOT_READY" image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh \
  || hata "Hazır sinyali tanımlı değil."
grep -q "TEDBIRGE_WEBOS" image/build.sh || hata "ISO birim etiketi tanımlı değil."
grep -q "iso-hybrid" image/build.sh || hata "BIOS+UEFI hibrit imaj kipi seçilmemiş."
grep -q "grub-efi" image/build.sh || hata "UEFI açılış yükleyicisi yapılandırılmamış."
grep -q "rootdelay=" image/build.sh || hata "Yavaş USB/CD ortamı için rootdelay= tanımlı değil."
grep -q "modules=loop,squashfs,overlay" image/build.sh || hata "Açılış satırında zorunlu modül listesi yok."
MODS=image/config/includes.chroot/etc/initramfs-tools/modules
for m in loop squashfs overlay isofs sr_mod usb_storage ahci nvme; do
  grep -qx "$m" "$MODS" || hata "initramfs modül listesinde '$m' yok: $MODS"
done

# 5) Kurulum aracı: güvenlik ve doğrulama kuralları
KUR=image/install/tedbirge-kur
grep -q 'EVET' "$KUR"            || hata "Kurulum aracında açık onay adımı yok."
grep -q 'MIN_BAYT' "$KUR"        || hata "Kurulum aracında en küçük disk denetimi yok."
grep -q 'unsquashfs' "$KUR"      || hata "Kurulum aracı hazır kök imajını kullanmıyor."
grep -q 'grub-install' "$KUR"    || hata "Kurulum aracı açılış yükleyicisi kurmuyor."
grep -q 'systemd' "$KUR"         || hata "Kurulum sonrası init doğrulaması yok."
grep -q 'lsblk -ndo PKNAME' "$KUR" || hata "Canlı USB üst aygıtı güvenilir biçimde saptanmıyor."
grep -q 'update-initramfs.*|| hata' "$KUR" || hata "initramfs hatası sessizce geçiliyor."
grep -q 'tedbirge.install=1' image/config/bootloaders/syslinux_common/live.cfg.in \
  || hata "BIOS menüsünde etkileşimli kurulum seçeneği yok."
grep -q 'tedbirge.install=1' image/config/bootloaders/grub-pc/grub.cfg \
  || hata "UEFI menüsünde etkileşimli kurulum seçeneği yok."

# 6) Kabuk sözdizimi
for s in image/build.sh image/install/tedbirge-kur scripts/test-install-qemu.sh \
         scripts/verify-iso.sh \
         image/config/hooks/normal/9000-tedbirge.hook.chroot \
         image/config/includes.chroot/opt/tedbirge/kiosk.sh \
         image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh; do
  bash -n "$s" 2>/dev/null || sh -n "$s" || hata "Sözdizimi hatası: $s"
done

echo "✓ Kurulum imajı yapılandırması doğrulandı."
