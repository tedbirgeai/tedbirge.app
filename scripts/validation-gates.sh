#!/usr/bin/env bash
# Tedbirge(R) WebOS — Faz 3: Doğrulama Kapıları (Validation Gates)
#
# Tek giriş noktası. Buradaki kapıların TAMAMI yeşil olmadan ISO derlenmez ve
# yayınlanmaz. Derleme öncesi (kaynak) ve derleme sonrası (imaj) kapıları
# ayrı çalıştırılabilir:
#
#   bash scripts/validation-gates.sh once           # derleme öncesi
#   bash scripts/validation-gates.sh imaj <iso>     # üretilen imaj
#   bash scripts/validation-gates.sh tumu <iso>     # ikisi birden
set -uo pipefail

KIP="${1:-tumu}"
ISO="${2:-}"
GECEN=0
KALAN=0

kapi() { # ad, komut...
  local ad="$1"; shift
  echo ""
  echo "=== KAPI: $ad"
  if "$@"; then
    GECEN=$((GECEN + 1)); echo "✓ $ad"
  else
    KALAN=$((KALAN + 1)); echo "::error::KAPI BAŞARISIZ — $ad"
  fi
}

kaynak_kapilari() {
  kapi "Çevrimdışı bağımsızlık: dış yazı tipi/CDN yok" bash -c '
    set -e
    if grep -rn "fonts.googleapis.com\|fonts.gstatic.com\|cdn.jsdelivr.net\|unpkg.com" src \
         --include="*.ts" --include="*.tsx" --include="*.css" | grep -v "^src/.*__tests__"; then
      echo "::error::Kabukta dış yazı tipi/CDN bağımlılığı var" >&2; exit 1
    fi
    grep -q "@fontsource/" src/styles.css'
  kapi "Canlı önyükleme kurumsal açılış ekranı" bash -c '
    set -e
    grep -q "quiet splash" image/build.sh
    grep -q "plymouth-set-default-theme tedbirge" image/config/hooks/normal/9000-tedbirge.hook.chroot'
  kapi "Kurulum imajı yapılandırması" bash scripts/check-image-config.sh
  kapi "Kurucu güvenlik ve kullanıcı deneyimi sözleşmesi" bash scripts/test-installer-contract.sh
  kapi "Paket listeleri Debian depolarında" python3 scripts/verify-packages.py \
    image/profiles/common.list image/profiles/workstation.list image/profiles/touch.list
  kapi "Kabuk betikleri sözdizimi" bash -c '
    set -e
    for f in image/build.sh image/install/tedbirge-kur scripts/*.sh; do bash -n "$f"; done
    for f in image/config/hooks/normal/*.hook.chroot image/config/includes.chroot/opt/tedbirge/*.sh; do sh -n "$f"; done'
  kapi "Açılış menüleri: normal + güvenli görüntü + uyumluluk + otomatik kurulum" bash -c '
    set -e
    G=image/config/bootloaders/grub-pc/grub.cfg
    S=image/config/bootloaders/syslinux_common/live.cfg.in
    for f in "$G" "$S"; do
      grep -q "nomodeset" "$f"
      grep -q "pci=nomsi" "$f"
      grep -q "usbcore.autosuspend=-1" "$f"
      grep -q "tedbirge.autoinstall=1" "$f"
    done'
  kapi "Sürücü ve firmware paketleri profilde" bash -c '
    set -e
    for p in firmware-linux-free firmware-linux-nonfree firmware-misc-nonfree \
             firmware-realtek firmware-iwlwifi firmware-atheros \
             firmware-amd-graphics firmware-sof-signed; do
      grep -qx "$p" image/profiles/common.list
    done'
  kapi "Ekran/girdi gözcüsü kurulu" bash -c '
    set -e
    test -s image/config/includes.chroot/opt/tedbirge/gozcu.sh
    test -s image/config/includes.chroot/etc/systemd/system/tedbirge-gozcu.service
    grep -q "tedbirge-gozcu.service" image/config/hooks/normal/9000-tedbirge.hook.chroot'
  # Faz 4: gömülü ofis süreçleri + VFS. Paket varsa paket seviyesinde de denetlenir.
  if [ -d build-iso/web ]; then
    kapi "Gömülü ofis süreçleri ve VFS katmanı (kaynak + imaj paketi)" \
      bash scripts/verify-office-bundle.sh build-iso/web
  else
    kapi "Gömülü ofis süreçleri ve VFS katmanı (kaynak)" \
      bash scripts/verify-office-bundle.sh
  fi
  if command -v unsquashfs >/dev/null 2>&1; then
    kapi "Sistem kopyalama komutu gerçek squashfs ile" bash scripts/test-squashfs-copy.sh
  else
    echo "-- unsquashfs yok; kopyalama kapısı bu ortamda atlandı (CI'de zorunlu)."
  fi
}

imaj_kapilari() {
  [ -n "$ISO" ] || { echo "::error::İmaj kapısı için ISO yolu gerekli."; KALAN=$((KALAN + 1)); return; }
  kapi "ISO bütünlüğü, BIOS/UEFI önyükleme ve menü girdileri" bash scripts/verify-iso.sh "$ISO"
}

case "$KIP" in
  once) kaynak_kapilari ;;
  imaj) imaj_kapilari ;;
  tumu) kaynak_kapilari; imaj_kapilari ;;
  *) echo "Kullanım: $0 [once|imaj|tumu] [iso]"; exit 2 ;;
esac

echo ""
echo "==============================================="
echo "  DOĞRULAMA KAPILARI: $GECEN geçti, $KALAN kaldı"
echo "==============================================="
[ "$KALAN" -eq 0 ] || { echo "::error::Kapılar yeşil değil — imaj üretilmez/yayınlanmaz."; exit 1; }
echo "Tüm kapılar yeşil."
