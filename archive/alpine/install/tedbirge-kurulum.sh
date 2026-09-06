#!/bin/sh
# Tedbirge(R) WebOS — kurulum sarmalayicisi.
# Asil is /opt/tedbirge/setup-tedbirge-disk.sh betiginde yapilir;
# bu dosya yalnizca onu bulur ve calistirir (acilis menusu tetikler).
set -u

BETIK=/opt/tedbirge/setup-tedbirge-disk.sh

clear 2>/dev/null || true
echo "==============================================="
echo "   TEDBIRGE(R) OS — Kurulum Yardimcisi"
echo "==============================================="
echo ""
echo "Kurulum sihirbazi baslatiliyor..."
echo "Iptal etmek isterseniz sorulara bos cevap verin."
echo ""

if [ ! -x "$BETIK" ]; then
  echo "! Kurulum betigi bulunamadi: $BETIK"
  echo "  Cozum: ISO imaji eksik yazilmis olabilir. Imaji USB bellege"
  echo "         yeniden yazip bilgisayari tekrar baslatin."
  read -r -p "Canli moda donmek icin Enter'a basin " _
  exec startx -- -nocursor
fi

"$BETIK"
RC=$?

# Kurulum iptal edildiyse ya da tamamlanmadiysa canli moda don.
if [ "$RC" != "0" ]; then
  echo ""
  echo "Kurulum tamamlanmadi. Canli (USB) moda donuluyor —"
  echo "sistemi diske kurmadan da kullanmaya devam edebilirsiniz."
  echo "Yeniden denemek icin konsola 'tedbirge-kur' yazin."
  sleep 3
  exec startx -- -nocursor
fi
