#!/usr/bin/env bash
# Tedbirge(R) WebOS — Gömülü Ofis Süreçleri Doğrulama Kapısı
#
# Faz 4 çıktısı (Writer, Sheets, Slides, PDF Studio, Notes, Organizer) ve
# şifreli sanal dosya sistemi (VFS) katmanı, donanım imajına GERÇEKTEN
# gömülmeden imaj üretilmemelidir. Bu kapı iki seviyede çalışır:
#
#   1) Kaynak seviyesi : kayıt, pencere eşlemesi, ikon ve VFS bağlantısı
#   2) Paket seviyesi  : build-iso/web içindeki üretilmiş JS varlıkları
#
# Kullanım:
#   bash scripts/verify-office-bundle.sh                 # yalnız kaynak
#   bash scripts/verify-office-bundle.sh build-iso/web   # kaynak + paket
set -uo pipefail
cd "$(dirname "$0")/.."

PAKET="${1:-}"
HATA=0

hata() {
  echo "::error::$1"
  HATA=1
}

OFIS_IDS=(writer sheets slides pdf notes organizer)

echo "== Gömülü ofis süreçleri: kaynak denetimi =="

# 1) Uygulama kataloğunda yerleşik olarak kayıtlı mı?
for id in "${OFIS_IDS[@]}"; do
  grep -q "id: \"$id\"" src/shell/installed.ts || hata "Ofis uygulaması kataloğa kayıtlı değil: $id"
done

# 2) Pencere yöneticisi (WorkspacePanel) her uygulamayı çizebiliyor mu?
for id in "${OFIS_IDS[@]}"; do
  grep -q "\"$id\"" src/components/shell/WorkspacePanel.tsx ||
    hata "Pencere eşlemesi yok: $id (WorkspacePanel)"
done

# 3) Başlatıcı ve masaüstü ikonu tanımlı mı?
for id in "${OFIS_IDS[@]}"; do
  grep -qE "(\"$id\"|(^|[[:space:]])$id:)" src/components/shell/AppLauncher.tsx ||
    hata "Başlatıcı kaydı yok: $id"
  grep -qE "(\"$id\"|(^|[[:space:]])$id:)" src/components/shell/app-icons.tsx ||
    hata "İkon eşlemesi yok: $id"
done

# 4) Uygulama dosyaları mevcut mu?
for f in WriterApp SheetsApp SlidesApp PdfStudioApp NotesApp OrganizerApp OfficeFrame; do
  test -s "src/components/shell/apps/office/$f.tsx" || hata "Ofis bileşeni eksik: $f.tsx"
done

# 5) Veri katmanı yalnızca VFS'e yazıyor mu (bulut/harici uç yok)?
test -s src/lib/office/documents.ts || hata "Ofis veri katmanı yok: src/lib/office/documents.ts"
grep -q "writeDocument" src/lib/vfs/store.ts || hata "VFS belge yazma API'si yok (writeDocument)"
grep -q "readDocument" src/lib/vfs/store.ts || hata "VFS belge okuma API'si yok (readDocument)"
if grep -nE "https?://|supabase|fetch\(" src/lib/office/documents.ts \
  src/components/shell/apps/office/*.tsx >/dev/null 2>&1; then
  grep -nE "https?://|supabase|fetch\(" src/lib/office/documents.ts \
    src/components/shell/apps/office/*.tsx || true
  hata "Ofis süreçleri çevrimdışı olmalı — harici ağ çağrısı bulundu."
fi

# 6) Paket seviyesi: imaja gömülecek arayüzde ofis kodu var mı?
if [ -n "$PAKET" ]; then
  echo "== Gömülü ofis süreçleri: paket denetimi ($PAKET) =="
  if [ ! -d "$PAKET" ]; then
    hata "Paket dizini yok: $PAKET"
  else
    for imza in ".tbw" ".tbs" ".tbp" ".tbn" ".tbo"; do
      if ! grep -rqF "$imza" "$PAKET" 2>/dev/null; then
        hata "İmaj paketinde ofis belge türü imzası yok: $imza"
      fi
    done
    for etiket in "Yazı belgesi" "Hesap tablosu" "PDF"; do
      grep -rqF "$etiket" "$PAKET" 2>/dev/null ||
        hata "İmaj paketinde ofis arayüz metni yok: $etiket"
    done
  fi
fi

if [ "$HATA" -ne 0 ]; then
  echo "OFIS_KAPISI_BASARISIZ"
  exit 1
fi
echo "OFIS_KAPISI_OK — 6 ofis süreci ve VFS katmanı imaja gömülmeye hazır."
