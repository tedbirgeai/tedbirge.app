#!/bin/sh
# Tedbirge(R) WebOS — acilis gozcusu (ekran ve girdi kilitlenme denetleyicisi).
#
# Amac: kurulum sonrasi ilk acilista kullanici asla siyah/yari beyaz ekranla ya
# da klavye-fare cevap vermeyen bir masaustuyle karsilasmasin.
#
#  1) Gercek masaustu saglik sinyali (/run/tedbirge-kiosk-healthy) beklenir.
#     Bu sinyal yalnizca sayfa gercekten yuklendiginde uretilir.
#  2) Sure asilirsa neden kayda yazilir, ekran surucusu yazilim cizimine
#     dusurulur (/run/tedbirge-yazilim-cizim) ve kiosk yeniden baslatilir.
#  3) Ucuncu denemeden sonra okunabilir kurtarma ekrani gosterilir.
#  4) Calisma sirasinda kiosk olurse servis yeniden baslatilir; ekran bos kalmaz.
set -u
LOG=/var/log/tedbirge/gozcu.log
mkdir -p /var/log/tedbirge
exec >>"$LOG" 2>&1
echo "--- gozcu baslangic $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"

BEKLEME="${TEDBIRGE_GOZCU_BEKLEME:-75}"
DENEME_SINIRI="${TEDBIRGE_GOZCU_DENEME:-3}"

girdi_denetle() {
  # En az bir klavye veya isaretleme aygiti gorunmeli.
  if [ -n "$(ls /dev/input/event* 2>/dev/null)" ]; then
    return 0
  fi
  echo "! Girdi aygiti gorulemedi; surucu modulleri yeniden yukleniyor."
  for m in evdev hid_generic usbhid i8042 atkbd psmouse xhci_pci ehci_pci; do
    modprobe "$m" 2>/dev/null || true
  done
  udevadm trigger --subsystem-match=input 2>/dev/null || true
  udevadm settle --timeout=15 2>/dev/null || true
  [ -n "$(ls /dev/input/event* 2>/dev/null)" ]
}

kiosk_yeniden() { # neden
  echo "! Kiosk yeniden baslatiliyor: $1"
  systemctl restart tedbirge-kiosk.service 2>/dev/null || true
}

tani_yaz() {
  curl -fsS -o /dev/null --max-time 3 http://127.0.0.1/ 2>/dev/null \
    || echo "  - web arayuzu (nginx) yanit vermiyor."
  [ -e /dev/dri/renderD128 ] || echo "  - donanim ekran surucusu yok."
  echo "  - ekran: $(cat /run/tedbirge-ekran 2>/dev/null || echo bilinmiyor)"
}

girdi_denetle || echo "! Girdi aygiti hala yok; klavye/fare baglantisini denetleyin."

# 1) Gercek masaustu saglik kapisi
SAYAC=0
DENEME=0
while [ ! -e /run/tedbirge-kiosk-healthy ]; do
  if [ -e /run/tedbirge-kurtarma ]; then
    echo "Kurtarma ekrani etkin; otomatik deneme durduruldu."
    break
  fi
  SAYAC=$((SAYAC + 3))
  sleep 3
  if [ "$SAYAC" -ge "$BEKLEME" ]; then
    DENEME=$((DENEME + 1))
    echo "! Masaustu ${BEKLEME}s icinde dogrulanamadi (deneme $DENEME/$DENEME_SINIRI)."
    tani_yaz
    if [ "$DENEME" -ge "$DENEME_SINIRI" ]; then
      echo "! Deneme siniri asildi; kurtarma ekranina geciliyor."
      /opt/tedbirge/kurtarma-sayfasi.sh 2>/dev/null || true
      : > /run/tedbirge-kurtarma
      kiosk_yeniden "kurtarma ekrani"
      break
    fi
    : > /run/tedbirge-yazilim-cizim
    kiosk_yeniden "saglik sinyali gelmedi — guvenli yazilim cizimine gecildi"
    SAYAC=0
    BEKLEME=$((BEKLEME + 45))
  fi
done
if [ -e /run/tedbirge-kiosk-healthy ]; then
  echo "Masaustu saglikli: $(date -u +%Y-%m-%dT%H:%M:%SZ) kip=$(cat /run/tedbirge-goruntu-kipi 2>/dev/null || echo ?)"
fi

# 2) Surekli gozetim: kiosk dususe gecerse ekran bos kalmadan geri getirilir.
while :; do
  sleep 20
  systemctl is-active --quiet tedbirge-kiosk.service || kiosk_yeniden "servis durmus"
  girdi_denetle >/dev/null 2>&1 || girdi_denetle
done
