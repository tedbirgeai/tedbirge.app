#!/usr/bin/env bash
# Faz 3 — Tedbirge yerel kabuğu (x86_64 ana makine)
# Kullanım: bash scripts/build-native.sh
# Çıktı: crates/tedbirge-shell-native/target/release/tedbirge-shell
set -euo pipefail

cd "$(dirname "$0")/.."

echo "› WebOS kabuk paketi derleniyor (dist/)"
bun run build >/dev/null

echo "› Yerel kabuk derleniyor (x86_64)"
cargo build --release --manifest-path crates/tedbirge-shell-native/Cargo.toml

BIN=crates/tedbirge-shell-native/target/release/tedbirge-shell
echo "✓ $BIN"
echo "  Çalıştırma: $BIN --root dist --port 8377 --mesh-port 7946"
