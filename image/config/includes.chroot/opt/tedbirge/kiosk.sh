#!/bin/sh
# Kiosk görüntüleyici: Chromium; GPU sürücüsü yoksa yazılım çizimine düşer.
# Tüm çıktı üretim hata izine yazılır: /var/log/tedbirge/kiosk.log
URL="http://127.0.0.1/"
mkdir -p /var/log/tedbirge
exec >>/var/log/tedbirge/kiosk.log 2>&1
echo "--- kiosk baslangic $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"

for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS -o /dev/null "$URL" && break
  sleep 1
done

xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true
/opt/tedbirge/ekran-duzeni.sh 2>/dev/null || true

GPU_FLAGS="--use-gl=egl --enable-features=VaapiVideoDecoder --ignore-gpu-blocklist"
if [ ! -e /dev/dri/renderD128 ]; then
  echo "GPU surucusu bulunamadi — yazilim cizimine dusuluyor."
  GPU_FLAGS="--disable-gpu"
  LIBGL_ALWAYS_SOFTWARE=1
  export LIBGL_ALWAYS_SOFTWARE
fi

BROWSER=$(command -v chromium || command -v chromium-browser || true)
if [ -z "$BROWSER" ]; then
  echo "Goruntuleyici bulunamadi. Tedbirge(R) WebOS aga acik: $URL"
  exec /bin/sh
fi

# Tarayiciyi once baslat, gercekten ayakta kaldigini dogruladiktan sonra hazir
# isaretini uret. Yalniz HTTP sunucusunun calismasi masaustunun acildigi
# anlamina gelmez.
# shellcheck disable=SC2086
"$BROWSER" \
  --kiosk --app="$URL" --start-fullscreen \
  --user-data-dir=/var/lib/tedbirge/chromium \
  --noerrdialogs --disable-infobars --disable-translate \
  --no-first-run --disable-pinch --overscroll-history-navigation=0 \
  --password-store=basic --test-type --no-sandbox $GPU_FLAGS &
BROWSER_PID=$!
sleep 2
if ! kill -0 "$BROWSER_PID" 2>/dev/null; then
  echo "Goruntuleyici baslatilamadi."
  exit 1
fi
touch /run/tedbirge-kiosk-ready
printf '%s\n' TEDBIRGE_DESKTOP_READY > /dev/ttyS0 2>/dev/null || true
wait "$BROWSER_PID"
