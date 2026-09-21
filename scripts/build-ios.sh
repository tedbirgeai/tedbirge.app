#!/usr/bin/env bash
# Tedbirge® WebOS — iOS paketi (.ipa)
# Yalnız macOS + Xcode ortamında çalışır; imza olmadan .ipa üretilemez.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== iOS paketi (.ipa) =="

if [ "$(uname -s)" != "Darwin" ]; then
  echo "! .ipa yalnız macOS + Xcode ortamında üretilebilir." >&2
  exit 1
fi
command -v xcodebuild >/dev/null 2>&1 || {
  echo "! Xcode komut satırı araçları gerekir (xcodebuild bulunamadı)." >&2
  exit 1
}

bun run build
bunx cap sync ios

if [ ! -d ios ]; then
  echo "! ios/ klasörü yok: 'bunx cap add ios' ile bir kez oluşturun." >&2
  exit 1
fi

if [ -z "${APPLE_TEAM_ID:-}" ]; then
  echo "! APPLE_TEAM_ID yok: yalnız arşiv (xcarchive) üretilir, .ipa imzalanamaz." >&2
fi

ARCHIVE="build/Tedbirge.xcarchive"
mkdir -p build
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Release -sdk iphoneos -archivePath "$ARCHIVE" archive

if [ -n "${APPLE_TEAM_ID:-}" ]; then
  xcodebuild -exportArchive -archivePath "$ARCHIVE" \
    -exportOptionsPlist build/ios-export.plist -exportPath build/ipa
  echo "== Bitti: build/ipa/ altına bakın =="
else
  echo "== Arşiv hazır: $ARCHIVE (imza eklendikten sonra .ipa üretilir) =="
fi
