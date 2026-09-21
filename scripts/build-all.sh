#!/usr/bin/env bash
# Tedbirge® WebOS — tüm hedeflerin durum raporu.
#
# Bu betik hiçbir hedefi zorla derlemez: hangi hedefin bu makinede
# üretilebildiğini bildirir ve istenen hedefleri sırayla çalıştırır.
#   bash scripts/build-all.sh            → yalnız rapor
#   bash scripts/build-all.sh --run pwa  → belirtilen hedefi derler
set -uo pipefail
cd "$(dirname "$0")/.."

sistem="$(uname -s)"
var() { command -v "$1" >/dev/null 2>&1 && echo "evet" || echo "hayır"; }

echo "== Tedbirge® WebOS derleme hedefleri (sistem: $sistem) =="
printf '%-10s %-22s %s\n' "HEDEF" "ÇIKTI" "BU MAKİNEDE"
printf '%-10s %-22s %s\n' "pwa" "dist/" "$(var bun)"
printf '%-10s %-22s %s\n' "linux" ".AppImage" "$([ "$sistem" = Linux ] && var cargo || echo hayır)"
printf '%-10s %-22s %s\n' "windows" ".exe (NSIS)" "$(case "$sistem" in MINGW*|MSYS*|CYGWIN*) var cargo ;; *) echo hayır ;; esac)"
printf '%-10s %-22s %s\n' "macos" ".dmg" "$([ "$sistem" = Darwin ] && var cargo || echo hayır)"
printf '%-10s %-22s %s\n' "android" ".apk" "$([ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] && var java || echo hayır)"
printf '%-10s %-22s %s\n' "ios" ".ipa" "$([ "$sistem" = Darwin ] && var xcodebuild || echo hayır)"
printf '%-10s %-22s %s\n' "iso" ".iso" "$(var docker)"
echo
echo "Ayrıntılar: BUILD.md · hedef envanteri: build/targets.json"

if [ "${1:-}" != "--run" ]; then
  exit 0
fi
shift
kod=0
for hedef in "$@"; do
  echo
  echo "== $hedef =="
  case "$hedef" in
    pwa) bash scripts/build-pwa.sh || kod=1 ;;
    windows | macos | linux) bash scripts/build-desktop.sh "$hedef" || kod=1 ;;
    android) bash scripts/build-android.sh || kod=1 ;;
    ios) bash scripts/build-ios.sh || kod=1 ;;
    iso) bash scripts/build-iso-bundle.sh || kod=1 ;;
    *)
      echo "! Bilinmeyen hedef: $hedef" >&2
      kod=2
      ;;
  esac
done
exit "$kod"
