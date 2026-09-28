#!/bin/sh
# Tedbirge(R) WebOS kiosk goruntuleyicisi.
#
# Sozlesme: "hazir" sinyali yalnizca masaustu GERCEKTEN cizildiginde uretilir.
# Tarayicinin sureci ayakta olsa bile sayfa yuklenmediyse hazir denmez; boylece
# kullanici bos/yari beyaz ekranda birakilmaz.
#
# Kademeler:
#   1) donanim cizimi (varsa)
#   2) Mesa llvmpipe yazilim cizimi; llvmpipe yoksa 2b) SwiftShader
#   3) kurtarma sayfasi (okunabilir tani ekrani)
# Saglik sinyali: sayfa ilk kareleri cizdikten sonra basliga "TB_READY"
# ekler (src/lib/kiosk-ready.ts). Yalniz liste kaydi saglik sayilmaz.
URL="http://127.0.0.1/?kiosk=1"
KURTARMA_URL="http://127.0.0.1/kurtarma.html"
PROFIL=/var/lib/tedbirge/chromium
DBG_PORT=9222
mkdir -p /var/log/tedbirge "$PROFIL"
exec >>/var/log/tedbirge/kiosk.log 2>&1
echo "--- kiosk baslangic $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  curl -fsS -o /dev/null "$URL" && break
  sleep 1
done

xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true
/opt/tedbirge/ekran-duzeni.sh 2>/dev/null || true

BROWSER=$(command -v chromium || command -v chromium-browser || true)
if [ -z "$BROWSER" ]; then
  echo "Goruntuleyici bulunamadi. Tedbirge(R) WebOS aga acik: $URL"
  exec /bin/sh
fi

ORTAK="--kiosk --start-fullscreen --noerrdialogs --disable-infobars
  --disable-translate --no-first-run --disable-pinch
  --overscroll-history-navigation=0 --password-store=basic --test-type
  --no-sandbox --disable-session-crashed-bubble --disable-features=TranslateUI
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=$DBG_PORT
  --remote-allow-origins=http://127.0.0.1:$DBG_PORT"

# Eski/uyumsuz Intel-AMD-Nvidia donaniminda beyaz ekrana yol acan hizlandirma
# yollari kapatilir; guvenli EGL kipi denenir.
DONANIM="--use-gl=egl --disable-gpu-sandbox --ignore-gpu-blocklist
  --enable-features=VaapiVideoDecoder --disable-gpu-driver-bug-workarounds"
# Kademe 2: EGL acik kalir, Mesa'ya yazilim (llvmpipe) cizimi zorlanir.
# --disable-gpu burada KULLANILMAZ: o bayrak Chromium'u SwiftShader'a
# yonlendirir ve LIBGL_ALWAYS_SOFTWARE etkisiz kalir.
LLVMPIPE="--use-gl=egl --disable-gpu-sandbox --ignore-gpu-blocklist"
# Kademe 2b/3: Chromium'un kendi yazilim cizicisi (SwiftShader).
YAZILIM="--disable-gpu --disable-gpu-compositing
  --disable-accelerated-2d-canvas"

llvmpipe_var() {
  for d in /usr/lib/*/dri /usr/lib/dri /usr/lib64/dri; do
    [ -e "$d/swrast_dri.so" ] || [ -e "$d/kms_swrast_dri.so" ] && return 0
  done
  return 1
}

# Masaustu gercekten cizildi mi? Tarayicinin hata ayiklama arayuzunden
# yuklenen sayfa dogrulanir (surec kontrolu tek basina yeterli degildir).
sayfa_sagligi() { # bekleme-saniye
  bekle="$1"; i=0
  while [ "$i" -lt "$bekle" ]; do
    # Tarayici oldu ise beklemeden sonraki kademeye gec.
    if ! kill -0 "$PID" 2>/dev/null; then
      echo "! goruntuleyici sureci sonlandi"
      return 1
    fi
    LISTE=$(curl -fsS --max-time 3 "http://127.0.0.1:$DBG_PORT/json/list" 2>/dev/null || true)
    case "$LISTE" in
      *'"type": "page"'*|*'"type":"page"'*)
        case "$LISTE" in
          *"127.0.0.1"*|*"localhost"*)
            case "$LISTE" in
              *chrome-error*|*'"url": "about:blank"'*) : ;;
              *TB_READY*) return 0 ;;
            esac ;;
        esac ;;
    esac
    i=$((i + 2)); sleep 2
  done
  return 1
}

hazir_isaretle() { # kip
  echo "Masaustu cizildi — goruntu kipi: $1"
  printf '%s\n' "$1" > /run/tedbirge-goruntu-kipi 2>/dev/null || true
  mkdir -p /var/log/tedbirge
  printf '%s goruntu-kipi=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" \
    >> /var/log/tedbirge/acilis-sagligi.log 2>/dev/null || true
  touch /run/tedbirge-kiosk-ready
  touch /run/tedbirge-kiosk-healthy
  for t in /dev/console /dev/ttyS0; do
    printf '%s\n' TEDBIRGE_DESKTOP_READY > "$t" 2>/dev/null || true
    printf '%s\n' TEDBIRGE_DESKTOP_HEALTHY > "$t" 2>/dev/null || true
    printf 'TEDBIRGE_GORUNTU_KIPI=%s\n' "$1" > "$t" 2>/dev/null || true
  done
}

baslat() { # kip, bayraklar, adres
  echo "goruntuleyici baslatiliyor — kip: $1"
  # shellcheck disable=SC2086
  "$BROWSER" --app="$3" --user-data-dir="$PROFIL" $ORTAK $2 &
  PID=$!
  sleep 2
  kill -0 "$PID" 2>/dev/null
}

temiz_profil() {
  echo "Profil sifirlaniyor (bozuk oturum/GPU onbellegi temizlenir)."
  rm -rf "$PROFIL"; mkdir -p "$PROFIL"
  rm -rf "$HOME/.cache/chromium" 2>/dev/null || true
}

# --- Kademe 1: donanim cizimi
KIP=""
if [ ! -e /run/tedbirge-yazilim-cizim ] && [ -e /dev/dri/renderD128 ]; then
  if baslat donanim "$DONANIM" "$URL" && sayfa_sagligi 40; then
    KIP="donanim"
  else
    echo "! Donanim ciziminde masaustu dogrulanamadi — yazilim cizimine geciliyor."
    kill -9 "$PID" 2>/dev/null || true
    temiz_profil
  fi
else
  echo "Donanim cizimi kullanilamiyor (surucu yok ya da gozcu guvenli kipe aldi)."
fi

# --- Kademe 2: Mesa llvmpipe yazilim cizimi
if [ -z "$KIP" ] && llvmpipe_var; then
  LIBGL_ALWAYS_SOFTWARE=1; GALLIUM_DRIVER=llvmpipe
  export LIBGL_ALWAYS_SOFTWARE GALLIUM_DRIVER
  if baslat llvmpipe "$LLVMPIPE" "$URL" && sayfa_sagligi 60; then
    KIP="llvmpipe"
  else
    echo "! llvmpipe ile masaustu dogrulanamadi — SwiftShader deneniyor."
    kill -9 "$PID" 2>/dev/null || true
    temiz_profil
  fi
fi

# --- Kademe 2b: SwiftShader
if [ -z "$KIP" ]; then
  if baslat swiftshader "$YAZILIM" "$URL" && sayfa_sagligi 60; then
    KIP="swiftshader"
  else
    echo "! Yazilim ciziminde de masaustu dogrulanamadi — kurtarma ekranina geciliyor."
    kill -9 "$PID" 2>/dev/null || true
    temiz_profil
  fi
fi

# --- Kademe 3: kurtarma ekrani (kullanici asla bos ekranla kalmaz)
if [ -z "$KIP" ]; then
  /opt/tedbirge/kurtarma-sayfasi.sh 2>/dev/null || true
  if baslat kurtarma "$YAZILIM" "$KURTARMA_URL"; then
    echo "Kurtarma ekrani gosteriliyor; tani kaydi: /var/log/tedbirge/"
    touch /run/tedbirge-kurtarma
    wait "$PID"
    exit 1
  fi
  echo "Kurtarma ekrani da acilamadi; okunabilir kabuga dusuluyor."
  exec /bin/sh
fi

hazir_isaretle "$KIP"
wait "$PID"
