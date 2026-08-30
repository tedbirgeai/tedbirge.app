#!/usr/bin/env bash
# Faz 3 — Önyüklenebilir Tedbirge OS imajı (x86_64)
# Katmanlar: Linux çekirdeği (HAL) + tedbirge-shell (yerel kabuk) + kiosk görüntüleyici.
# Kullanım: bash scripts/build-iso.sh   (Nix ve kök yetkisi olan bir Linux ana makine gerekir)
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=${OUT:-build/iso}
STAGE=$OUT/root

bash scripts/build-native.sh

rm -rf "$STAGE"
mkdir -p "$STAGE/opt/tedbirge" "$STAGE/etc" "$OUT"

cp -r dist "$STAGE/opt/tedbirge/dist"
cp crates/tedbirge-shell-native/target/release/tedbirge-shell "$STAGE/opt/tedbirge/"

# Açılış betiği: kabuk servisini başlat, kiosk görüntüleyiciyi tam ekran aç.
cat > "$STAGE/opt/tedbirge/boot.sh" <<'BOOT'
#!/bin/sh
set -e
/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 --mesh-port 7946 &
# Görüntüleyici yoksa kabuk yalnız ağ üzerinden erişilir (başsız düğüm).
if command -v cog >/dev/null 2>&1; then
  exec cog --enable-developer-extras=false http://127.0.0.1:8377/
elif command -v chromium >/dev/null 2>&1; then
  exec chromium --kiosk --no-sandbox --app=http://127.0.0.1:8377/
else
  echo "Tedbirge kabugu hazir: http://127.0.0.1:8377/"
  wait
fi
BOOT
chmod +x "$STAGE/opt/tedbirge/boot.sh"

cat > "$STAGE/etc/tedbirge-release" <<REL
NAME="Tedbirge OS"
VARIANT="Layer 1 · bare-metal"
SHELL_PORT=8377
MESH_PORT=7946
BUILD=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REL

# ISO paketleme: xorriso + bir Linux çekirdeği/initramfs gerektirir.
if command -v xorriso >/dev/null 2>&1; then
  xorriso -as mkisofs -o "$OUT/tedbirge-os-x86_64.iso" -V TEDBIRGE "$STAGE"
  echo "✓ $OUT/tedbirge-os-x86_64.iso"
else
  echo "! xorriso bulunamadi — kok agaci hazir: $STAGE"
  echo "  Nix ile: nix run nixpkgs#xorriso -- -as mkisofs -o $OUT/tedbirge-os-x86_64.iso -V TEDBIRGE $STAGE"
fi
