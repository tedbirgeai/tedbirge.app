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
         "$tmp/home/tedbirge" "$tmp/etc/nginx/http.d" \
         "$tmp/etc/acpi/PWRF" "$tmp/etc/acpi/LID" "$tmp/etc/sysctl.d" "$tmp/media"

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


# ------------------------------------------------------- ekran duzeni (GPU)
makefile root:root 0755 "$tmp/opt/tedbirge/ekran-duzeni.sh" <<'EOF'
#!/bin/sh
# Bagli tum ekranlari etkinlestirir; ilki ana ekran, digerleri sagina dizilir.
command -v xrandr >/dev/null 2>&1 || exit 0
prev=""
xrandr --query | awk '/ connected/{print $1}' | while read -r out; do
  if [ -z "$prev" ]; then
    xrandr --output "$out" --auto --primary
  else
    xrandr --output "$out" --auto --right-of "$prev"
  fi
  prev="$out"
done
exit 0
EOF

# ------------------------------------------------ bellek: ZRAM + OOM korumasi
makefile root:root 0755 "$tmp/etc/local.d/tedbirge-bellek.start" <<'EOF'
#!/bin/sh
# ZRAM: RAM'in yarisi kadar sikistirilmis takas alani (zstd).
mkdir -p /var/log/tedbirge
exec >>/var/log/tedbirge/bellek.log 2>&1
modprobe zram num_devices=1 2>/dev/null
if [ -e /sys/block/zram0/disksize ]; then
  total_kb=$(awk '/MemTotal/{print $2}' /proc/meminfo)
  size=$(( total_kb * 1024 / 2 ))
  echo zstd > /sys/block/zram0/comp_algorithm 2>/dev/null || true
  echo "$size" > /sys/block/zram0/disksize
  mkswap /dev/zram0 >/dev/null 2>&1
  swapon -p 100 /dev/zram0 && echo "zram0 aktif: $size bayt"
fi
EOF

makefile root:root 0755 "$tmp/etc/local.d/tedbirge-oom.start" <<'EOF'
#!/bin/sh
# OOM koruyucu: bos bellek %5'in altina duserse en cok tuketen surec durdurulur,
# boylece sistem kilitlenmez. Cekirdek surecleri (nginx, sysbridge) korunur.
mkdir -p /var/log/tedbirge
( while :; do
    avail=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
    total=$(awk '/MemTotal/{print $2}' /proc/meminfo)
    [ -n "$avail" ] && [ -n "$total" ] || { sleep 5; continue; }
    if [ "$(( avail * 100 / total ))" -lt 5 ]; then
      pid=$(ps -eo pid,rss,comm --sort=-rss 2>/dev/null | awk 'NR==2{print $1}')
      name=$(cat "/proc/$pid/comm" 2>/dev/null)
      case "$name" in
        nginx|tedbirge-sysbridge|init|openrc) ;;
        "") ;;
        *) kill -TERM "$pid" 2>/dev/null
           echo "$(date -u +%FT%TZ) bellek korumasi: $name ($pid) durduruldu" \
             >>/var/log/tedbirge/bellek.log ;;
      esac
    fi
    sleep 5
  done ) &
EOF

makefile root:root 0644 "$tmp/etc/sysctl.d/60-tedbirge.conf" <<'EOF'
# Sikistirilmis takas hizli oldugu icin agresif kullanilir.
vm.swappiness = 100
vm.vfs_cache_pressure = 50
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.min_free_kbytes = 32768
vm.overcommit_memory = 0
# Guc kopprusunun son care ACPI sinyali icin sysrq acik kalir.
kernel.sysrq = 1
EOF

# ------------------------------------------------------- guc koprusu (ACPI)
if [ -f "$PAYLOAD/bin/tedbirge-sysbridge" ]; then
	install -Dm755 "$PAYLOAD/bin/tedbirge-sysbridge" "$tmp/opt/tedbirge/tedbirge-sysbridge"
else
	# Yedek: derlenmis ikili yoksa busybox nc ile ayni sozlesme sunulur.
	makefile root:root 0755 "$tmp/opt/tedbirge/tedbirge-sysbridge" <<'EOF'
#!/bin/sh
# Yedek guc koprusu — yalniz 127.0.0.1:8378 dinler.
while :; do
  req=$(nc -l -p 8378 -s 127.0.0.1 -w 5 2>/dev/null <<'RESP'
HTTP/1.1 200 OK
Content-Type: application/json
Connection: close

{"durum":"OK","mesaj":"alindi"}
RESP
)
  case "$req" in
    *"POST /guc/kapat"*)          sync; poweroff ;;
    *"POST /guc/yeniden-baslat"*) sync; reboot ;;
    *"POST /guc/uyku"*)           sync; echo mem  > /sys/power/state 2>/dev/null ;;
    *"POST /guc/derin-uyku"*)     sync; echo disk > /sys/power/state 2>/dev/null ;;
  esac
done
EOF
fi

makefile root:root 0755 "$tmp/etc/init.d/tedbirge-sysbridge" <<'EOF'
#!/sbin/openrc-run
description="Tedbirge guc koprusu (kapat / yeniden baslat / uyku)"
command="/opt/tedbirge/tedbirge-sysbridge"
command_background=true
pidfile="/run/tedbirge-sysbridge.pid"
output_log="/var/log/tedbirge/sysbridge.log"
error_log="/var/log/tedbirge/sysbridge.log"
depend() { need localmount; before nginx; }
EOF

# Fiziksel guc tusu ve kapak: ayni koprü uzerinden duzenli kapanis
makefile root:root 0755 "$tmp/etc/acpi/PWRF/00000080" <<'EOF'
#!/bin/sh
sync
poweroff
EOF

makefile root:root 0755 "$tmp/etc/acpi/LID/00000080" <<'EOF'
#!/bin/sh
# Kapak kapaninca RAM'de bekleme; acilinca sistem geri doner.
grep -q closed /proc/acpi/button/lid/*/state 2>/dev/null && {
  sync
  echo mem > /sys/power/state 2>/dev/null
}
exit 0
EOF

# ------------------------------------------- yerel depolama otomatik baglama
makefile root:root 0755 "$tmp/etc/local.d/tedbirge-disk.start" <<'EOF'
#!/bin/sh
# NVMe / SSD / SATA / USB bolumleri /media/<etiket> altina guvenli baglanir.
mkdir -p /media /var/log/tedbirge
exec >>/var/log/tedbirge/disk.log 2>&1
command -v blkid >/dev/null 2>&1 || exit 0
blkid -o device | while read -r dev; do
  case "$dev" in *zram*|*loop*) continue ;; esac
  mountpoint -q "$(findmnt -n -o TARGET --source "$dev" 2>/dev/null)" 2>/dev/null && continue
  findmnt -n --source "$dev" >/dev/null 2>&1 && continue
  label=$(blkid -s LABEL -o value "$dev" 2>/dev/null)
  [ -n "$label" ] || label=$(basename "$dev")
  type=$(blkid -s TYPE -o value "$dev" 2>/dev/null)
  case "$type" in
    ext4|ext3|f2fs|vfat|exfat|ntfs) ;;
    *) continue ;;
  esac
  mkdir -p "/media/$label"
  mount -o nosuid,nodev,noatime "$dev" "/media/$label" 2>/dev/null \
    && echo "baglandi: $dev -> /media/$label ($type)"
done
exit 0
EOF

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
rc_add acpid default
rc_add bluetooth default
rc_add tedbirge-sysbridge default
rc_add networkmanager default
rc_add nginx default
rc_add local default
rc_add crond default

rc_add mount-ro shutdown
rc_add killprocs shutdown
rc_add savecache shutdown

tar -c -C "$tmp" etc opt root home var usr media | gzip -9n > "$HOSTNAME.apkovl.tar.gz"
