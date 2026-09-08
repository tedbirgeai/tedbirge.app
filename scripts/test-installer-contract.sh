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
if grep -q 'mklabel msdos' "$KUR"; then
  echo "HATA: eski MBR bölümleme yolu geri gelmiş" >&2
  exit 1
fi

# Boş konsol ve Xsession kaçış yolu geri gelmesin.
zorunlu 'Kurulumu yeniden baslat' "$SONRASI" "Yeniden deneme menüsü yok"
zorunlu 'canli masaustune don' "$SONRASI" "Canlı masaüstü menüsü yok"
zorunlu 'TEDBIRGE_DESKTOP_READY' "$KIOSK" "Masaüstü hazır sinyali yok"
if grep -qE 'exec /bin/login|(^|[[:space:]])startx([[:space:]]|$)' "$SONRASI"; then
  echo "HATA: kullanıcı hâlâ komut satırı/Xsession yoluna bırakılıyor" >&2
  exit 1
fi

echo "Kurulum güvenlik ve kullanıcı deneyimi sözleşmesi doğrulandı."