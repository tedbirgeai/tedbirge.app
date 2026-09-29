# Faz 1 — İkonografi ve Görsel Dil Devrimi

## Kaynakta doğrulanan mevcut durum

- Masaüstü, Dock, görev çubuğu, başlatıcı ve Mağaza aynı `AppIconSurface` / `AppIcon` hattını kullanıyor; değişiklikler tüm yüzeylere tek merkezden yayılabilir.
- `.tbos-app-icon` şu anda radyal parıltı, iki katmanlı koyu panel karışımı ve `::after` örtüsü kullanıyor; raporlanan mat/çift katmanlı görünüm bu kurallardan kaynaklanıyor.
- AXIOM, LIMEN, ofis ve temel sistem uygulamaları aynı genel `Frame` yapısını ve ağırlıklı olarak tek vurgu rengini kullanıyor.
- Harici katalog yerel SVG eşlemesine sahip. Google, WhatsApp, Spotify, YouTube, LinkedIn, X ve GitHub renkli çizilmiş; diğer desteklenen servislerin önemli bölümü hâlâ genel harfli simgeye düşüyor.
- İkonlara özel otomatik test bulunmuyor. Harici ikonlar ağdan veya CDN’den yüklenmiyor.

## Uygulama

### 1. Akrilik ikon kaidesi

- `AppIconBadge.tsx` içindeki ortak yüzeyi koruyup sistem ve marka ikonlarına ayrı, açıkça tanımlanmış yüzey rolleri vereceğim.
- `styles.css` içindeki mevcut radyal/koyu çift katmanlı arka planı ve çamurlu örtüyü kaldıracağım.
- Yerine tema tokenlarından beslenen yarı saydam akrilik yüzey, ince ışık kenarı, kontrollü iç parlama ve yumuşak derinlik gölgesi kuracağım.
- Marka logolarında renkleri kirleten kaplama olmayacak; sistem ikonlarında ise açık silüet ve tema uyumu korunacak.
- Açık Kristal, Soft ve Night temalarında kontrast; küçük Dock/görev çubuğu boyutlarında okunabilirlik korunacak.

### 2. Yerleşik uygulama ikon ailesi

- `app-icons.tsx` içindeki tek renkli genel `Frame` yaklaşımını uygulama ailelerine özgü yerel SVG ikonlarla değiştireceğim.
- AXIOM ve LIMEN için birbirinden ayırt edilen, derinlikli ve Tedbirge® WebOS’a özgü sistem logoları hazırlayacağım.
- Writer, Sheets, Slides, PDF Studio, Notes ve Organizer için belge türünü ilk bakışta ayıran canlı renk kimlikleri ve tutarlı ofis ailesi geometrisi oluşturacağım.
- Files, Settings, Store, Terminal, Computer, Profile ve Yönetim için net silüetli akrilik sistem ikonları tanımlayacağım.
- Mevcut kimlikler ve ortak `AppIcon` kullanımı değişmeyecek; pencere, masaüstü, Dock, başlatıcı ve Mağaza arasında ikon sapması oluşmayacak.

### 3. Harici servis logoları

- `BrandIcon.tsx` içindeki tüm katalog eşleşmelerini ayrı, renkli ve ölçekten bağımsız yerel SVG çizimlerine tamamlayacağım.
- Google, WhatsApp, Spotify, YouTube, LinkedIn, X, GitHub yanında DuckDuckGo, TikTok, OpenStreetMap, Wikipedia/Wiktionary, Tuta, Mozilla, Blockscout, IPFS, CoinGecko, Hacker News, OpenTopoMap, Open Library, arXiv ve Dontpad genel harfli yedeğe düşmeyecek.
- Logolar çevrimdışı çalışacak; uzak favicon, CDN veya üçüncü taraf logo servisi eklenmeyecek.
- Tanınmayan yeni katalog alan adları güvenli sistem yedeğini kullanmaya devam edecek.

### 4. Tasarım tokenları ve erişilebilirlik

- Gerekli uygulama renklerini yalnız `styles.css` içindeki `--tb-*` semantik tokenlarıyla tanımlayacağım; bileşenlere sabit renk eklemeyeceğim.
- SVG’lerde dekoratif ve anlamlı kullanım ayrımını, erişilebilir etiketleri ve mevcut klavye etkileşimlerini koruyacağım.
- Hareket eklenirse `prefers-reduced-motion` uyumlu ve yalnız hafif yüzey geri bildirimi seviyesinde olacak.

## Teknik kapsam

- Ana dosyalar: `src/components/shell/AppIconBadge.tsx`, `src/components/shell/app-icons.tsx`, `src/components/shell/BrandIcon.tsx`, `src/styles.css`.
- İkon eşlemesini güvenceye alan odaklı test dosyası eklenecek.
- Uygulama kimlikleri, katalog davranışı, pencere yönetimi, VFS, ağ, AXIOM doğrulama mantığı ve rotalar değişmeyecek.

## Doğrulama

1. `bunx tsgo --noEmit` ile tip denetimi.
2. `bunx vitest run` ile tüm test paketi ve yeni ikon eşleme testleri.
3. Canlı önizlemede masaüstü, Dock, başlatıcı ve Mağaza üzerinde ortak ikonların aynı göründüğünün kontrolü.
4. Açık Kristal ve Night temalarında masaüstü ile küçük Dock ikonlarının ekran görüntüsüyle kontrast kontrolü.
5. Harici katalogda adı geçen tüm servislerin genel yedeğe düşmeden yerel renkli SVG göstermesinin tarayıcı üzerinden doğrulanması.
