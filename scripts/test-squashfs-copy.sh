#!/usr/bin/env bash
# Kurucunun sistem kopyalama komutunu GERÇEKTEN çalıştırır.
# Amaç: "unsquashfs yardım ekranı" hatasının bir daha asla üretilememesi.
# Yıkıcı değildir: yalnız geçici dizinlerde çalışır, hiçbir diske dokunmaz.
set -euo pipefail
cd "$(dirname "$0")/.."

KUR=image/install/tedbirge-kur

command -v mksquashfs >/dev/null 2>&1 || { echo "::error::mksquashfs yok"; exit 1; }
command -v unsquashfs >/dev/null 2>&1 || { echo "::error::unsquashfs yok"; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/kaynak/usr/lib/systemd" "$TMP/kaynak/etc"
printf 'test\n' > "$TMP/kaynak/etc/ornek.conf"
printf '#!/bin/sh\n' > "$TMP/kaynak/usr/lib/systemd/systemd"
chmod +x "$TMP/kaynak/usr/lib/systemd/systemd"
for i in $(seq 1 50); do printf 'veri %s\n' "$i" > "$TMP/kaynak/etc/dosya-$i"; done

mksquashfs "$TMP/kaynak" "$TMP/filesystem.squashfs" -noappend >/dev/null

# 1) Kurucunun kullandığı bütünlük doğrulaması gerçekten çalışıyor mu?
unsquashfs -s "$TMP/filesystem.squashfs" > "$TMP/super.txt" 2>&1 \
  || { echo "::error::unsquashfs -s desteklenmiyor"; cat "$TMP/super.txt"; exit 1; }
grep -q 'Number of inodes' "$TMP/super.txt" \
  || { echo "::error::inode sayısı okunamadı — ilerleme hesabı çalışmaz"; exit 1; }

# 2) Kurucunun kullandığı kopyalama komutu (tam olarak aynı seçenekler).
if ! unsquashfs -f -i -d "$TMP/hedef" "$TMP/filesystem.squashfs" > "$TMP/kopya.log" 2>&1; then
  echo "::error::Kopyalama komutu başarısız — kurulum kullanıcıda da başarısız olur."
  tail -n 30 "$TMP/kopya.log"
  exit 1
fi

# 3) Araç yardım/kullanım ekranına düşmüş olmamalı (asıl saha hatası buydu).
if grep -qiE 'SYNTAX:|Usage: *unsquashfs|Filesystem extractor' "$TMP/kopya.log"; then
  echo "::error::unsquashfs kullanım/yardım ekranı üretti — desteklenmeyen seçenek var."
  head -n 20 "$TMP/kopya.log"
  exit 1
fi

# 4) Kopya gerçekten açılmış mı?
[ -x "$TMP/hedef/usr/lib/systemd/systemd" ] || { echo "::error::hedefte init yok"; exit 1; }
[ -s "$TMP/hedef/etc/ornek.conf" ] || { echo "::error::hedefte dosyalar eksik"; exit 1; }

# 5) İlerleme sayacı: -i çıktısından satır sayılabiliyor mu?
SATIR=$(wc -l < "$TMP/kopya.log")
[ "$SATIR" -gt 10 ] || { echo "::error::ilerleme için yeterli çıktı üretilmiyor"; exit 1; }

# 6) Kurucu betiği hâlâ aynı komutu kullanıyor mu?
grep -q 'unsquashfs -f -i -d' "$KUR" \
  || { echo "::error::kurucu bu testte doğrulanan komutu kullanmıyor"; exit 1; }
grep -q -- '-percentage' "$KUR" \
  && { echo "::error::kurucuda desteklenmeyen -percentage seçeneği var"; exit 1; }

echo "✓ Sistem kopyalama komutu gerçek squashfs üzerinde doğrulandı ($SATIR öğe)."
