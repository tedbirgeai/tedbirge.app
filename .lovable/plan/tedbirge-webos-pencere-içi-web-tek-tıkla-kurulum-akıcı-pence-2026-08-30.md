# Tedbirge® WebOS — Pencere İçi Web, Tek Tıkla Kurulum, Akıcı Pencere Fiziği

## Önce dürüst bir sınır

Google, YouTube (ana site), X ve TikTok gömülmeyi başlıkla engeller. Bunu aşmanın tek yolu, tüm sayfayı sunucumuz üzerinden yeniden yazan bir vekil (proxy) çalıştırmaktır. Bu yol:

- oturum açma, çerez ve doğrulama akışlarını bozar (giriş yapılamaz),
- bu servislerin kullanım şartlarını ihlal eder ve IP engeline yol açar,
- her arayüz değişikliğinde kırılır.

Bu yüzden "her siteyi zorla çerçeveye sok" yerine **pencereden hiç çıkmayan üç katmanlı** bir çözüm kuruyorum. Sonuç kullanıcı için aynı: hiçbir zaman "yeni sekmede aç" kartı görmez, içerik pencerede açılır.

## 1. Pencere içi web katmanı

`GenericAppContainer` yeniden yazılır; üç aşamalı otomatik strateji:

1. **Doğrudan çerçeve** — izin veren hedefler (Wikipedia, OpenStreetMap, DuckDuckGo HTML, Blockscout, IPFS, notlar) olduğu gibi yüklenir.
2. **Gömme dostu eşdeğer** — kataloğa `embedUrl` alanı eklenir: YouTube → `youtube-nocookie` gömme/arama görünümü, X → gömülebilir zaman tüneli görünümü, TikTok → resmi gömme oynatıcı, Google → gömmeye açık arama sağlayıcısı. Kullanıcı yine "YouTube" simgesine basar, içerik pencerede açılır.
3. **Tedbirge Geçidi (kendi vekilimiz)** — `/api/public/gecit` sunucu rotası: yalnız izin listesindeki, oturum gerektirmeyen, salt-okunur hedefler için HTML/varlık aktarımı yapar; `X-Frame-Options` ve `frame-ancestors` başlıklarını temizler, bağlantıları geçide yeniden yazar, POST/çerez/kimlik trafiğini geçirmez, boyut ve zaman aşımı sınırı uygular.

Hiçbir aşamada "pencerede açılamıyor" kartı gösterilmez. Yalnız üçü de başarısız olursa pencere içinde sade bir "içerik alınamadı — tekrar dene" durumu görünür; yeni sekme yalnızca pencere başlığındaki küçük ikincil ikondur.

## 2. Tek tıkla cihaza kurulum (PWA)

- Manifest ve servis çalışanı zaten var; eksik olan görünür kurulum yolu.
- Üst sistem çubuğuna ve masaüstü sağ tık menüsüne **"Sistemi Cihaza Kur"** düğmesi eklenir; mevcut kurulum deposu (`pwa-install`) kullanılır.
- Android/Chrome/Edge/Windows/macOS'ta yerel kurulum penceresi açılır; iOS Safari'de adım adım "Ana Ekrana Ekle" yönergesi gösterilir.
- Kurulu çalışırken düğme kendini gizler ve sistem çubuğunda "Cihaza kurulu" rozeti görünür.
- Not: kurulum yalnız yayınlanmış adreste çalışır, düzenleyici önizlemesinde tarayıcı izin vermez.

## 3. Pencere fiziği

- Sürükleme ve boyutlandırma `requestAnimationFrame` ile tek kareye indirgenir; sürüş sırasında tüm iframe'lere `pointer-events: none` verilir, böylece video/web görünümü imleci yutmaz ve donma olmaz.
- Kenara yapışma (snap): sol/sağ yarı, üst tam ekran, köşelerde çeyrek — sürüklerken şeffaf ön izleme çerçevesi.
- Kapat/simge durumu/tam ekran düğmelerine anında basma tepkisi, titreşim (destekleyen cihazda) ve yumuşak cam geçişi.
- Çift tıkla başlık çubuğu = tam ekran; simge durumundan Dock ile geri dönüş animasyonlu.

## Teknik notlar

- Yeni: `src/routes/api/public/gecit.ts` (izin listeli, salt-okunur, başlık temizleyen aktarım), `src/lib/shell/embed-strategy.ts`.
- Güncellenecek: `src/shell/web-apps.ts` (`embedUrl` + `proxy` alanları), `src/components/shell/GenericAppContainer.tsx`, `WindowFrame.tsx`, `SystemBar.tsx`, `Desktop.tsx`, `src/styles.css`.
- Doğrulama: `bunx tsgo --noEmit` 0 hata + Playwright ile Video/Arama/TikTok pencerelerinin içerik yüklediğinin ve pencere kontrollerinin çalıştığının ekran görüntüsüyle teyidi.
