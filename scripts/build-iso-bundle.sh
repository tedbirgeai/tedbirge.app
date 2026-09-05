#!/usr/bin/env bash
# Tedbirge® WebOS — kurulum imajı için bağımsız derleme.
#
# Derleme tek çıktı yolunu kullanır (dist/), sonuç build-iso/web altına
# TAŞINIR ve kök dizindeki dist/ tamamen silinir. Böylece imaj paketi
# yayın çıktısıyla asla karışmaz ve izolasyon kontrolü temiz geçer.
#   build-iso/web       → imaja gömülecek arayüz (index.html + varlıklar)
#   build-iso/kernel    → Rust/Wasm çekirdeği
#   build-iso/iso       → nihai .iso ve SHA256SUMS (Alpine adımı doldurur)
set -euo pipefail
cd "$(dirname "$0")/.."

export TEDBIRGE_ISO=1
unset VERCEL || true

echo "== Kurulum imajı paketi derleniyor =="

rm -rf build-iso/web build-iso/web-out
mkdir -p build-iso/web build-iso/kernel build-iso/iso

# 1) Rust/Wasm çekirdeği (cargo yoksa mevcut public/kernel çıktısı kullanılır)
if command -v cargo >/dev/null 2>&1; then
  bash scripts/build-kernel.sh
else
  echo "! cargo yok — public/kernel içindeki mevcut çekirdek kullanılacak."
  test -s public/kernel/tedbirge_kernel.wasm || {
    echo "! public/kernel/tedbirge_kernel.wasm yok; çekirdeksiz imaj üretilmez." >&2
    exit 1
  }
  rm -rf build-iso/kernel/tedbirge_kernel.wasm
  cp public/kernel/tedbirge_kernel.wasm build-iso/kernel/tedbirge_kernel.wasm
fi

# 2) Arayüz paketi — ön-render dahil (dist/client üretilir)
RUNNER="${ISO_BUILD_RUNNER:-}"
if [ -z "$RUNNER" ]; then
  if command -v bunx >/dev/null 2>&1; then RUNNER="bunx"; else RUNNER="npx"; fi
fi
rm -rf dist
"$RUNNER" vite build

test -s dist/client/index.html || {
  echo "! dist/client/index.html üretilmedi — ön-render çalışmamış." >&2
  exit 1
}

# 3) Paketi imaj klasörüne taşı ve kök çıktıyı tamamen kaldır (izolasyon)
rm -rf build-iso/web
mkdir -p build-iso
mv dist/client build-iso/web
rm -rf dist

# 4) Çekirdeği paketin içine yerleştir
mkdir -p build-iso/web/kernel
cp build-iso/kernel/tedbirge_kernel.wasm build-iso/web/kernel/tedbirge_kernel.wasm

# 5) Doğrulama: açılış sayfası, çekirdek ve kök izolasyonu
for f in build-iso/web/index.html build-iso/web/kernel/tedbirge_kernel.wasm; do
  test -s "$f" || { echo "! $f eksik." >&2; exit 1; }
done
if [ -e dist ]; then
  echo "! kök dist/ silinemedi — izolasyon bozuk." >&2
  exit 1
fi

echo "✓ build-iso/web  ($(du -sh build-iso/web | cut -f1))"
echo "✓ build-iso/kernel/tedbirge_kernel.wasm ($(wc -c < build-iso/kernel/tedbirge_kernel.wasm) bayt)"
echo "ISO_BUNDLE_OK"
