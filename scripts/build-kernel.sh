#!/usr/bin/env bash
# Tedbirge çekirdeği (Rust) → public/kernel/tedbirge_kernel.wasm
# Kullanım: bash scripts/build-kernel.sh
# Gereken: cargo + wasm32-unknown-unknown hedefi + lld
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/crates/tedbirge-kernel"

# Faz C: varsayılan özellik `wasm` (no_std + alloc + dahili ayırıcı).
cargo build --release --target wasm32-unknown-unknown
cargo test --no-default-features --features std

# Çıktı, çalışma alanı köküne ya da paket dizinine düşebilir; ikisi de denenir.
WASM=""
for candidate in \
  "../target/wasm32-unknown-unknown/release/tedbirge_kernel.wasm" \
  "target/wasm32-unknown-unknown/release/tedbirge_kernel.wasm"; do
  if [ -s "$candidate" ]; then
    WASM="$candidate"
    break
  fi
done

if [ -z "$WASM" ]; then
  echo "! Wasm çıktısı bulunamadı — cargo derlemesi başarısız." >&2
  exit 1
fi

# Hedef dizinler kopyalamadan önce garanti edilir (mutlak yol kullanılır).
# Dizin adına dosya adı karışmaması için önce hedef dosya/dizin temizlenir.
rm -rf "$ROOT/public/kernel/tedbirge_kernel.wasm"
mkdir -p "$ROOT/public/kernel"
cp "$WASM" "$ROOT/public/kernel/tedbirge_kernel.wasm"

# Boş ya da bozuk dosya sessizce geçmez.
if ! test -s "$ROOT/public/kernel/tedbirge_kernel.wasm"; then
  echo "! public/kernel/tedbirge_kernel.wasm boş." >&2
  exit 1
fi

# Kurulum imajı derlemesinde çekirdek ayrı çıktı klasörüne de kopyalanır.
if [ "${TEDBIRGE_ISO:-0}" = "1" ]; then
  rm -rf "$ROOT/build-iso/kernel/tedbirge_kernel.wasm"
  mkdir -p "$ROOT/build-iso/kernel"
  cp "$WASM" "$ROOT/build-iso/kernel/tedbirge_kernel.wasm"
  test -s "$ROOT/build-iso/kernel/tedbirge_kernel.wasm" || {
    echo "! build-iso/kernel/tedbirge_kernel.wasm boş." >&2; exit 1; }
  echo "✓ build-iso/kernel/tedbirge_kernel.wasm hazır"
fi

echo "✓ public/kernel/tedbirge_kernel.wasm güncellendi ($(wc -c < "$ROOT/public/kernel/tedbirge_kernel.wasm") bayt)"
