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

# --- 0) Acilis bicimi ve canli ortam diski ---------------------------
# UEFI mi klasik BIOS mu? Yanlis varsayim, onyukleyicinin sessizce
# kurulamamasina ve "kuruldu ama acilmiyor" durumuna yol acar.
if [ -d /sys/firmware/efi ]; then
  UEFI=1
  say "Acilis bicimi: UEFI"
else
  UEFI=0
  say "Acilis bicimi: klasik BIOS"
fi

# Sistemin uzerinden calistigi USB/ISO diski hedef listesinden cikarilir;
# aksi halde calisan kurulum ortami silinebilir.
CANLI_DISK=""
for kaynak in $(awk '$1 ~ /^\/dev\// {print $1}' /proc/mounts 2>/dev/null | sort -u); do
  ad=$(basename "$kaynak")
  kok=$(lsblk -nro PKNAME "/dev/$ad" 2>/dev/null | head -1)
  [ -n "$kok" ] || kok="$ad"
  case " $CANLI_DISK " in *" $kok "*) ;; *) CANLI_DISK="$CANLI_DISK $kok" ;; esac
done

# --- 1) Hedef disk secimi -------------------------------------------
adim 1 "Kurulum yapilacak disk secimi"
# Tum diskler listelenir (dahili SATA/NVMe/eMMC ve harici). Cikarilabilir
# olanlar isaretlenir; canli ortamin kendi diski hic listelenmez.
DISKS=$(lsblk -dnro NAME,SIZE,RM,TYPE,MODEL 2>/dev/null | awk -v canli=" $CANLI_DISK " '
  $4=="disk" {
    ad=$1
    if (index(canli, " " ad " ") > 0) next
    model=""
    for (i=5; i<=NF; i++) model = model (i>5 ? " " : "") $i
    printf "%s %s %s%s\n", ad, $2, ($3=="1" ? "(cikarilabilir) " : ""), model
  }')

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

# Disk boyutu: 8 GB altinda kurulum tamamlanamaz.
BOYUT_BLOK=$(cat "/sys/block/$TARGET/size" 2>/dev/null || echo 0)
BOYUT_GB=$(( BOYUT_BLOK / 2097152 ))
[ "$BOYUT_GB" -ge 8 ] 2>/dev/null || hata "Secilen disk cok kucuk (${BOYUT_GB} GB)." "En az 8 GB kapasiteli bir disk secin."

say ""
say "UYARI: /dev/$TARGET uzerindeki TUM VERILER SILINECEK."
printf "Devam etmek icin buyuk harflerle EVET yazin: "
read -r ONAY
[ "$ONAY" = "EVET" ] || hata "Onaylanmadi — hicbir diske dokunulmadi." "Devam etmek isterseniz onay sorusuna buyuk harflerle EVET yazin."

DEV="/dev/$TARGET"
case "$TARGET" in
  nvme*|mmcblk*) PSEP="p" ;;
  *)             PSEP=""  ;;
esac

# --- 2) Bolumleme ----------------------------------------------------
adim 2 "Disk bolumleniyor (acilis + sistem)"
say "  Bu adimda diskte acilis bolumu ve sistem bolumu olusturulur."
umount "${DEV}"* 2>/dev/null
swapoff -a 2>/dev/null

wipefs -a "$DEV" >/dev/null 2>&1
parted -s "$DEV" mklabel gpt || hata "Disk bolumlenemedi." "Disk yazma korumali olabilir. Fiziksel yazma korumasi anahtarini kapatin veya baska bir disk secin."

if [ "$UEFI" = "1" ]; then
  # 1: EFI sistem bolumu · 2: sistem
  parted -s "$DEV" mkpart ESP fat32 1MiB 513MiB || hata "Acilis (EFI) bolumu olusturulamadi." "Diskte kullanimda kalan bir bolum olabilir; bilgisayari yeniden baslatip tekrar deneyin."
  parted -s "$DEV" set 1 esp on
  parted -s "$DEV" mkpart tedbirge ext4 513MiB 100% || hata "Sistem bolumu olusturulamadi." "Diskin en az 8 GB bos alani oldugundan emin olun."
  P1="${DEV}${PSEP}1"; P2="${DEV}${PSEP}2"
else
  # Klasik BIOS + GPT: GRUB'un cekirdek parcasi icin ayri bir bolum sart.
  parted -s "$DEV" mkpart bios_grub 1MiB 3MiB || hata "BIOS acilis bolumu olusturulamadi." "Diski cikarip yeniden takin ya da baska bir disk secin."
  parted -s "$DEV" set 1 bios_grub on
  parted -s "$DEV" mkpart tedbirge ext4 3MiB 100% || hata "Sistem bolumu olusturulamadi." "Diskin en az 8 GB bos alani oldugundan emin olun."
  P1=""; P2="${DEV}${PSEP}2"
fi
sync; sleep 2

if [ -n "$P1" ]; then
  mkfs.vfat -F32 -n TEDBIRGE_EFI "$P1" >/dev/null 2>&1 || hata "Acilis bolumu bicimlendirilemedi." "Diski cikarip yeniden takin ya da baska bir USB baglantisi deneyin."
fi
mkfs.ext4 -F -L TEDBIRGE "$P2" >/dev/null 2>&1 || hata "Sistem bolumu bicimlendirilemedi." "Disk ariza vermis olabilir; baska bir disk secmeyi deneyin."

# --- 3) Sistemi diske yaz -------------------------------------------
adim 3 "Sistem dosyalari diske yaziliyor"
say "  Bu adim birkac dakika surer. Bilgisayari kapatmayin."
mkdir -p "$MNT"
mount "$P2" "$MNT" || hata "Sistem bolumu baglanamadi." "Bilgisayari yeniden baslatip kurulumu bastan calistirin."

# EFI bolumu kurulumdan ONCE baglanir: boylece hem onyukleyici dogru yere
# yazilir hem de olusturulan fstab'da kalici bir kaydi olur.
if [ -n "$P1" ]; then
  mkdir -p "$MNT/boot/efi"
  mount "$P1" "$MNT/boot/efi" || hata "Acilis bolumu baglanamadi." "Bilgisayari yeniden baslatip kurulumu bastan calistirin."
fi

export ERASE_DISKS=""
export BOOTLOADER=grub
if [ "$UEFI" = "1" ]; then
  export USE_EFI=1
else
  unset USE_EFI
fi

command -v setup-disk >/dev/null 2>&1 \
  || { umount -R "$MNT" 2>/dev/null; hata "Kurulum araci bulunamadi (setup-disk)." "ISO imaji eksik yazilmis olabilir; imaji Rufus/BalenaEtcher ile 'DD' kipinde yeniden yazip tekrar deneyin."; }

SETUP_LOG=/tmp/tedbirge-setup-disk.log
if setup-disk -m sys -b "$DEV" "$MNT" >"$SETUP_LOG" 2>&1; then
  cat "$SETUP_LOG" | tee -a "$LOG"
else
  SETUP_RC=$?
  cat "$SETUP_LOG" | tee -a "$LOG"
  kayit "setup-disk cikis kodu: $SETUP_RC"
  umount -R "$MNT" 2>/dev/null
  hata "Sistem dosyalari kopyalanamadi." "Disk dolmus veya ariza vermis olabilir; kayit dosyasindaki son satirlari kontrol edin: $LOG"
fi

# --- 4) WebOS dosya sistemi ve kiosk yapilandirmasi -----------------
adim 4 "Tedbirge(R) OS arayuzu ve servisleri kopyalaniyor"
mkdir -p "$MNT$SRC_WWW" "$MNT/opt/tedbirge" "$MNT/etc/nginx/http.d" "$MNT/etc/profile.d" "$MNT/root"
cp -a "$SRC_WWW/." "$MNT$SRC_WWW/" || hata "Arayuz dosyalari kopyalanamadi." "Diskte yer kalmamis olabilir; daha buyuk bir disk secin."
cp -a /opt/tedbirge/. "$MNT/opt/tedbirge/" 2>/dev/null
cp -a /etc/nginx/http.d/tedbirge.conf "$MNT/etc/nginx/http.d/" 2>/dev/null
cp -a /etc/profile.d/tedbirge-kiosk.sh "$MNT/etc/profile.d/" 2>/dev/null
cp -a /etc/inittab "$MNT/etc/inittab" 2>/dev/null
cp -a /root/.xinitrc "$MNT/root/.xinitrc" 2>/dev/null
cp -a /etc/init.d/tedbirge-sysbridge "$MNT/etc/init.d/" 2>/dev/null
cp -a /etc/local.d/. "$MNT/etc/local.d/" 2>/dev/null
cp -a /etc/tedbirge-release "$MNT/etc/tedbirge-release" 2>/dev/null

[ -s "$MNT$SRC_WWW/index.html" ] || hata "Arayuz dosyalari diske yazilamadi." "Imaji USB'ye 'DD' kipinde yeniden yazip kurulumu tekrarlayin."

for d in dev proc sys; do
  mkdir -p "$MNT/$d"
  mount --bind "/$d" "$MNT/$d" || {
    for u in dev proc sys; do umount "$MNT/$u" 2>/dev/null; done
    umount -R "$MNT" 2>/dev/null
    hata "Kurulum doğrulama alanı hazırlanamadı ($d)." "Bilgisayarı yeniden başlatıp kurulumu tekrar deneyin."
  }
done

# setup-disk önyükleyiciyi çalışma kipine göre kurmuştur. Burada ikinci kez
# grub-install çalıştırılmaz; yalnız WebOS servisleri etkinleştirilip üretilen
# önyükleyici ve yapılandırma dosyaları doğrulanır.
chroot "$MNT" /bin/sh -c "
  rc-update add nginx default
  rc-update add dbus default
  rc-update add acpid default
  rc-update add networkmanager default
  rc-update add local default
  rc-update add tedbirge-sysbridge default 2>/dev/null
  rc-update add tedbirge-ready default 2>/dev/null
" >>"$LOG" 2>&1 \
  || { sync; for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
       hata "WebOS servisleri etkinlestirilemedi." "Kurulumu tekrar deneyin. Ayrinti icin: $LOG"; }

# Onyukleyicinin gercekten olustugu dogrulanir; aksi halde basari bildirilmez.
if [ "$UEFI" = "1" ]; then
  [ -s "$MNT/boot/efi/EFI/BOOT/BOOTX64.EFI" ] || [ -s "$MNT/boot/efi/EFI/tedbirge/grubx64.efi" ] \
    || { for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
         hata "Acilis dosyasi olusmadi (EFI)." "BIOS/UEFI ayarlarindan 'Secure Boot' kapatip kurulumu tekrarlayin."; }
else
  [ -d "$MNT/boot/grub/i386-pc" ] \
    || { for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
         hata "Acilis dosyalari olusmadi (BIOS)." "Diski degistirip kurulumu tekrarlayin. Ayrinti: $LOG"; }
fi
[ -s "$MNT/boot/grub/grub.cfg" ] \
  || { for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
       hata "Acilis menusu olusturulamadi." "Kurulumu tekrarlayin; sorun surerse kaydi paylasin: $LOG"; }

# Kurulan sistemde cekirdek ve baslangic dosyasi var mi? Yoksa disk acilmaz.
ls "$MNT"/boot/vmlinuz-* >/dev/null 2>&1 \
  || { for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
       hata "Cekirdek diske yazilamadi." "Imaji USB'ye 'DD' kipinde yeniden yazip kurulumu tekrarlayin."; }
[ -x "$MNT/sbin/init" ] || [ -L "$MNT/sbin/init" ] \
  || { for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done; umount -R "$MNT" 2>/dev/null; \
       hata "Sistem baslangic dosyasi eksik." "Imaji USB'ye 'DD' kipinde yeniden yazip kurulumu tekrarlayin."; }

# Kurulum kaydi diske tasinir: hedef sistemde kalici hata izi olusur.
mkdir -p "$MNT/var/log/tedbirge"
cp "$LOG" "$MNT/var/log/tedbirge/kurulum.log" 2>/dev/null || true

sync
for d in dev proc sys; do umount "$MNT/$d" 2>/dev/null; done
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
