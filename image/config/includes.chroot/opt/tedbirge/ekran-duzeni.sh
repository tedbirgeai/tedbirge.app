#!/bin/sh
# Tedbirge(R) WebOS — ekran yerlesimi.
#
# Amac: kurulum sonrasi ilk acilista ekranin yarisi beyaz/bos kalmasin.
# Kok neden: 'xrandr --auto' hayalet (fiziksel kablosu olmayan ama firmware
# tarafindan bildirilen) cikislari da acar; sanal masaustu gercek ekranin iki
# kati olur ve kiosk penceresi yalnizca sol yariya cizilir.
#
# Cozum: YALNIZ bir ana fiziksel cikis acilir, digerleri kapatilir ve ekran
# alani tam o cozunurluge sabitlenir. Arka plan siyah yapilir; boylece cizim
# gecikirse dahi beyaz alan gorunmez.
set -u
LOG=/var/log/tedbirge/ekran.log
mkdir -p /var/log/tedbirge
exec >>"$LOG" 2>&1
echo "--- ekran duzeni $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"

xsetroot -solid '#0b1220' 2>/dev/null || true

command -v xrandr >/dev/null 2>&1 || { echo "xrandr yok; tek ekran varsayiliyor."; exit 0; }

SORGU=$(xrandr --query 2>/dev/null || true)
[ -n "$SORGU" ] || { echo "xrandr sorgusu bos."; exit 0; }

# Bagli cikislar: 'connected' olup en az bir kip bildiren cikislar gercek kabul
# edilir. Kipsiz bildirilen cikislar hayalet sayilir ve kapatilir.
BAGLI=$(printf '%s\n' "$SORGU" | awk '/ connected/{print $1}')
echo "bildirilen bagli cikislar: $(echo "$BAGLI" | tr '\n' ' ')"

# Secim onceligi: 1) EDID bildiren cikis (gercek monitor), 2) sanal/QEMU
# cikisi, 3) ilk kipli cikis. EDID'siz ama kip bildiren cikis hayalettir.
PROP=$(xrandr --prop 2>/dev/null || true)
edid_var() {
  printf '%s\n' "$PROP" | awk -v o="$1" '
    $1==o && / connected/ {bul=1; next}
    bul && /^[A-Za-z]/ {exit}
    bul && /EDID:/ {e=1}
    END {exit e?0:1}'
}
kip_of() {
  printf '%s\n' "$SORGU" | awk -v o="$1" '
    $1==o {bul=1; next}
    bul && /^[A-Za-z]/ {exit}
    bul && /^[[:space:]]+[0-9]+x[0-9]+/ {print $1; exit}'
}
ANA=""
ANA_KIP=""
for out in $BAGLI; do
  k=$(kip_of "$out")
  if [ -n "$k" ] && edid_var "$out"; then ANA="$out"; ANA_KIP="$k"; break; fi
done
if [ -z "$ANA" ]; then
  for out in $BAGLI; do
    case "$out" in Virtual*|VGA-*|qxl*|virtio*) : ;; *) continue ;; esac
    k=$(kip_of "$out")
    if [ -n "$k" ]; then ANA="$out"; ANA_KIP="$k"; break; fi
  done
fi
for out in $BAGLI; do
  [ -n "$ANA" ] && break
  KIP=$(printf '%s\n' "$SORGU" | awk -v o="$out" '
    $1==o {bul=1; next}
    bul && /^[A-Za-z]/ {exit}
    bul && /^[[:space:]]+[0-9]+x[0-9]+/ {print $1; exit}')
  if [ -n "$KIP" ] && [ -z "$ANA" ]; then
    ANA="$out"; ANA_KIP="$KIP"
  fi
done

if [ -z "$ANA" ]; then
  echo "! Kipli bir cikis bulunamadi; varsayilan yerlesim korunuyor."
  xrandr --auto 2>/dev/null || true
  exit 0
fi

echo "ana ekran: $ANA ($ANA_KIP)"

# Once ana ekran acilir, SONRA digerleri kapatilir: ekransiz ara an olusmaz.
KIP_OK=1
if ! xrandr --output "$ANA" --mode "$ANA_KIP" --primary --pos 0x0 --rotate normal 2>/dev/null; then
  echo "! Destekli kip uygulanamadi; --auto ile denenecek."
  KIP_OK=0
  xrandr --output "$ANA" --auto --primary 2>/dev/null || true
fi

for out in $(printf '%s\n' "$SORGU" | awk '/ (connected|disconnected)/{print $1}'); do
  [ "$out" = "$ANA" ] && continue
  xrandr --output "$out" --off 2>/dev/null || true
done

# Ekran alanini ana ekran cozunurlugune sabitle (yalniz kip uygulandiysa).
[ "$KIP_OK" = 1 ] && xrandr --fb "$ANA_KIP" 2>/dev/null || true

echo "$ANA $ANA_KIP" > /run/tedbirge-ekran 2>/dev/null || true
xrandr --query 2>/dev/null | grep -E ' connected|\*' || true
exit 0
