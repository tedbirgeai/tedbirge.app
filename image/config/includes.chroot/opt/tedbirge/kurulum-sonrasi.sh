#!/bin/sh
# Kurulum ekrani kapandiktan sonra calisir. Amaci tek sey: kullanici asla
# bos ekran + yanip sonen imlecle bas basa kalmasin.
set -u
exec >/dev/tty1 2>&1
clear 2>/dev/null || true
cat <<'MSJ'
===============================================
   Tedbirge(R) WebOS — Kurulum ekrani kapandi
===============================================

Ne yapabilirsiniz:

  * Kurulumu yeniden baslatmak icin :  tedbirge-kur
  * Kurulumu duz metin kipinde denemek icin :  tedbirge-kur --metin
  * Masaustunu (canli kip) acmak icin :  systemctl start tedbirge-kiosk

Kurulum kaydi: /var/log/tedbirge/kurulum.log

MSJ
exec /bin/login -f root
