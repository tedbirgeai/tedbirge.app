#!/bin/bash
# Kurulum oturumu: once kurucu, kurucu kapaninca yardimci menu.
# Menu artik hizmetin kapanis adiminda degil, asil surecte calisir; boylece
# systemd zaman asimi menuyu ya da canli masaustunu yarida kesmez.
set -u

/usr/local/sbin/tedbirge-kur
KUR_SONUC=$?

# Basarili kurulum + yeniden baslatma yolunda menu acilmaz.
if [ -e /run/tedbirge-installer-complete ]; then
  exit 0
fi

/opt/tedbirge/kurulum-sonrasi.sh
exit "$KUR_SONUC"
