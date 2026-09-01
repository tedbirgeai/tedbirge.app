#!/usr/bin/env bash
# FAZ 5 — RISC-V 64 (riscv64gc) çapraz derleme + U-Boot/extlinux tanımı
# Kullanım: bash scripts/build-riscv64.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET=riscv64gc-unknown-linux-gnu
OUT=${OUT:-build/riscv64}

echo "› WebOS kabuk paketi derleniyor (dist/)"
bun run build >/dev/null

rustup target add "$TARGET" 2>/dev/null || true

echo "› Yerel kabuk çapraz derleniyor ($TARGET)"
cargo build --release --target "$TARGET" \
  --manifest-path crates/tedbirge-shell-native/Cargo.toml

mkdir -p "$OUT/extlinux"
cp "crates/tedbirge-shell-native/target/$TARGET/release/tedbirge-shell" "$OUT/"
rm -rf "$OUT/dist" && cp -r dist "$OUT/dist"

# U-Boot / extlinux: SBC'lerin (VisionFive, LicheePi, Milk-V) standart yolu.
cat > "$OUT/extlinux/extlinux.conf" <<'EXT'
default tedbirge
timeout 30
menu title Tedbirge WebOS

label tedbirge
  menu label Tedbirge WebOS (bare-metal)
  kernel /vmlinuz
  initrd /initramfs.img
  fdtdir /dtbs
  append quiet console=ttyS0,115200 rw

label headless
  menu label Tedbirge WebOS (bassiz role)
  kernel /vmlinuz
  initrd /initramfs.img
  fdtdir /dtbs
  append quiet console=ttyS0,115200 rw TEDBIRGE_MODE=headless
EXT

cat > "$OUT/tedbirge-shell.service" <<'UNIT'
[Unit]
Description=Tedbirge OS kilitli kabuk (riscv64)
After=network.target

[Service]
Type=simple
ExecStart=/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

echo "✓ $OUT (ikili + dist + extlinux + systemd birimi)"
echo "  İmaj: ARCH=riscv64 bash scripts/build-image.sh"
