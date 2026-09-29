# Faz 4 — Ofis Paketi, Arama ve Çekirdek Uygulamalar

## Kaynakta doğrulanan mevcut durum
- Spotlight (259 satır): Ctrl/Cmd+K ve Alt+Boşluk ile açılıyor, 20 ms gecikmeli odak var; uygulama, VFS dosyası ve bazı komutları arıyor. Super tuşu şu an uygulama çekmecesine bağlı (Faz 3).
- Writer (365 satır): `document.execCommand` tabanlı düzenleyici; A4 sayfa/cetvel yok.
- Sheets (366 satır): tek satırlık formül değerlendirici (SUM/AVERAGE/MIN/MAX/COUNT/IF/ROUND), iç içe formül ve grafik yok, sürükleyerek çoğaltma yok.
- PDF Studio (440 satır): pdfjs zaten kendi worker'ında çalışıyor; sayfalar tek seferde render ediliyor, metin arama yok.
- Messenger: tek dosya, 1225 satır.
- Terminal (139 satır): geçmiş API'si var; ANSI renk ve `|` boru hattı yok.

## Yapılacaklar
1. Spotlight
   - Açılışta `requestAnimationFrame` ile odak + odak kilidi (Tab döngüsü panel içinde, dışarı tıklamada kapanma).
   - Super tuşu davranışı korunur (çekmece); Spotlight Ctrl/Cmd+K'de kalır. Çekmece arama kutusu da otomatik odaklanır.
   - Arama kaynakları: uygulamalar, VFS dosyaları, yeni ayar dizini (`settings-index.ts`: tema, ses, duvar kâğıdı, ağ, güvenlik...). Sonuçlar gruplu, ok tuşu gezinmeli, puanlı bulanık eşleşme.
2. Writer
   - A4 (210×297 mm) sayfa görünümü, yatay cetvel (kenar boşluğu gösterimi), yakınlaştırma.
   - Araç çubuğu: kalın/italik/altı çizili, H1–H3/paragraf, hizalama, liste; aktif durum göstergesi.
   - Dışa aktarma: PDF (yazdırma iframe'i, @page A4) ve Word (.doc HTML paketi, bağımlılık yok). Girdi HTML'i temizlenir.
3. Sheets
   - Formül motoru ayrı modüle (`formula.ts`): ayrıştırıcı + değerlendirici; iç içe fonksiyonlar, aralık ve hücre referansları, karşılaştırma, döngüsel başvuru hatası (#CYCLE), #DIV/0, #REF.
   - Fare ile aralık seçimi, doldurma tutamacıyla sürükleyerek çoğaltma (göreli referans kaydırma, sayı serisi).
   - Seçili aralıktan çubuk/çizgi grafik (bağımlılıksız SVG), sayfa üzerinde panel.
4. PDF Studio
   - Sayfa sanallaştırma: yalnız görünür sayfalar IntersectionObserver ile render, iptal edilebilir render görevleri, OffscreenCanvas destekleniyorsa kullanılır.
   - Araç çubuğu: önceki/sonraki sayfa, sayfa numarası girişi, metin arama (pdfjs getTextContent, eşleşme sayısı ve sonrakine atla, vurgulama).
5. Messenger
   - Monolit 1225 satır; `components/messenger/` altında ConversationList, MessageList, Composer, EmojiPicker, hooks'a bölünür, davranış korunur.
   - Composer odağı: kararlı bileşen kimliği (yeniden mount yok), gönderim sonrası ve sohbet değişiminde odak geri alınır.
   - Bağımlılıksız emoji seçici (kategoriler, arama, son kullanılanlar yerelde).
   - Geçmiş: tarih ayırıcıları, grup baloncukları, yukarı kaydırmada korunan konum, "yeni mesajlar" düğmesi.
6. Terminal
   - ANSI SGR ayrıştırıcı (`ansi.ts`: 16 renk, 256 renk, kalın) → güvenli span render (HTML enjeksiyonu yok).
   - Yukarı/Aşağı geçmiş gezintisi, geçerli satır taslağı korunur.
   - Boru hattı: `cmd | grep x | head -n | wc -l | sort` gibi yerleşik filtreler; komut çıktısı metin akışı olarak aktarılır.

## Test ve doğrulama
- Yeni Vitest: formula (iç içe, döngü, hatalar), doldurma kaydırma, ansi ayrıştırıcı, pipe motoru, settings arama puanlama, Writer HTML temizleme/dışa aktarma çıktısı.
- `bunx tsgo --noEmit` ve tüm Vitest süiti.
- Playwright: Ctrl+K sonrası anında yazma, Sheets formül + sürükle, Terminal ok geçmişi ve pipe, Messenger gönderim sonrası odak.

## Teknik notlar
- Yeni bağımlılık eklenmez (CDN yasağı ve paket boyutu); grafik/emoji/ANSI yerel.
- Tüm renkler `--tb-*` değişkenlerinden; sabit hex yok.
- Uygulamalar arası etkileşim yalnız desktop IPC üzerinden.
