#!/bin/sh
# Acilis butunluk denetimi. Yalnizca hersey hazirsa seri porta benzersiz
# TEDBIRGE_BOOT_READY satirini yazar; CI acilis testinin tek olcutu budur.
set -u
mkdir -p /var/log/tedbirge
exec >>/var/log/tedbirge/sistem.log 2>&1
echo "--- acilis denetimi $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"
echo "cekirdek: $(uname -a)"

[ -x /sbin/init ] || [ -x /usr/lib/systemd/systemd ] || exit 1
[ -s /var/www/tedbirge/index.html ] || exit 1
[ -s /var/www/tedbirge/kernel/tedbirge_kernel.wasm ] || exit 1
[ -x /usr/local/sbin/tedbirge-kur ] || exit 1
[ -x /opt/tedbirge/kiosk.sh ] || exit 1

i=0
while [ "$i" -lt 60 ]; do
  curl -fsS -o /dev/null http://127.0.0.1/ && break
  i=$((i + 1))
  sleep 1
done
[ "$i" -lt 60 ] || exit 1

# Normal canli/kurulu acilista yalniz web sunucusunu degil, gercek X + Chromium
# masaustunu da bekle. Kurulum kipinde kiosk bilerek kapali oldugundan bu kosul
# uygulanmaz.
if ! grep -qE 'tedbirge\.(auto)?install=1' /proc/cmdline 2>/dev/null; then
  i=0
  while [ "$i" -lt 60 ] && [ ! -e /run/tedbirge-kiosk-ready ]; do
    i=$((i + 1)); sleep 1
  done
  [ -e /run/tedbirge-kiosk-ready ] || exit 1
fi

printf '%s\n' TEDBIRGE_BOOT_READY > /dev/console 2>/dev/null || true
printf '%s\n' TEDBIRGE_BOOT_READY > /dev/ttyS0 2>/dev/null || true
touch /run/tedbirge-ready
exit 0
