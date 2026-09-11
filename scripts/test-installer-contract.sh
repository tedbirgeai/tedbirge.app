#!/usr/bin/env bash
# Kurulum arayüzünün ve disk güvenlik sözleşmesinin hızlı, yıkıcı olmayan testi.
set -euo pipefail
cd "$(dirname "$0")/.."

KUR=image/install/tedbirge-kur
SONRASI=image/config/includes.chroot/opt/tedbirge/kurulum-sonrasi.sh
KIOSK=image/config/includes.chroot/opt/tedbirge/kiosk.sh

bash -n "$KUR"
bash -n "$SONRASI"
bash -n "$KIOSK"

zorunlu() {
  local desen="$1" dosya="$2" aciklama="$3"
  grep -qE "$desen" "$dosya" || { echo "HATA: $aciklama" >&2; exit 1; }
}

# Kullanıcıya gösterilen altı aşama ve bütün uzun bekleme açıklamaları.
for adim in 1 2 3 4 5 6; do
  zorunlu "Adim $adim/6" "$KUR" "Kurulum sihirbazında $adim. adım yok"
done
zorunlu 'Kurulum devam ediyor, bilgisayari kapatmayin' "$KUR" "Devam bilgisi yok"
zorunlu '4>&1 1>/dev/tty 2>&4 </dev/tty' "$KUR" "Menü gerçek konsola çizilmiyor"

# Disk güvenliği: iki açılış kipi de GPT, canlı aygıt ve kimlik korunuyor.
zorunlu 'mklabel gpt' "$KUR" "GPT bölüm tablosu yok"
zorunlu 'mkpart bios_grub' "$KUR" "BIOS GPT açılış bölümü yok"
zorunlu 'mkpart ESP' "$KUR" "UEFI açılış bölümü yok"
zorunlu 'blockdev --getro' "$KUR" "Yazma koruması denetlenmiyor"
zorunlu 'MAJ:MIN' "$KUR" "Disk kimliği yeniden doğrulanmıyor"
zorunlu 'sgdisk --zap-all' "$KUR" "Eski GPT izi temizlenmiyor"
zorunlu 'DSK-101' "$KUR" "Yazma koruması hata kodu yok"
zorunlu 'DSK-103' "$KUR" "Bağlı bölüm hata kodu yok"
zorunlu 'DSK-110' "$KUR" "Bölüm tablosu hata kodu yok"
zorunlu 'DSK-120' "$KUR" "Bölüm görünürlüğü hata kodu yok"
zorunlu 'udevadm settle --timeout=30' "$KUR" "Bölüm aygıtı bekleme süresi yetersiz"
if grep -q 'mklabel msdos' "$KUR"; then
  echo "HATA: eski MBR bölümleme yolu geri gelmiş" >&2
  exit 1
fi

# Sistem kopyalama: yalnızca her sürümde bulunan seçenekler kullanılmalı.
if grep -q 'unsquashfs .*-percentage' "$KUR"; then
  echo "HATA: unsquashfs -percentage geri gelmiş (araç yardım ekranına düşer)" >&2
  exit 1
fi
zorunlu 'unsquashfs -s' "$KUR" "Kopyalama öncesi imaj bütünlüğü doğrulanmıyor"
zorunlu 'unsquashfs -f -i -d' "$KUR" "Kopyalama taşınabilir seçeneklerle çalıştırılmıyor"
zorunlu 'KUR-201' "$KUR" "Bozuk kaynak imaj hata kodu yok"
zorunlu 'KUR-202' "$KUR" "Gerçek disk yazma hatası kodu yok"
zorunlu 'KUR-203' "$KUR" "Yetersiz disk alanı hata kodu yok"
zorunlu 'KUR-204' "$KUR" "Disk bağlantı kaybı hata kodu yok"
zorunlu 'dosya acildi' "$KUR" "Kopyalama sırasında gerçek ilerleme gösterilmiyor"
zorunlu 'dk .* sn' "$KUR" "Kopyalama sırasında geçen süre gösterilmiyor"

# Kurulum ekranları fare ile de kullanılabilmeli (konsol fare hizmeti).
grep -qx 'gpm' image/profiles/common.list || {
  echo "HATA: konsol fare desteği (gpm) paket listesinde yok" >&2; exit 1; }

# Boş konsol ve Xsession kaçış yolu geri gelmesin.
zorunlu 'Kurulumu yeniden baslat' "$SONRASI" "Yeniden deneme menüsü yok"
zorunlu 'canli masaustune don' "$SONRASI" "Canlı masaüstü menüsü yok"
zorunlu 'TEDBIRGE_DESKTOP_READY' "$KIOSK" "Masaüstü hazır sinyali yok"
zorunlu 'tedbirge-installer-complete' "$KUR" "Başarılı yeniden başlatma işareti yok"

# Açılabilirlik sözleşmesi: "%100 kuruldu" ancak bu kapılar geçilirse söylenir.
for kod in ACL-301 ACL-302 ACL-303 ACL-304 ACL-305 ACL-306 ACL-307 ACL-309; do
  zorunlu "$kod" "$KUR" "Açılabilirlik denetimi $kod eksik"
done
zorunlu 'grub-script-check' "$KUR" "Açılış menüsü sözdizimi doğrulanmıyor"
zorunlu 'lsinitramfs' "$KUR" "Açılış diski sürücü içeriği denetlenmiyor"
zorunlu '11_tedbirge_kurtarma' "$KUR" "Kurtarma açılış seçenekleri üretilmiyor"
zorunlu 'Guvenli goruntu \(nomodeset\)' "$KUR" "Güvenli görüntü seçeneği yok"
zorunlu 'Metin / kurtarma kipi' "$KUR" "Metin/kurtarma seçeneği yok"
if grep -qE '^\s*cancel-in-progress: true' .github/workflows/build-iso.yml; then
  echo "HATA: ISO iş akışı yarım kalan doğrulamayı iptal ediyor" >&2; exit 1
fi
if grep -qE 'exec /bin/login|(^|[[:space:]])startx([[:space:]]|$)' "$SONRASI"; then
  echo "HATA: kullanıcı hâlâ komut satırı/Xsession yoluna bırakılıyor" >&2
  exit 1
fi

# Kurumsal açılış/kapanış ekranı ve init güvencesi.
zorunlu 'ACL-313' "$KUR" "Kurulu sistemde /sbin/init denetimi yok"
zorunlu 'quiet splash' "$KUR" "Kurulu sistem kurumsal açılış ekranıyla açılmıyor"
zorunlu 'nosplash' "$KUR" "Kurtarma girdilerinde ayrıntılı günlük kapalı"
grep -qx 'plymouth' image/profiles/common.list || {
  echo "HATA: açılış ekranı (plymouth) paket listesinde yok" >&2; exit 1; }
for f in image/config/includes.chroot/usr/share/plymouth/themes/tedbirge/tedbirge.plymouth \
         image/config/includes.chroot/usr/share/plymouth/themes/tedbirge/tedbirge.script \
         image/config/includes.chroot/etc/modprobe.d/tedbirge-firmware.conf; do
  [ -s "$f" ] || { echo "HATA: eksik dosya $f" >&2; exit 1; }
done
grep -q "Hoş Geldiniz" image/config/includes.chroot/usr/share/plymouth/themes/tedbirge/tedbirge.script || {
  echo "HATA: açılış ekranında karşılama metni yok" >&2; exit 1; }
grep -q "Kapanıyor" image/config/includes.chroot/usr/share/plymouth/themes/tedbirge/tedbirge.script || {
  echo "HATA: kapanış ekranı metni yok" >&2; exit 1; }
grep -q 'plymouth-set-default-theme tedbirge' image/config/hooks/normal/9000-tedbirge.hook.chroot || {
  echo "HATA: Tedbirge açılış teması varsayılan yapılmıyor" >&2; exit 1; }


echo "Kurulum güvenlik ve kullanıcı deneyimi sözleşmesi doğrulandı."