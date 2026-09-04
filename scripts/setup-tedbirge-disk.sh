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
LOG_DIR=/var/log/tedbirge
LOG=$LOG_DIR/kurulum.log

mkdir -p "$LOG_DIR"
: >"$LOG"
kayit() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >>"$LOG"; }
kayit "kurulum baslatildi"

say() { printf '%s\n' "$1"; kayit "$1"; }
# hata "aciklama" "ne yapmali"
hata() {
  say ""
  say "-----------------------------------------------"
  say "! ISLEM DURDURULDU"
  say "  Sebep : $1"
  if [ "${2:-}" != "" ]; then
    say "  Cozum : $2"
  fi
  say "  Kayit : $LOG"
  say "-----------------------------------------------"
  kayit "HATA: $1"
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exit 1
}

adim() {
  say ""
  say "[$1/5] $2"
}

clear
say "==============================================="
say "   TEDBIRGE(R) WebOS — Diske Kurulum"
say "==============================================="
say ""

say "Bu sihirbaz Tedbirge(R) WebOS'u bilgisayarinizin diskine kalici"
say "olarak kurar. Islem 5 adimdan olusur ve yaklasik 5-10 dakika surer."
say ""
say "Yardim:"
say "  * Her adimda ne oldugunu ekranda goreceksiniz."
say "  * Hicbir disk, siz buyuk harflerle EVET yazmadan silinmez."
say "  * Iptal etmek icin sorulara bos cevap verip Enter'a basin."
say "  * Tum islem kaydi: $LOG"
say ""
read -r -p "Baslamak icin Enter'a basin (iptal: Ctrl+C) " _

[ "$(id -u)" = "0" ] || hata "Bu islem yonetici yetkisi ister." "Sistemi ISO uzerinden yeniden baslatip acilis menusunden 'Diske Kur' secenegini kullanin."

# --- 1) Hedef disk secimi -------------------------------------------
adim 1 "Kurulum yapilacak disk secimi"
DISKS=$(lsblk -dnro NAME,SIZE,MODEL,TYPE,RM 2>/dev/null \
  | awk '$4=="disk" && $5=="0" {printf "%s %s %s\n",$1,$2,$3}')

[ -n "$DISKS" ] || DISKS=$(lsblk -dnro NAME,SIZE,MODEL,TYPE 2>/dev/null \
  | awk '$4=="disk"{printf "%s %s %s\n",$1,$2,$3}')

[ -n "$DISKS" ] || hata "Kurulum yapilabilecek bir disk bulunamadi." "Bilgisayarinizda dahili bir SATA/NVMe disk oldugundan emin olun. BIOS'ta disk modunu 'AHCI' yapmak cogu durumda sorunu cozer."

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
  [ -n "$SEC" ] || hata "Iptal edildi — hicbir diske dokunulmadi." "Kuruluma yeniden baslamak icin 'tedbirge-kur' yazmaniz yeterli."
  TARGET=$(printf '%s\n' "$DISKS" | sed -n "${SEC}p" | awk '{print $1}')
  [ -n "$TARGET" ] || hata "Gecersiz secim." "Listedeki satir numaralarindan birini yazin (ornek: 1)."
fi

say ""
say "UYARI: /dev/$TARGET uzerindeki TUM VERILER SILINECEK."
printf "Devam etmek icin buyuk harflerle EVET yazin: "
read -r ONAY
[ "$ONAY" = "EVET" ] || hata "Onaylanmadi — hicbir diske dokunulmadi." "Devam etmek isterseniz onay sorusuna buyuk harflerle EVET yazin."

DEV="/dev/$TARGET"
case "$TARGET" in
  nvme*|mmcblk*) P1="${DEV}p1"; P2="${DEV}p2" ;;
  *)             P1="${DEV}1";  P2="${DEV}2"  ;;
esac

# --- 2) Bolumleme ----------------------------------------------------
adim 2 "Disk bolumleniyor (EFI + ext4)"
say "  Bu adimda diskte iki bolum olusturulur: acilis bolumu ve sistem bolumu."
umount "${DEV}"* 2>/dev/null
swapoff -a 2>/dev/null

wipefs -a "$DEV" >/dev/null 2>&1
parted -s "$DEV" mklabel gpt || hata "Disk bolumlenemedi." "Disk yazma korumali olabilir. Fiziksel yazma korumasi anahtarini kapatin veya baska bir disk secin."
parted -s "$DEV" mkpart ESP fat32 1MiB 513MiB || hata "Acilis (EFI) bolumu olusturulamadi." "Diskte kullanimda kalan bir bolum olabilir; bilgisayari yeniden baslatip tekrar deneyin."
parted -s "$DEV" set 1 esp on
parted -s "$DEV" mkpart tedbirge ext4 513MiB 100% || hata "Sistem bolumu olusturulamadi." "Diskin en az 8 GB bos alani oldugundan emin olun."
sync; sleep 2

mkfs.vfat -F32 -n TEDBIRGE_EFI "$P1" >/dev/null 2>&1 || hata "Acilis bolumu bicimlendirilemedi." "Diski cikarip yeniden takin ya da baska bir USB baglantisi deneyin."
mkfs.ext4 -F -L TEDBIRGE "$P2" >/dev/null 2>&1 || hata "Sistem bolumu bicimlendirilemedi." "Disk ariza vermis olabilir; baska bir disk secmeyi deneyin."

# --- 3) Sistemi diske yaz -------------------------------------------
adim 3 "Sistem dosyalari diske yaziliyor"
say "  Bu adim birkac dakika surer. Bilgisayari kapatmayin."
mkdir -p "$MNT"
mount "$P2" "$MNT" || hata "Sistem bolumu baglanamadi." "Bilgisayari yeniden baslatip kurulumu bastan calistirin."

export ERASE_DISKS=""
export BOOTLOADER=grub
export USE_EFI=1

if command -v setup-disk >/dev/null 2>&1; then
  if ! setup-disk -m sys "$MNT"; then
    umount -R "$MNT" 2>/dev/null
    hata "Sistem dosyalari kopyalanamadi." "Disk dolmus veya ariza vermis olabilir; kayit dosyasindaki son satirlari kontrol edin: $LOG"
  fi
else
  umount -R "$MNT" 2>/dev/null
  hata "Kurulum araci bulunamadi (setup-disk)." "ISO imaji eksik yazilmis olabilir; imaji Rufus/BalenaEtcher ile yeniden yazip tekrar deneyin."
fi

# --- 4) WebOS dosya sistemi ve kiosk yapilandirmasi -----------------
adim 4 "Tedbirge(R) OS arayuzu ve servisleri kopyalaniyor"
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
' || say "  (uyari: onyukleyici adimi kismen tamamlandi — bilgisayar acilmazsa BIOS'ta 'UEFI' acilisini secin)"

# Kurulum kaydi diske tasinir: hedef sistemde kalici hata izi olusur.
mkdir -p "$MNT/var/log/tedbirge"
cp "$LOG" "$MNT/var/log/tedbirge/kurulum.log" 2>/dev/null || true

sync
for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done
umount "$MNT/boot/efi" 2>/dev/null
umount -R "$MNT" 2>/dev/null

# --- 5) Bitis -------------------------------------------------------
say ""
adim 5 "Kurulum tamamlandi"
say "==============================================="
say "  Kurulum basariyla tamamlandi."
say ""
say "  Simdi yapmaniz gerekenler:"
say "   1) USB bellegi bilgisayardan cikarin."
say "   2) Bilgisayari yeniden baslatin."
say "   3) Tedbirge(R) OS masaustu otomatik acilir."
say ""
say "  Sorun yasarsaniz kurulum kaydina bakin:"
say "   /var/log/tedbirge/kurulum.log"
say "==============================================="
say ""
read -r -p "Simdi yeniden baslatmak icin Enter'a basin " _
reboot
