#!/usr/bin/env bash
# Tedbirge® WebOS — Android paketi (.apk)
# Mevcut Capacitor yapılandırması (capacitor.config.ts) kullanılır.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Android paketi (.apk) =="

if [ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]; then
  echo "! ANDROID_HOME / ANDROID_SDK_ROOT tanımlı değil: Android SDK gerekir." >&2
  exit 1
fi
command -v java >/dev/null 2>&1 || {
  echo "! JDK 17 gerekir (java bulunamadı)." >&2
  exit 1
}

bun run build
bunx cap sync android

if [ ! -d android ]; then
  echo "! android/ klasörü yok: 'bunx cap add android' ile bir kez oluşturun." >&2
  exit 1
fi

if [ -n "${ANDROID_KEYSTORE:-}" ]; then
  echo "== İmzalı sürüm derleniyor =="
  (cd android && ./gradlew assembleRelease)
else
  echo "! İmza anahtarı yok (ANDROID_KEYSTORE): imzasız debug paketi üretilir." >&2
  (cd android && ./gradlew assembleDebug)
fi

echo "== Bitti: android/app/build/outputs/apk/ altına bakın =="
