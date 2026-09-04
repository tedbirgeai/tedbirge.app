#!/bin/sh
# Tedbirge(R) WebOS — kalici kurulum sihirbazi (Turkce, tam ekran)
# Acilis menusunde "SSD/HDD'ye Kur" secildiginde tty1'de calisir.
# Onay verilmezse canli moda doner; hicbir diske dokunmaz.
set -u

clear
echo "==============================================="
echo "   TEDBIRGE(R) WebOS — Kalici Kurulum"
echo "==============================================="
echo

DISKS=$(lsblk -dnro NAME,SIZE,MODEL,TYPE 2>/dev/null | awk '$4=="disk"{printf "%s  %s  %s\n",$1,$2,$3}')

if [ -z "$DISKS" ]; then
  echo "! Kurulum yapilabilecek bir disk bulunamadi."
  echo "  Bilgisayarinizda SATA/NVMe disk oldugundan ve BIOS'ta"
  echo "  gorundugunden emin olun."
  echo
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exec startx -- -nocursor
fi

echo "Bulunan diskler:"
echo "$DISKS" | nl -w2 -s') '
echo
echo "UYARI: Sectiginiz diskteki TUM VERILER SILINIR."
echo

printf "Kurulacak disk numarasi (iptal icin bos birakin): "
read -r SEC
[ -z "$SEC" ] && { echo "Iptal edildi — canli mod baslatiliyor."; sleep 1; exec startx -- -nocursor; }

TARGET=$(echo "$DISKS" | sed -n "${SEC}p" | awk '{print $1}')
[ -z "$TARGET" ] && { echo "Gecersiz secim."; sleep 2; exec "$0"; }

echo
echo "Secilen disk: /dev/$TARGET"
printf "Devam etmek icin buyuk harflerle EVET yazin: "
read -r ONAY
[ "$ONAY" = "EVET" ] || { echo "Onaylanmadi — canli mod baslatiliyor."; sleep 1; exec startx -- -nocursor; }

echo
echo "> Sistem diske yaziliyor, bu islem birkac dakika surer..."
export ERASE_DISKS="/dev/$TARGET"
export BOOTLOADER=grub
export USE_EFI=1

if ! setup-disk -m sys "/dev/$TARGET"; then
  echo
  echo "! Kurulum tamamlanamadi. Disk yazma korumali olabilir ya da"
  echo "  baska bir sistem tarafindan kullaniliyor olabilir."
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exec startx -- -nocursor
fi

# Kiosk yapilandirmasini ve web paketini kalici sisteme kopyala
MNT=/mnt
mkdir -p "$MNT"
mountpoint -q "$MNT" || mount "/dev/${TARGET}2" "$MNT" 2>/dev/null || mount "/dev/${TARGET}p2" "$MNT" 2>/dev/null || true
if mountpoint -q "$MNT"; then
  mkdir -p "$MNT/var/www/localhost/htdocs" "$MNT/opt/tedbirge"
  cp -a /var/www/localhost/htdocs/. "$MNT/var/www/localhost/htdocs/" 2>/dev/null || true
  cp -a /opt/tedbirge/. "$MNT/opt/tedbirge/" 2>/dev/null || true
  cp -a /etc/nginx/http.d/tedbirge.conf "$MNT/etc/nginx/http.d/" 2>/dev/null || true
  cp -a /etc/profile.d/tedbirge-kiosk.sh "$MNT/etc/profile.d/" 2>/dev/null || true
  cp -a /etc/inittab "$MNT/etc/inittab" 2>/dev/null || true
  cp -a /root/.xinitrc "$MNT/root/.xinitrc" 2>/dev/null || true
  sync
  umount "$MNT" 2>/dev/null || true
fi

echo
echo "TAMAM: Tedbirge(R) WebOS /dev/$TARGET diskine kuruldu."
echo "USB bellegi cikarip bilgisayari yeniden baslatin."
echo
read -r -p "Simdi yeniden baslatmak icin Enter'a basin " _
reboot
