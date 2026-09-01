#!/usr/bin/env bash
# FAZ 6-10 — Tüm bare-metal bileşenlerini derler ve test eder.
#   tedbirge-hal-linux   (HAL sürücüleri)
#   tedbirge-compositor  (kiosk kompozitörü + Wasm host)
#   tedbirge-installer   (kurulum sihirbazı)
#   tedbirge-shell       (yerel kabuk / headless daemon)
# Kullanım: bash scripts/build-bare-metal.sh [--test]
set -euo pipefail
cd "$(dirname "$0")/.."

CRATES=(
  crates/tedbirge-kernel
  crates/tedbirge-hal-linux
  crates/tedbirge-compositor
  crates/tedbirge-installer
  crates/tedbirge-shell-native
)

if [ "${1:-}" = "--test" ]; then
  for c in "${CRATES[@]}"; do
    echo "› test: $c"
    cargo test --manifest-path "$c/Cargo.toml"
  done
  exit 0
fi

OUT=${OUT:-build/bare-metal}
mkdir -p "$OUT"
for c in "${CRATES[@]}"; do
  echo "› derleme: $c"
  cargo build --release --manifest-path "$c/Cargo.toml"
done

for b in tedbirge-shell tedbirge-compositor tedbirge-install; do
  f=$(ls -1 crates/*/target/release/$b 2>/dev/null | head -n1 || true)
  [ -n "$f" ] && cp "$f" "$OUT/" && echo "✓ $OUT/$b"
done

# FAZ 10 — servis birimleri (systemd ve openrc)
cat > "$OUT/tedbirge-shell.service" <<'UNIT'
[Unit]
Description=Tedbirge OS düğümü
After=network.target

[Service]
Type=simple
Environment=TEDBIRGE_PROFILE=auto
ExecStart=/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946 --state /var/tedbirge
Restart=always
RestartSec=2
MemoryMax=512M

[Install]
WantedBy=multi-user.target
UNIT

cat > "$OUT/tedbirge-shell.openrc" <<'RC'
#!/sbin/openrc-run
description="Tedbirge OS dugumu"
command="/opt/tedbirge/tedbirge-shell"
command_args="--root /opt/tedbirge/dist --port 8377 --mesh-port 7946 --state /var/tedbirge --headless"
command_background=true
pidfile="/run/tedbirge-shell.pid"
depend() { need net; }
RC
chmod +x "$OUT/tedbirge-shell.openrc"

echo "✓ Servis birimleri: $OUT/tedbirge-shell.{service,openrc}"
