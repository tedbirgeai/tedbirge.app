#!/usr/bin/env bash
# Tedbirge® WebOS — masaüstü paketleri (.exe / .dmg / .AppImage)
#
# Yapılandırma: build/tauri.conf.json
# Araç zinciri eksikse betik sahte başarı üretmez: açık bir mesajla durur.
set -euo pipefail
cd "$(dirname "$0")/.."

hedef="${1:-auto}"
case "$hedef" in
  auto)
    case "$(uname -s)" in
      Darwin) hedef="macos" ;;
      Linux) hedef="linux" ;;
      MINGW* | MSYS* | CYGWIN*) hedef="windows" ;;
      *) hedef="linux" ;;
    esac
    ;;
  windows | macos | linux) ;;
  *)
    echo "! Bilinmeyen hedef: $hedef (windows | macos | linux | auto)" >&2
    exit 2
    ;;
esac

echo "== Masaüstü paketi: $hedef =="

eksik=0
command -v cargo >/dev/null 2>&1 || {
  echo "! cargo (Rust) yok. Kurulum: https://rustup.rs" >&2
  eksik=1
}
if [ "$hedef" = "macos" ] && [ "$(uname -s)" != "Darwin" ]; then
  echo "! .dmg yalnız macOS makinede üretilebilir (Apple araç zinciri gerekir)." >&2
  eksik=1
fi
if [ "$hedef" = "windows" ] && [ "$(uname -s)" = "Linux" ] && ! command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
  echo "! .exe için Windows makinesi ya da mingw-w64 çapraz derleyici gerekir." >&2
  eksik=1
fi
if [ "$eksik" -ne 0 ]; then
  echo "! Araç zinciri eksik: paket üretilmedi." >&2
  exit 1
fi

# 1) Arayüz çıktısı
bun run build

# 2) Tauri kabuğu yoksa bir kez oluşturulur (yapılandırma build/tauri.conf.json'dan gelir)
if [ ! -d src-tauri ]; then
  echo "== Tauri kabuğu hazırlanıyor =="
  bunx --bun @tauri-apps/cli@2 init \
    --app-name "Tedbirge WebOS" \
    --window-title "Tedbirge® WebOS" \
    --frontend-dist ../dist/client \
    --before-build-command "bun run build" \
    --ci
fi
cp build/tauri.conf.json src-tauri/tauri.conf.json

case "$hedef" in
  windows) bunx --bun @tauri-apps/cli@2 build --bundles nsis ;;
  macos) bunx --bun @tauri-apps/cli@2 build --bundles dmg ;;
  linux) bunx --bun @tauri-apps/cli@2 build --bundles appimage ;;
esac

echo "== Bitti: src-tauri/target/release/bundle/ altına bakın =="
