#!/usr/bin/env bash
# Faz 4 — ARM64 (aarch64) çapraz derleme ve mobil/gömülü kilitli kabuk paketi.
# Kullanım: bash scripts/build-arm64.sh
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET=aarch64-unknown-linux-gnu
OUT=${OUT:-build/arm64}

echo "› WebOS kabuk paketi derleniyor (dist/)"
bun run build >/dev/null

rustup target add "$TARGET" 2>/dev/null || true

echo "› Yerel kabuk çapraz derleniyor ($TARGET)"
cargo build --release --target "$TARGET" \
  --manifest-path crates/tedbirge-shell-native/Cargo.toml

mkdir -p "$OUT"
source scripts/lib-paths.sh
BIN=$(find_bin tedbirge-shell "$TARGET") || { echo "! capraz derleme ciktisi yok"; exit 1; }
cp "$BIN" "$OUT/"
rm -rf "$OUT/dist" && cp -r dist "$OUT/dist"

# Kilitli kabuk (kiosk) servis tanımı — Raspberry Pi / ARM64 SBC.
cat > "$OUT/tedbirge-shell.service" <<'UNIT'
[Unit]
Description=Tedbirge OS kilitli kabuk
After=network.target

[Service]
Type=simple
ExecStart=/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

echo "✓ $OUT (ikili + dist + systemd birimi)"
echo "  Kurulum: sudo cp -r $OUT/{tedbirge-shell,dist} /opt/tedbirge/ && sudo systemctl enable --now tedbirge-shell"
