# Hotfix: LIMEN çökmesi, masaüstü yerleşimi, koyu tema okunurluğu, AXIOM SMT yönlendirmesi

## 1. LIMEN penceresinin sürekli çökmesi (React #185)

Kök neden doğrulandı: LIMEN ekranı durumu `useSyncExternalStore` ile okuyor, fakat `getLimenSnapshot()` her çağrıda yeni bir nesne (`records` dizisi dahil) üretiyor (`src/lib/limen/sync.ts:88-109`). React her karşılaştırmada "değişti" görüp sonsuz döngüye giriyor ve pencere hata kartına düşüyor.

Yapılacak:
- Anlık görüntü bir kez hesaplanıp önbellekte tutulacak; yalnızca gerçek bir değişiklik (delta eklenmesi, eşitleme, çevrimiçi/çevrimdışı durum, eş sayısı) olduğunda yenilenecek. Böylece aynı veri için aynı nesne döner ve döngü kırılır.
- Çevrimiçi/çevrimdışı olayları (`online`/`offline`) dinlenip önbellek tazelenecek; ekran kodu içinde render sırasında durum güncellemesi kalmayacak.
- `LimenApp` içinde her karede yeni işlev/nesne üreten yerler sadeleştirilecek; eşitleme işlemi yalnızca düğmeye basılınca çalışacak.
- Hata kartındaki "Uygulamayı Yeniden Başlat" düğmesi, yeniden başlatırken LIMEN'in yerel oturum durumunu da sıfırlayacak; böylece aynı hatayla tekrar açılmayacak.

## 2. Saat kartı ile simgelerin üst üste binmesi

Şu anda saat kartı masaüstünün sol üstünde serbest duruyor, simge ızgarası ise aynı alandan başlıyor (ekran görüntülerinde saatin altında kalan simgeler).

Yapılacak:
- Simge ızgarasına saat kartını boş bırakan bir başlangıç boşluğu verilecek: masaüstünde ilk satır saatin sağından, küçük ekranlarda saatin altından başlayacak.
- Boşluk sabit sayı olarak yazılmayacak; saat kartının ölçüsüne bağlı bir düzen değişkeninden okunacak, böylece 1K–4K ve telefon/tablet ekranlarında da çakışma olmayacak.
- Sağ üstteki bilgi kartları için mevcut güvenli alan korunacak.

## 3. Koyu temada simge isimleri ve eksik ikonlar

- Simge etiketleri her iki temada da okunur olacak: açık temada koyu metin, koyu temada açık metin, ikisinde de hafif gölge. Proje kuralı gereği sabit renk sınıfları yerine mevcut `--tb-*` renk değişkenleri kullanılacak (aynı görsel sonuç, tema kırılmadan).
- Etiketler iki satırda kesilmeye devam edecek, taşma olmayacak.
- Varsayılan/jenerik görünen uygulama simgeleri gözden geçirilip her uygulamaya anlamlı bir simge atanacak; eşleşmesi olmayanlar için tek tip "belge" yerine uygulama türüne uygun simgeler kullanılacak. Harici marka simgeleri yerel SVG olarak kalır (CDN yok).

## 4. AXIOM: SMT girdisi dil tanımaya gitmeyecek

Şu anda `declare-const`, `assert`, `check-sat` içeren girdi dil tanıma kurallarına düşüyor ve yanlış dil kartı gösteriliyor.

Yapılacak:
- Girdide SMT-LIB imzaları görüldüğünde girdi doğrudan "SMT-LIB" olarak sınıflandırılacak; bu kural diğer dil kurallarından önce çalışacak.
- SMT girdisinde dil tanıma kartı devre dışı bırakılıp yerine "SMT-LIB — doğrulayıcıya yönlendirildi" durumu gösterilecek.
- Girdi çeviri katmanını atlayıp doğrudan doğrulama motoruna `check-sat` olarak iletilecek. Gerçek Z3 WASM dosyası yoksa mevcut sözleşme korunur: uydurma mühür üretilmez, sonuç `422_UNDECIDED` olarak bildirilir.

## Teknik notlar

- Dosyalar: `src/lib/limen/sync.ts`, `src/components/limen/LimenApp.tsx`, `src/components/shell/AppErrorBoundary.tsx`, `src/components/shell/DesktopGrid.tsx`, `src/components/shell/DesktopItem.tsx`, `src/components/shell/Desktop.tsx`, `src/components/shell/app-icons.tsx`, `src/lib/axiom/lang/detect.ts`, `src/components/axiom/LanguageCard.tsx`, `src/components/axiom/AxiomApp.tsx`, `src/lib/axiom/verify/engine.ts`, `src/styles.css`.
- Renkler yalnız `--tb-*` değişkenlerinden; sabit hex/`text-slate-*` kullanılmaz.
- Doğrulama: `bunx tsgo --noEmit`, `bunx vitest run`, `bun run lint`, `bun run security:check`, build; ayrıca canlı önizlemede LIMEN penceresi açılıp çökmediği ve masaüstünde saat/simge çakışması olmadığı tarayıcı ile kontrol edilecek. SMT girdisi için yeni birim testi eklenecek.
