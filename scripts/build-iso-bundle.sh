#!/usr/bin/env bash
# Tedbirge® WebOS — kurulum imajı için bağımsız derleme.
#
# Yayın çıktısına (dist/client, dist/server, vercel.json) DOKUNMAZ.
# Tüm çıktılar build-iso/ altında toplanır:
#   build-iso/web       → imaja gömülecek arayüz (index.html + varlıklar)
#   build-iso/web-out   → nitro ara çıktısı (paketlenmez)
#   build-iso/kernel    → Rust/Wasm çekirdeği
#   build-iso/iso       → nihai .iso ve SHA256SUMS (Alpine adımı doldurur)
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

export TEDBIRGE_ISO=1
unset VERCEL || true

echo "== Kurulum imajı paketi derleniyor =="

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
  cp public/kernel/tedbirge_kernel.wasm build-iso/kernel/tedbirge_kernel.wasm
fi

# 2) Arayüz paketi — ayrı çıktı dizinine
RUNNER="${ISO_BUILD_RUNNER:-}"
if [ -z "$RUNNER" ]; then
  if command -v bunx >/dev/null 2>&1; then RUNNER="bunx"; else RUNNER="npx"; fi
fi
"$RUNNER" vite build

# 3) Doğrulama: açılış sayfası ve çekirdek imaj paketinde olmalı
test -s build-iso/web/index.html || {
  echo "! build-iso/web/index.html üretilmedi — ön-render çalışmamış." >&2
  exit 1
}
mkdir -p build-iso/web/kernel
cp build-iso/kernel/tedbirge_kernel.wasm build-iso/web/kernel/tedbirge_kernel.wasm
test -s build-iso/web/kernel/tedbirge_kernel.wasm || {
  echo "! build-iso/web/kernel/tedbirge_kernel.wasm eksik." >&2
  exit 1
}

# 4) Yayın çıktısıyla çakışma kontrolü: imaj paketi dist altına yazmamalı.
for f in build-iso/web/index.html build-iso/web/kernel/tedbirge_kernel.wasm; do
  test -s "$f" || { echo "! $f eksik." >&2; exit 1; }
done

echo "✓ build-iso/web  ($(du -sh build-iso/web | cut -f1))"
echo "✓ build-iso/kernel/tedbirge_kernel.wasm ($(wc -c < build-iso/kernel/tedbirge_kernel.wasm) bayt)"
echo "ISO_BUNDLE_OK"
