# Ofis Paketi Onarımı — Sheets Veri Girişi, Writer, Slides, Organizer

## Mevcut durum (önceki kaynak incelemesinde doğrulandı)
- Sheets hücreleri `<button>`; yalnız ok tuşlarını dinliyor, yazılan karakter hücreye düşmüyor. Değer yalnız üstteki formül çubuğundan girilebiliyor.
- Writer: font ailesi/boyutu ve renk seçici yok, arama/değiştir yok.
- Slides: metin kutuları tuvalde doğrudan düzenlenemiyor.
- Organizer: kart ekleme `window.prompt` ile yapılıyor, öncelik alanı yok.

## Yapılacaklar

### 1. Sheets
- Hücre içi düzenleyici: çift tıklama, F2 veya harf/rakam/`=` tuşuyla seçili hücrenin üstünde `<input>` açılır (tuşla açılışta ilk karakter yazılır, F2'de mevcut değer korunur).
- Klavye: Enter aşağı, Shift+Enter yukarı, Tab sağa, Shift+Tab sola, Esc iptal, Delete/Backspace hücreyi temizler, oklar gezinir. Formül çubuğu ve hücre düzenleyici aynı taslağı paylaşır.
- Hücre biçimi: Genel / Sayı / Para (₺, $, €) / Yüzde; Sol/Orta/Sağ hizalama. Biçimler hücre başına saklanır; görüntüleme `Intl.NumberFormat("tr-TR")` ile.
- Sütun genişliği: başlık kenarından sürükleyerek (min 48 px), belgeye kaydedilir.
- Belge biçimi: mevcut düz CSV geriye uyumlu okunur; yeni kayıt `{ v: 2, cells, formats, widths }` JSON.
- İçe/dışa aktarma: CSV (formül enjeksiyonuna karşı `=,+,-,@` önekli değerler dışa aktarmada kaçışlanır) ve XLSX. XLSX yeni bağımlılık olmadan: yazma için sıkıştırmasız ZIP + minimal OOXML, okuma için tarayıcının `DecompressionStream("deflate-raw")` ile ZIP çözümü ve `sharedStrings`/`sheet1` ayrıştırması.

### 2. Writer
- Şeride Font Ailesi ve Font Boyutu açılır menüleri, metin rengi ve vurgu rengi paleti (renkler `--tb-*` tabanlı palet).
- Ctrl+F / Ctrl+H: Bul-Değiştir paneli — eşleşme sayısı, önceki/sonraki, büyük-küçük harf seçeneği, Değiştir / Tümünü Değiştir; metin düğümleri üzerinde çalışır, HTML yapısını bozmaz.

### 3. Slides ve Organizer
- Slides: metin kutusuna çift tıklamada yerinde düzenleme (`contentEditable`, blur/Esc ile kaydet, yapıştırmada düz metin). Seçili şekil için dolgu rengi ve opaklık (0–100) seçici.
- Organizer: `window.prompt` tamamen kaldırılır; başlık, tarih, sütun, öncelik (Düşük/Orta/Yüksek/Kritik) ve not alanlı modal ile ekleme/düzenleme. Kartlarda renkli öncelik etiketi; eski kayıtlar öncelik "Orta" kabul edilerek okunur.

## Test ve doğrulama
- Vitest: Sheets v1→v2 belge dönüşümü, sayı/para/yüzde biçimleyici, CSV kaçışlama, XLSX yazma→okuma gidiş-dönüş, Writer bul/değiştir metin motoru, Organizer eski kayıt dönüşümü.
- `bunx tsgo --noEmit` ve `bunx vitest run` tam süit.
- Playwright: Sheets'te hücre seçip yazma, Enter/Tab gezinmesi, `=SUM(...)` sonucu; Organizer modalıyla kart ekleme.

## Teknik notlar
- Yeni paket eklenmez; tüm renkler `--tb-*` değişkenlerinden.
- Yardımcılar ayrı modüllere: `sheet-format.ts`, `sheet-io.ts` (CSV/XLSX), `find-replace.ts`.
