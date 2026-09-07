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
  image/profiles/common.list \
  image/profiles/workstation.list \
  image/profiles/touch.list \
  image/config/hooks/normal/9000-tedbirge.hook.chroot \
  image/config/includes.chroot/etc/nginx/sites-available/tedbirge.conf \
  image/config/includes.chroot/opt/tedbirge/kiosk.sh \
  image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh \
  image/config/includes.chroot/etc/systemd/system/tedbirge-kiosk.service \
  image/config/includes.chroot/etc/systemd/system/tedbirge-ready.service \
  image/config/includes.chroot/etc/systemd/system/tedbirge-installer.service \
  image/config/bootloaders/syslinux_common/live.cfg.in \
  image/config/bootloaders/grub-pc/grub.cfg \
  image/config/bootloaders/isolinux/isolinux.cfg \
  scripts/verify-iso.sh \
  scripts/test-install-qemu.sh
do
  [ -s "$f" ] || hata "Zorunlu dosya yok: $f"
done

# Tek paket listesi kalıntısı kalmamalı: profiller tek doğruluk kaynağıdır.
[ ! -e image/config/package-lists/tedbirge.list.chroot ] \
  || hata "Eski tekil paket listesi duruyor; image/profiles/ kullanılıyor."

# 3) Ortak paket listesi: sistemin açılması için zorunlu paketler.
# "<paket>/<depo>" (ör. bookworm-backports hedeflemesi) biçimi de kabul edilir.
paket_var() { grep -Eq "^$1(/[^[:space:]]+)?\$" "$2"; }
for p in live-boot live-config linux-image-amd64 systemd-sysv chromium nginx-light \
         xserver-xorg xinit squashfs-tools zstd grub-pc-bin grub-efi-amd64-bin parted \
         upower firmware-sof-signed; do
  paket_var "$p" image/profiles/common.list \
    || hata "Ortak paket listesinde '$p' yok."
done
# Dokunmatik sürümün kimlik paketleri
for p in iio-sensor-proxy onboard xserver-xorg-input-wacom xserver-xorg-input-libinput; do
  grep -qx "$p" image/profiles/touch.list \
    || hata "Touch paket listesinde '$p' yok."
done
# İş istasyonu sürümünün kimlik paketleri
for p in power-profiles-daemon thermald; do
  grep -qx "$p" image/profiles/workstation.list \
    || hata "Workstation paket listesinde '$p' yok."
done

# 4) Açılış hattı: hazır sinyali ve seri konsol
grep -q "console=ttyS0" image/build.sh || hata "Seri konsol açılış satırında yok; CI testi kör kalır."
grep -q "TEDBIRGE_BOOT_READY" image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh \
  || hata "Hazır sinyali tanımlı değil."
grep -q 'VOLID=' image/build.sh || hata "ISO birim etiketi tanımlı değil."
grep -q 'TEDBIRGE_EDITION' image/build.sh || hata "Sürüm (edition) seçimi tanımlı değil."
grep -q 'image/profiles' image/build.sh || hata "Derleme betiği profil listelerini kullanmıyor."
grep -q 'bookworm-backports' image/build.sh || hata "Backports deposu yapılandırılmamış."
grep -q "iso-hybrid" image/build.sh || hata "BIOS+UEFI hibrit imaj kipi seçilmemiş."
grep -q "grub-efi" image/build.sh || hata "UEFI açılış yükleyicisi yapılandırılmamış."
grep -q "rootdelay=" image/build.sh || hata "Yavaş USB/CD ortamı için rootdelay= tanımlı değil."
# Menüde sonsuz bekleme (timeout 0) sistemin hiç açılmamasına yol açar.
grep -qE '^timeout [1-9][0-9]*$' image/config/bootloaders/isolinux/isolinux.cfg \
  || hata "BIOS menüsünde otomatik açılış zaman aşımı yok (timeout 0 = sonsuz bekleme)."
grep -q 'set timeout=' image/config/bootloaders/grub-pc/grub.cfg \
  || hata "UEFI menüsünde otomatik açılış zaman aşımı yok."
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
grep -q 'update-initramfs -u -k all' "$KUR" || hata "initramfs güncellemesi yok."
grep -A2 'update-initramfs -u -k all' "$KUR" | grep -q '|| hata' \
  || hata "initramfs hatası sessizce geçiliyor."
grep -q 'DEBIAN_FRONTEND=noninteractive' "$KUR" || hata "Kurulum aracı etkileşimsiz kipte değil."
grep -q 'surec_ilerlemesi' "$KUR" || hata "Uzun kurulum adımlarında aktivite (kilitlenme) denetimi yok."
grep -q 'TEDBIRGE_STALL_SECONDS' "$KUR" || hata "Kilitlenme eşiği ayarlanabilir değil."
grep -q 'MODULES=most' "$KUR" || hata "Kalıcı sistemde taşınabilir initramfs profili uygulanmıyor."
grep -q 'policy-rc.d' "$KUR" || hata "chroot hizmet susturucusu (policy-rc.d) yok."
grep -q 'mountpoint -q' "$KUR" || hata "chroot öncesi sanal dosya sistemi doğrulaması yok."
grep -q 'wchan' "$KUR" || hata "Kilitlenme tanılaması (wchan) yok."
grep -q -- '--no-floppy' "$KUR" || hata "grub-install disket yoklamasını kapatmıyor."
grep -q 'GRUB_DISABLE_OS_PROBER' "$KUR" || hata "os-prober kapatılmıyor (açılış menüsü adımı kilitlenebilir)."
INITCONF=image/config/includes.chroot/etc/initramfs-tools/conf.d/tedbirge.conf
grep -q 'COMPRESS=zstd' "$INITCONF" || hata "Canlı imaj initramfs sıkıştırması zstd değil: $INITCONF"
grep -q 'stdbuf -oL' "$KUR" || hata "Kurulum kayıtları satır bazında akmıyor."
grep -q 'qemu_temiz_kapat' scripts/test-install-qemu.sh || hata "QEMU kontrollü kapanış yordamı yok."
grep -q 'tedbirge.install=1' image/config/bootloaders/syslinux_common/live.cfg.in \
  || hata "BIOS menüsünde etkileşimli kurulum seçeneği yok."
grep -q 'tedbirge.install=1' image/config/bootloaders/grub-pc/grub.cfg \
  || hata "UEFI menüsünde etkileşimli kurulum seçeneği yok."
grep -q 'ConditionKernelCommandLine=!tedbirge.install=1' \
  image/config/includes.chroot/etc/systemd/system/tedbirge-kiosk.service \
  || hata "Kurulum kipinde kiosk servisi devre dışı bırakılmıyor."

# 6) Kabuk sözdizimi
for s in image/build.sh image/install/tedbirge-kur scripts/test-install-qemu.sh \
         scripts/verify-iso.sh \
         image/config/hooks/normal/9000-tedbirge.hook.chroot \
         image/config/includes.chroot/opt/tedbirge/kiosk.sh \
         image/config/includes.chroot/opt/tedbirge/tedbirge-ready.sh; do
  bash -n "$s" 2>/dev/null || sh -n "$s" || hata "Sözdizimi hatası: $s"
done

echo "✓ Kurulum imajı yapılandırması doğrulandı."
