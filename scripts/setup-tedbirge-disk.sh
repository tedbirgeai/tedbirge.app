#!/bin/sh
# =====================================================================
# Tedbirge(R) WebOS — Otomatik Disk Kurulumu (Turkce)
# ---------------------------------------------------------------------
# ISO icinden calisir. Hedef diski secer, EFI (FAT32) + ext4 olarak
# bolumler, WebOS dosya sistemini diske yazar, GRUB'u kurar ve
# "Kurulum tamamlandi, USB'yi cikarip yeniden baslatin" uyarisi verir.
#
# Hicbir disk, kullanici buyuk harflerle EVET yazmadan silinmez.
# =====================================================================
set -u

MNT=/mnt/tedbirge
SRC_WWW=/var/www/localhost/htdocs

say() { printf '%s\n' "$1"; }
hata() {
  say ""
  say "! $1"
  say ""
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exit 1
}

clear
say "==============================================="
say "   TEDBIRGE(R) WebOS — Diske Kurulum"
say "==============================================="
say ""

[ "$(id -u)" = "0" ] || hata "Bu islem yonetici yetkisi ister."

# --- 1) Hedef disk secimi -------------------------------------------
DISKS=$(lsblk -dnro NAME,SIZE,MODEL,TYPE,RM 2>/dev/null \
  | awk '$4=="disk" && $5=="0" {printf "%s %s %s\n",$1,$2,$3}')

[ -n "$DISKS" ] || DISKS=$(lsblk -dnro NAME,SIZE,MODEL,TYPE 2>/dev/null \
  | awk '$4=="disk"{printf "%s %s %s\n",$1,$2,$3}')

[ -n "$DISKS" ] || hata "Kurulum yapilabilecek bir disk bulunamadi. Bilgisayarinizda SATA/NVMe disk oldugundan emin olun."

SAYI=$(printf '%s\n' "$DISKS" | wc -l | tr -d ' ')

if [ "$SAYI" = "1" ]; then
  TARGET=$(printf '%s\n' "$DISKS" | awk '{print $1}')
  say "Tek disk bulundu ve otomatik secildi:"
  say "  /dev/$TARGET  ($(printf '%s\n' "$DISKS" | cut -d' ' -f2-))"
else
  say "Bulunan diskler:"
  printf '%s\n' "$DISKS" | nl -w2 -s') '
  say ""
  printf "Kurulacak disk numarasi (iptal icin bos birakin): "
  read -r SEC
  [ -n "$SEC" ] || hata "Iptal edildi — hicbir diske dokunulmadi."
  TARGET=$(printf '%s\n' "$DISKS" | sed -n "${SEC}p" | awk '{print $1}')
  [ -n "$TARGET" ] || hata "Gecersiz secim."
fi

say ""
say "UYARI: /dev/$TARGET uzerindeki TUM VERILER SILINECEK."
printf "Devam etmek icin buyuk harflerle EVET yazin: "
read -r ONAY
[ "$ONAY" = "EVET" ] || hata "Onaylanmadi — hicbir diske dokunulmadi."

DEV="/dev/$TARGET"
case "$TARGET" in
  nvme*|mmcblk*) P1="${DEV}p1"; P2="${DEV}p2" ;;
  *)             P1="${DEV}1";  P2="${DEV}2"  ;;
esac

# --- 2) Bolumleme ----------------------------------------------------
say ""
say "> Disk bolumleniyor (EFI + ext4)..."
umount "${DEV}"* 2>/dev/null
swapoff -a 2>/dev/null

wipefs -a "$DEV" >/dev/null 2>&1
parted -s "$DEV" mklabel gpt || hata "Disk bolumlenemedi. Disk yazma korumali olabilir."
parted -s "$DEV" mkpart ESP fat32 1MiB 513MiB || hata "EFI bolumu olusturulamadi."
parted -s "$DEV" set 1 esp on
parted -s "$DEV" mkpart tedbirge ext4 513MiB 100% || hata "Sistem bolumu olusturulamadi."
sync; sleep 2

mkfs.vfat -F32 -n TEDBIRGE_EFI "$P1" >/dev/null 2>&1 || hata "EFI bolumu bicimlendirilemedi."
mkfs.ext4 -F -L TEDBIRGE "$P2" >/dev/null 2>&1 || hata "Sistem bolumu bicimlendirilemedi."

# --- 3) Sistemi diske yaz -------------------------------------------
say "> Sistem diske yaziliyor, bu islem birkac dakika surer..."
mkdir -p "$MNT"
mount "$P2" "$MNT" || hata "Sistem bolumu baglanamadi."

export ERASE_DISKS=""
export BOOTLOADER=grub
export USE_EFI=1

if command -v setup-disk >/dev/null 2>&1; then
  if ! setup-disk -m sys "$MNT"; then
    umount -R "$MNT" 2>/dev/null
    hata "Sistem dosyalari kopyalanamadi."
  fi
else
  umount -R "$MNT" 2>/dev/null
  hata "Kurulum araci bulunamadi (setup-disk)."
fi

# --- 4) WebOS dosya sistemi ve kiosk yapilandirmasi -----------------
say "> Tedbirge WebOS arayuzu ve servisleri kopyalaniyor..."
mkdir -p "$MNT$SRC_WWW" "$MNT/opt/tedbirge" "$MNT/etc/nginx/http.d" "$MNT/etc/profile.d"
cp -a "$SRC_WWW/." "$MNT$SRC_WWW/" 2>/dev/null
cp -a /opt/tedbirge/. "$MNT/opt/tedbirge/" 2>/dev/null
cp -a /etc/nginx/http.d/tedbirge.conf "$MNT/etc/nginx/http.d/" 2>/dev/null
cp -a /etc/profile.d/tedbirge-kiosk.sh "$MNT/etc/profile.d/" 2>/dev/null
cp -a /etc/inittab "$MNT/etc/inittab" 2>/dev/null
cp -a /root/.xinitrc "$MNT/root/.xinitrc" 2>/dev/null

# EFI bolumu ve onyukleyici
mkdir -p "$MNT/boot/efi"
mount "$P1" "$MNT/boot/efi" 2>/dev/null
for d in dev proc sys; do mount --bind "/$d" "$MNT/$d" 2>/dev/null; done

chroot "$MNT" /bin/sh -c '
  rc-update add nginx default 2>/dev/null
  rc-update add dbus default 2>/dev/null
  rc-update add tedbirge-shell default 2>/dev/null
  grub-install --target=x86_64-efi --efi-directory=/boot/efi \
    --bootloader-id=tedbirge --removable 2>/dev/null \
    || grub-install --target=i386-pc '"$DEV"' 2>/dev/null
  grub-mkconfig -o /boot/grub/grub.cfg 2>/dev/null
' || say "  (uyari: onyukleyici adimi kismen tamamlandi)"

sync
for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done
umount "$MNT/boot/efi" 2>/dev/null
umount -R "$MNT" 2>/dev/null

# --- 5) Bitis -------------------------------------------------------
say ""
say "==============================================="
say "  Kurulum tamamlandi, USB'yi cikarip yeniden"
say "  baslatin."
say "==============================================="
say ""
read -r -p "Simdi yeniden baslatmak icin Enter'a basin " _
reboot
