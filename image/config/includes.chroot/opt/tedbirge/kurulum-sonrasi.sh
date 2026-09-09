#!/bin/bash
# Kurucu hangi nedenle kapanirsa kapansin kullanici bos konsola veya komut
# satirina birakilmaz. Bu betik /opt/tedbirge/oturum.sh icinden, kurulum
# hizmetinin ASIL sureci olarak calisir (kapanis adimi degil), boylece
# systemd zaman asimi menuyu veya canli masaustunu yarida kesmez.
# Cikis 10 = "kurulumu yeniden baslat".
set -u
exec </dev/tty1 >/dev/tty1 2>&1

# Basarili yeniden baslatma sirasinda hizmet durdurulurken menu acma.
if [ -e /run/tedbirge-installer-complete ]; then
  exit 0
fi


masaustu() {
  local eksik=""
  command -v xinit >/dev/null 2>&1 || eksik="xinit"
  [ -x /opt/tedbirge/kiosk.sh ] || eksik="kiosk baslaticisi"
  [ -s /var/www/tedbirge/index.html ] || eksik="WebOS arayuzu"
  command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1 || eksik="goruntuleyici"
  if [ -n "$eksik" ]; then
    whiptail --backtitle "Tedbirge(R) WebOS" --title "Masaustu acilamadi" \
      --msgbox "$eksik bulunamadi. Kurulum USB'sini yeniden olusturup tekrar deneyin.\n\nKayit: /var/log/tedbirge/kiosk.log" 14 72
    return 1
  fi
  clear
  printf 'Tedbirge(R) WebOS masaustu hazirlaniyor...\n'
  printf 'Bu islem birkac saniye surebilir. Lutfen bekleyin.\n'
  /usr/bin/xinit /opt/tedbirge/kiosk.sh -- :0 vt1 -keeptty
}

while :; do
  SECIM=$(whiptail --backtitle "Tedbirge(R) WebOS" \
    --title "Kurulum yardimcisi" \
    --menu "Kurulum ekrani kapandi. Ne yapmak istersiniz?\n\nAyrintili kayit: /var/log/tedbirge/kurulum.log" \
    18 74 4 \
    yeniden "Kurulumu yeniden baslat" \
    masaustu "USB uzerinden canli masaustune don" \
    kayit "Kurulum kaydinin son satirlarini goster" \
    kapat "Bilgisayari guvenle kapat" \
    3>&1 1>&2 2>&3) || SECIM="yeniden"
  case "$SECIM" in
    yeniden) exit 0 ;;
    masaustu) masaustu || true ;;
    kayit)
      whiptail --backtitle "Tedbirge(R) WebOS" --title "Kurulum kaydi" \
        --scrolltext --msgbox "$(tail -n 40 /var/log/tedbirge/kurulum.log 2>/dev/null || echo 'Kayit bulunamadi.')" 22 78 ;;
    kapat)
      whiptail --backtitle "Tedbirge(R) WebOS" --title "Bilgisayar kapatiliyor" \
        --infobox "Bilgisayar guvenle kapatiliyor. Ekran karardiginda USB bellegi cikarabilirsiniz." 9 70
      systemctl poweroff -i --no-block 2>/dev/null || poweroff -f
      exit 0 ;;
  esac
done
