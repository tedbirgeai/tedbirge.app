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

ANA=""
ANA_KIP=""
for out in $BAGLI; do
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

# Once tum cikislari kapat, sonra yalnizca ana ekrani destekli kipte ac.
for out in $(printf '%s\n' "$SORGU" | awk '/ (connected|disconnected)/{print $1}'); do
  [ "$out" = "$ANA" ] && continue
  xrandr --output "$out" --off 2>/dev/null || true
done

if ! xrandr --output "$ANA" --mode "$ANA_KIP" --primary --pos 0x0 --rotate normal 2>/dev/null; then
  echo "! Destekli kip uygulanamadi; --auto ile denenecek."
  xrandr --output "$ANA" --auto --primary 2>/dev/null || true
fi

# Ekran alanini tam ana ekran cozunurlugune sabitle: sanal masaustu buyumus
# kalirsa pencere yalnizca bir kosede cizilir.
xrandr --fb "$ANA_KIP" 2>/dev/null || true

echo "$ANA $ANA_KIP" > /run/tedbirge-ekran 2>/dev/null || true
xrandr --query 2>/dev/null | grep -E ' connected|\*' || true
exit 0
