#!/usr/bin/env bash
# Tedbirge® WebOS — PWA çıktısı
# Mevcut vite-plugin-pwa yapılandırması kullanılır; servis çalışanı yalnız
# yayınlanmış sitede kayıt olur (önizlemede devre dışıdır).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Tedbirge WebOS PWA derleniyor =="
bun run build

test -d dist || {
  echo "! dist/ üretilmedi." >&2
  exit 1
}

echo "-- Üretilen kontrol dosyaları:"
find dist -maxdepth 3 -name "manifest.webmanifest" -o -maxdepth 3 -name "sw.js" | sed 's/^/   /' || true
echo "== Bitti: dist/ yayımlanabilir =="
