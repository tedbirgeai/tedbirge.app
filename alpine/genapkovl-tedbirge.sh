#!/bin/sh -e
# Tedbirge(R) WebOS — apkovl (ISO'ya gömülen yapılandırma katmanı)
#   • web paketi  -> /var/www/localhost/htdocs
#   • nginx       -> 127.0.0.1:80 (SPA + Wasm + COOP/COEP)
#   • tty1        -> otomatik oturum -> X -> Chromium kiosk
#   • kurulum     -> tedbirge.install=1 çekirdek parametresi ile sihirbaz
# Girdi: TEDBIRGE_PAYLOAD (htdocs.tar.gz, install/, boot/)

HOSTNAME="tedbirge"
PAYLOAD="${TEDBIRGE_PAYLOAD:-/home/builder/tedbirge}"
VERSION="${TEDBIRGE_VERSION:-1.0.0}"

cleanup() { rm -rf "$tmp"; }
tmp="$(mktemp -d)"
trap cleanup EXIT

makefile() {
	OWNER="$1"; PERMS="$2"; FILENAME="$3"; shift 3
	mkdir -p "$(dirname "$FILENAME")"
	cat > "$FILENAME"
	chown "$OWNER" "$FILENAME"
	chmod "$PERMS" "$FILENAME"
}

rc_add() {
	mkdir -p "$tmp/etc/runlevels/$2"
	ln -sf "/etc/init.d/$1" "$tmp/etc/runlevels/$2/$1"
}

mkdir -p "$tmp/etc" "$tmp/etc/apk" "$tmp/etc/local.d" \
         "$tmp/var/www/localhost/htdocs" "$tmp/opt/tedbirge" \
         "$tmp/home/tedbirge" "$tmp/etc/nginx/http.d"

# ---------------------------------------------------------------- web paketi
tar -xzf "$PAYLOAD/htdocs.tar.gz" -C "$tmp/var/www/localhost/htdocs"

# ------------------------------------------------------------------- kimlik
makefile root:root 0644 "$tmp/etc/hostname" <<EOF
$HOSTNAME
EOF

makefile root:root 0644 "$tmp/etc/tedbirge-release" <<EOF
NAME="Tedbirge(R) WebOS"
VERSION=$VERSION
VARIANT="live-kiosk"
HTTP_PORT=80
MESH_PORT=7946
EOF

makefile root:root 0644 "$tmp/etc/motd" <<'EOF'
Tedbirge(R) WebOS — arayuz: http://127.0.0.1/
Diske kalici kurulum: tedbirge-kur
EOF

# -------------------------------------------------------------------- nginx
makefile root:root 0644 "$tmp/etc/nginx/http.d/tedbirge.conf" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/localhost/htdocs;
    index index.html;

    # Wasm çekirdeği için izolasyon başlıkları (SharedArrayBuffer)
    add_header Cross-Origin-Opener-Policy   "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header X-Content-Type-Options       "nosniff" always;

    types { application/wasm wasm; }

    location /kernel/ {
        add_header Cross-Origin-Opener-Policy   "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # Yerel güç köprüsü (kapat / yeniden başlat / uyku) — yalnız bu makine
    location /sys-api/ {
        proxy_pass http://127.0.0.1:8378/;
        proxy_http_version 1.1;
        allow 127.0.0.1;
        allow ::1;
        deny all;
    }

    # Tek sayfalık uygulama: bilinmeyen yollar kabuğa düşer
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# ------------------------------------------------------- kiosk oturum zinciri
makefile root:root 0755 "$tmp/opt/tedbirge/kiosk.sh" <<'EOF'
#!/bin/sh
# Kiosk görüntüleyici: Chromium > cog > başsız düğüm
# Tüm çıktı üretim hata izine yazılır: /var/log/tedbirge/kiosk.log
URL="http://127.0.0.1/"
mkdir -p /var/log/tedbirge
exec >>/var/log/tedbirge/kiosk.log 2>&1
echo "--- kiosk baslangic $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"
for i in 1 2 3 4 5 6 7 8 9 10; do
  wget -q -O /dev/null "$URL" && break
  sleep 1
done
# Ekran kartı tespiti: sürücü varsa donanım hızlandırma, yoksa yazılım çizimi.
GPU_FLAGS="--use-gl=egl --enable-features=Vulkan,VaapiVideoDecoder,WebGPU --ignore-gpu-blocklist --enable-zero-copy"
if [ ! -e /dev/dri/renderD128 ]; then
  echo "GPU surucusu bulunamadi — yazilim cizimine dusuluyor."
  GPU_FLAGS="--disable-gpu --use-gl=swiftshader"
  LIBGL_ALWAYS_SOFTWARE=1
  export LIBGL_ALWAYS_SOFTWARE
fi
echo "gpu: $(ls /dev/dri 2>/dev/null | tr '\n' ' ')"

if command -v chromium >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  exec chromium \
    --kiosk --app="$URL" --start-fullscreen \
    --noerrdialogs --disable-infobars --disable-translate \
    --no-first-run --disable-pinch --overscroll-history-navigation=0 \
    --password-store=basic --test-type $GPU_FLAGS
elif command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser --kiosk --app="$URL" --noerrdialogs --no-first-run
elif command -v cog >/dev/null 2>&1; then
  exec cog "$URL"
else
  echo "Goruntuleyici bulunamadi. Tedbirge(R) WebOS aga acik: $URL"
  exec /bin/sh
fi
EOF

makefile root:root 0644 "$tmp/home/tedbirge/.xinitrc" <<'EOF'
xset s off
xset -dpms
xset s noblank
# Coklu monitor: bagli tum ciktilar en yuksek kendi cozunurluklerinde acilir.
/opt/tedbirge/ekran-duzeni.sh 2>/dev/null || true
exec /opt/tedbirge/kiosk.sh
EOF

makefile root:root 0644 "$tmp/etc/profile.d/tedbirge-kiosk.sh" <<'EOF'
# tty1'de oturum acilinca kiosk baslar; diger konsollar normal kabuk kalir.
if [ "$(tty)" = "/dev/tty1" ] && [ -z "${DISPLAY:-}" ]; then
  if grep -q 'tedbirge.install=1' /proc/cmdline 2>/dev/null; then
    exec /opt/tedbirge/tedbirge-kurulum.sh
  fi
  exec startx -- -nocursor >/dev/null 2>&1
fi
EOF

# tty1 otomatik oturum
makefile root:root 0644 "$tmp/etc/inittab" <<'EOF'
::sysinit:/sbin/openrc sysinit
::sysinit:/sbin/openrc boot
::wait:/sbin/openrc default

tty1::respawn:/sbin/agetty --autologin root --noclear tty1 linux
tty2::respawn:/sbin/getty 38400 tty2
tty3::respawn:/sbin/getty 38400 tty3

::ctrlaltdel:/sbin/reboot
::shutdown:/sbin/openrc shutdown
EOF

# root oturumu kiosk kullanicisinin .xinitrc dosyasini kullanir
makefile root:root 0644 "$tmp/root/.xinitrc" <<'EOF'
xset s off
xset -dpms
xset s noblank
# Coklu monitor: bagli tum ciktilar en yuksek kendi cozunurluklerinde acilir.
/opt/tedbirge/ekran-duzeni.sh 2>/dev/null || true
exec /opt/tedbirge/kiosk.sh
EOF

# ------------------------------------------------------------ hata izi (log)
# Üretimde oluşan hatalar diskte kalıcı olarak tutulur; boyut sınırlıdır.
mkdir -p "$tmp/etc/logrotate.d" "$tmp/etc/local.d" "$tmp/var/log/tedbirge"

makefile root:root 0644 "$tmp/etc/logrotate.d/tedbirge" <<'EOF'
/var/log/tedbirge/*.log {
  daily
  rotate 14
  size 5M
  missingok
  notifempty
  copytruncate
  compress
}
EOF

makefile root:root 0755 "$tmp/etc/local.d/tedbirge-log.start" <<'EOF'
#!/bin/sh
# Açılışta hata izi dizinini hazırlar ve sistem bilgisini kaydeder.
mkdir -p /var/log/tedbirge
{
  echo "--- acilis $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"
  echo "surum: $(cat /etc/tedbirge-release 2>/dev/null | tr '\n' ' ')"
  echo "cekirdek: $(uname -a)"
} >>/var/log/tedbirge/sistem.log 2>&1
EOF

# ------------------------------------------------------- diske kurulum sihirbazı
install -Dm755 "$PAYLOAD/install/tedbirge-kurulum.sh" "$tmp/opt/tedbirge/tedbirge-kurulum.sh"
install -Dm755 "$PAYLOAD/install/setup-tedbirge-disk.sh" "$tmp/opt/tedbirge/setup-tedbirge-disk.sh"
mkdir -p "$tmp/usr/local/bin"
ln -sf /opt/tedbirge/tedbirge-kurulum.sh "$tmp/usr/local/bin/tedbirge-kur"


# ----------------------------------------------------------------- servisler
mkdir -p "$tmp/etc/apk"
makefile root:root 0644 "$tmp/etc/apk/world" <<'EOF'
alpine-base
alpine-conf
EOF

rc_add devfs sysinit
rc_add dmesg sysinit
rc_add mdev sysinit
rc_add hwdrivers sysinit
rc_add modloop sysinit

rc_add hwclock boot
rc_add modules boot
rc_add sysctl boot
rc_add hostname boot
rc_add bootmisc boot
rc_add syslog boot

rc_add dbus default
rc_add networkmanager default
rc_add nginx default
rc_add local default
rc_add crond default

rc_add mount-ro shutdown
rc_add killprocs shutdown
rc_add savecache shutdown

tar -c -C "$tmp" etc opt root home var usr | gzip -9n > "$HOSTNAME.apkovl.tar.gz"
