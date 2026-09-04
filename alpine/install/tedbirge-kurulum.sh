#!/bin/sh
# Tedbirge(R) WebOS — kurulum sarmalayicisi.
# Asil is /opt/tedbirge/setup-tedbirge-disk.sh betiginde yapilir;
# bu dosya yalnizca onu bulur ve calistirir (acilis menusu tetikler).
set -u

BETIK=/opt/tedbirge/setup-tedbirge-disk.sh

if [ ! -x "$BETIK" ]; then
  echo "! Kurulum betigi bulunamadi: $BETIK"
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exec startx -- -nocursor
fi

"$BETIK"
RC=$?

# Kurulum iptal edildiyse ya da tamamlanmadiysa canli moda don.
[ "$RC" = "0" ] || exec startx -- -nocursor
