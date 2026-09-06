#!/bin/sh
# Bagli tum ekranlari etkinlestirir; ilki ana ekran, digerleri sagina dizilir.
command -v xrandr >/dev/null 2>&1 || exit 0
prev=""
xrandr --query | awk '/ connected/{print $1}' | while read -r out; do
  if [ -z "$prev" ]; then
    xrandr --output "$out" --auto --primary
  else
    xrandr --output "$out" --auto --right-of "$prev"
  fi
  prev="$out"
done
exit 0
