# Tedbirge® WebOS Masaüstünü Ana Ekran Yapma

Bugün `/` adresi doğrudan Messenger'ı tam ekran açıyor; pencere yöneticisi, görev çubuğu ve uygulama kataloğu yalnızca `/app` altında çalışıyor. Amaç: kullanıcıyı masaüstü karşılasın, sohbet de diğer uygulamalar gibi bir pencere olsun.

## Yapılacaklar

### 1. Ana sayfa artık masaüstü
- `src/routes/index.tsx` Messenger yerine kabuk + masaüstünü render eder (`ShellProvider` + masaüstü paneli), `/app` ile aynı davranış.
- Rota `ssr: false` olur (pencere yöneticisi tarayıcı durumuna bağlı), başlık/meta etiketleri mevcut haliyle korunur.
- `/app` rotası aynı masaüstüne yönlenen ikinci giriş olarak kalır (eski bağlantılar kırılmaz).

### 2. Masaüstü + Başlatıcı düzeni
- Masaüstü boş bir çalışma yüzeyi olur: ortada sabit uygulama ızgarası yerine pencerelerin açıldığı alan.
- Alt görev çubuğunun soluna belirgin bir **Uygulamalar** (başlatıcı) düğmesi eklenir; tıklanınca yerel modüller (Sohbet, Müzik, Medya, Dosyalar, Aktarım, Ağ, Röle) ve web uygulamaları (Google, YouTube, X, LinkedIn, TikTok, Harita, Bilgi, Arama) tek ızgarada listelenir.
- Izgaradan seçilen her uygulama masaüstünde bağımsız, sürüklenebilir `WindowFrame` penceresi olarak açılır; başlatıcı kapanır.
- Sohbet de bu pencerelerden biri olarak çalışır (hâlihazırdaki tembel yüklenen Messenger yüzeyi).
- Masaüstünde hiç pencere yokken kısa bir karşılama ipucu ("Uygulamalar ile başlayın") gösterilir.

### 3. Mobil davranış
- Mobilde (<768px) pencere yöneticisi yerine mevcut tam ekran PWA kılıfı korunur; başlatıcı ızgarası tam ekran açılır, seçilen uygulama tam ekran gösterilir.

### 4. Doğrulama
- `bunx tsgo --noEmit` 0 hata.
- Önizlemede `/` açıldığında sohbet paneli değil masaüstü + görev çubuğu görünür; başlatıcıdan açılan uygulama pencere olarak gelir.

## Teknik notlar
- Dosyalar: `src/routes/index.tsx`, `src/routes/app.tsx`, `src/components/shell/WorkspacePanel.tsx`, `src/components/shell/Taskbar.tsx` (+ yeni `AppLauncher` bileşeni).
- Pencere durumu mevcut `src/shell/windows.ts` mağazasından okunur; yeni durum katmanı eklenmez.
- Web hedefleri `src/shell/web-apps.ts` kataloğundan üretilir; bileşene marka adı gömülmez.
- Renkler `--tb-*` token'larından okunur, sabit hex kullanılmaz.
