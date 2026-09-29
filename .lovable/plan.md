# Faz 5 — Dinamik Duvar Kağıdı, Pencere Uyku Modu, Saat/Bildirim Merkezi

## Kaynakta doğrulanan mevcut durum
- `src/lib/ui/wallpaper.ts`: 8 sabit duvar kağıdı (görsel veya tema gradyanı), parlaklık ve gece ışığı CSS değişkenleri. Canvas/dinamik duvar kağıdı, saate göre otomatik geçiş ve kullanıcı görseli yok.
- `ControlCenter.tsx`: ses, parlaklık ve gece ışığı sürgüleri zaten çalışıyor; ses sürgüsü sistem seslerine bağlı (`audio.ts` → `getVolume`). Ağ satırı yalnız durum gösteren ve ağ penceresini açan bir düğme; açma/kapama anahtarı yok.
- `NotificationsPanel.tsx`: zil ikonundan açılan bildirim listesi (okundu/temizle) mevcut. Takvim widget'ı yok.
- Saat, üst çubukta (`SystemBar.tsx`) tıklanamayan bir metin; sağ alt köşede saat alanı yok.
- `WindowFrame.tsx`: küçültülen pencere yalnız `visibility:hidden` ile gizleniyor, içerik çalışmaya devam ediyor. `.tbos-window` her pencerede kalıcı `will-change: transform` taşıyor (her pencere için ayrı GPU katmanı).

## Yapılacaklar

### 1. Dinamik duvar kağıdı
- Yeni seçenekler: "Canlı Akış" (mesh gradyan) ve "Canlı Parçacık". Tek `<canvas>` bileşeni (`DynamicWallpaper.tsx`), 2D Canvas ile (WebGL yoksa da çalışır), cihaz piksel oranı 1.5 ile sınırlı, 30 FPS hedefli.
- Renkler `--tb-*` değişkenlerinden okunur; saat dilimine göre gündüz/akşam/gece paleti yumuşak geçişle değişir.
- "Otomatik (gün/gece)" anahtarı: 07:00–19:00 arası açık duvar kağıdı + Kristal tema, dışında koyu duvar kağıdı + Gece tema; dakikada bir kontrol.
- Sekme gizliyken, pil tasarrufu (`prefers-reduced-motion`) veya tam ekran pencere varken animasyon durur.

### 2. Kullanıcı duvar kağıdı
- Ayarlar > Görünüm'e "Kendi görselim" alanı: bilgisayardan yükle veya Dosyalar'daki (VFS) bir görseli seç.
- Görsel küçültülüp (en fazla 2560 px, JPEG) cihazda saklanır; `blob:` adresiyle uygulanır, eski adres serbest bırakılır.

### 3. Pencere uyku modu ve GPU denetimi
- Küçültülen veya 60 sn boyunca tamamen arkada kalan pencere "uyur": gövdeye `content-visibility: hidden` uygulanır, `requestAnimationFrame` kullanan uygulamalara `useWindowSuspended()` ile duraklama sinyali gider. Müzik/aktarım/sohbet gibi arka plan işleri etkilenmez (DOM sökülmez).
- Gömülü web görünümleri uyurken `inert` yapılır.
- `will-change: transform` kalıcıdan çıkarılır; yalnız sürükleme/boyutlandırma sırasında eklenir. `contain: paint layout` korunur. Diğer kalıcı `will-change` kullanımları gözden geçirilir.
- Çerçeve süresini ölçen geliştirici göstergesi (Sistem Bilgisi'nde FPS). "60+ FPS garantisi" cihaza bağlıdır; ölçümle raporlanır, garanti olarak yazılmaz.

### 4. Saat, takvim ve bildirim merkezi
- Üst çubuktaki saat tıklanabilir olur; masaüstü düzeninde sağ alt köşeye de bir saat/tarih alanı eklenir. Tıklamada açılan panel: aylık takvim (ay ileri/geri, bugün vurgusu, Organizer kartları olan günlerde nokta) ve altında bildirim geçmişi (mevcut bildirim listesi yeniden kullanılır).
- Hızlı Ayarlar: ses/parlaklık/gece ışığı korunur; gece ışığına tek dokunuşla aç/kapa anahtarı ve "gün batımında otomatik" seçeneği; Ağ (P2P röle) ve WebRTC eş bağlantısı için gerçek açma/kapama anahtarları — servis kayıt defteri üzerinden durdurma/başlatma.

### 5. Doğrulama
- Vitest: gün/gece saat eşlemesi, duvar kağıdı durumunun kaydı/yüklenmesi, uyku zamanlayıcısı, takvim ızgarası üretimi, ağ anahtarının servis durumuna etkisi.
- `bunx tsgo --noEmit`, `bunx vitest run`, `bun run build`.
- Playwright: canlı duvar kağıdı canvas'ının çizmesi, küçültülen pencerenin uyku durumu, saat tıklamasıyla takvim/bildirim paneli, hızlı ayar anahtarları.

## Teknik notlar
- Yeni paket yok; WebGL yerine 2D Canvas tercih edilir (önizleme ortamında GPU yok, tüm cihazlarda çalışır).
- Arka plan servislerinin durdurulması yalnız `src/shell/services/services.ts` üzerinden; uygulamalar arası sinyal desktop IPC ile.
- Tüm renkler `--tb-*` değişkenlerinden.
