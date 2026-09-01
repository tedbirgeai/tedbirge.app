#!/usr/bin/env bash
# ORTAK YOL ÇÖZÜCÜ — çalışma alanı (crates/target) ve tekil crate
# (crates/<ad>/target) düzenlerinin ikisini de destekler. Betikler bu
# yardımcıyı kullanır ki Cargo düzeni değişince imaj hattı kırılmasın.

# find_bin <ikili-ad> [hedef-üçlüsü]
# Bulursa yolu stdout'a yazar ve 0 döner; bulamazsa 1 döner.
find_bin() {
  local name="$1" triple="${2:-}" candidates=()
  if [ -n "$triple" ]; then
    candidates+=("crates/target/$triple/release/$name")
    candidates+=("crates/"*"/target/$triple/release/$name")
  fi
  candidates+=("crates/target/release/$name")
  candidates+=("crates/"*"/target/release/$name")
  local f
  for f in "${candidates[@]}"; do
    [ -x "$f" ] && { printf '%s\n' "$f"; return 0; }
  done
  return 1
}
