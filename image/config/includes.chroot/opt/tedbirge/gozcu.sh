#!/bin/sh
# Tedbirge(R) WebOS — acilis gozcusu (ekran ve girdi kilitlenme denetleyicisi).
#
# Amac: kurulum sonrasi ilk acilista kullanici asla siyah/donmus ekranla ya da
# klavye-fare cevap vermeyen bir masaustuyle karsilasmasin.
#
#  1) Kiosk hazir sinyali (/run/tedbirge-kiosk-ready) beklenir.
#  2) Sure asilirsa neden kayda yazilir, ekran surucusu yazilim cizimine
#     dusurulur (/run/tedbirge-yazilim-cizim) ve kiosk yeniden baslatilir.
#  3) Girdi aygiti (klavye/fare) gorunmuyorsa surucu modulleri yeniden yuklenir.
#  4) Calisma sirasinda kiosk olurse servis yeniden baslatilir; ekran bos kalmaz.
set -u
LOG=/var/log/tedbirge/gozcu.log
mkdir -p /var/log/tedbirge
exec >>"$LOG" 2>&1
echo "--- gozcu baslangic $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"

BEKLEME="${TEDBIRGE_GOZCU_BEKLEME:-75}"

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

girdi_denetle || echo "! Girdi aygiti hala yok; klavye/fare baglantisini denetleyin."

# 1) Ilk acilis hazir sinyali
SAYAC=0
while [ ! -e /run/tedbirge-kiosk-ready ]; do
  SAYAC=$((SAYAC + 3))
  sleep 3
  if [ "$SAYAC" -ge "$BEKLEME" ]; then
    echo "! Masaustu ${BEKLEME}s icinde acilmadi."
    curl -fsS -o /dev/null http://127.0.0.1/ 2>/dev/null \
      || echo "  - web arayuzu (nginx) yanit vermiyor."
    [ -e /dev/dri/renderD128 ] || echo "  - donanim ekran surucusu yok."
    : > /run/tedbirge-yazilim-cizim
    kiosk_yeniden "hazir sinyali gelmedi — guvenli yazilim cizimine gecildi"
    SAYAC=0
    BEKLEME=$((BEKLEME + 60))
    [ "$BEKLEME" -le 300 ] || break
  fi
done
echo "Masaustu hazir: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 2) Surekli gozetim: kiosk dususe gecerse ekran bos kalmadan geri getirilir.
while :; do
  sleep 20
  systemctl is-active --quiet tedbirge-kiosk.service || kiosk_yeniden "servis durmus"
  girdi_denetle >/dev/null 2>&1 || girdi_denetle
done
