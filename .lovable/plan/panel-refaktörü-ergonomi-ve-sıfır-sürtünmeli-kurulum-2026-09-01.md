# Panel Refaktörü, Ergonomi ve Sıfır-Sürtünmeli Kurulum

## 1. Panel uygulaması: kopuk bağlantıların onarımı

`PanelApp.tsx` (966 satır) hâlâ eski web-sitesi döneminden kalma parçalar taşıyor:

- `MobileStationCard` içindeki mobil erişim linki silinmiş `/saha` rotasına
  işaret ediyor (`${origin}/saha`) — tarayıcıda açıldığında 404. Kart, WebOS
  kabuğunda anlamlı olan "Uygulamayı kur (PWA)" + kabuk adresi akışına
  çevrilecek; `navigator.clipboard` çağrısı başarı/hata bildirimi (`notifyOk` /
  `notifyError`) verecek şekilde bağlanacak.
- Panel içi `Link to="/saha-raporu"`, `/api-dokumantasyon`, `/yonetim`
  bağlantıları `OsLink` üzerinden pencere açıyor; ancak `/saha-raporu` ve
  `/yonetim` "panel" uygulamasına, yani kendisine dönüyor. Bunlar doğru
  sekmeye geçen buton hâline getirilecek (`setTab("kalibrasyon")`,
  `setTab("yonetim")`), `/api-dokumantasyon` ise Sistem Bilgisi penceresini
  açacak.
- `openPortal` / `portalBusy` durumu tanımlı ama Genel bakış'ta bir düğmeye
  bağlı değil; "Planı yönet" düğmesi yalnızca sekme değiştiriyor. Abonelik
  varsa gerçek Paddle portalını açacak, yoksa Mağaza penceresini açacak
  şekilde bağlanacak. `try/finally` içine hata bildirimi eklenecek.
- Panel alt bileşenleri (`PanelOps`, `PanelMesh`, `PanelSecure`, `PanelLive`,
  `PanelSystem`, `PanelAi`, `PanelCommerce`, `PanelEnergy`,
  `PanelNetworkMap`, `PanelSections`, `DiagnosticsPanel`) tek tek taranacak;
  bulunan atıl değişken/fonksiyon, kullanılmayan import ve tıklandığında
  hiçbir şey yapmayan buton ya çalışır hâle getirilecek ya da kaldırılacak.
  Sahte/sabit veriyle beslenen kartlar canlı kaynağa (Supabase sorgusu,
  düğüm çalışma zamanı, HAL telemetrisi) bağlanacak; canlı karşılığı
  olmayanlar "veri yok" boş durumuna çevrilecek — uydurma değer gösterilmez.
- Oturum yokken korumalı sunucu fonksiyonlarının 401 üretmemesi için mevcut
  oturum kontrolü deseni tüm panel çağrılarında tek tipleştirilecek.

## 2. ISO 9241 / Nielsen ergonomisi

- Panel sekme şeridi ve tüm panel düğmeleri en az 48×48 px dokunma alanına
  çıkarılacak (`min-h-12`), sekme şeridi yatay kaydırmada dokunma dostu
  olacak, gövde `overflow-y-auto` + safe-area alt boşluğu koruyacak.
- Panel hâlâ eski site renk sınıflarını (`text-primary`, `bg-card/50`,
  `border-border`) kullanıyor. Bunlar kabuğun `--tb-*` token'larına
  taşınacak ve panel `WindowShell` başlık/araç şeridi düzenine uydurulacak
  (tek tip pencere kabuğu ilkesi).
- Yükleme, boş ve hata durumları her sekmede görünür olacak (sistem
  durumunun görünürlüğü).
- Masaüstü ızgarası (`Desktop.tsx`, `DesktopIcon.tsx`) hâlihazırda katı
  dikey CSS Grid; bu yapı korunacak, yalnızca üst üste binmeyi tetikleyecek
  bir regresyon olmadığı doğrulanacak.

## 3. Kurulum kiti (kur.bat / kur-indir.ps1)

`src/routes/api/public/iso.ts` içinde:

- `buildKitBat` istenen kabuğa çevrilecek: `chcp 65001`, başlık ve
  `cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kur-indir.ps1""`
  ile pencere hiçbir senaryoda kapanmayacak; WSL yolu PowerShell betiği
  içinden opsiyonel olarak denenecek, sonda `pause` kalacak.
- `buildKitPs1` sonuna `Read-Host` beklemesi eklenecek; mesajlar `[1/3]`,
  `[2/3]`, `[3/3]` adımlı sade Türkçe olacak; WSL yoksa doğrudan canlı
  sunucudan (`https://tedbirge-app.lovable.app`) paket indirilecek.
- İndirme rehberine (`BareMetalIso.tsx`) betik çalıştırmak istemeyenler için
  ikinci bir seçenek eklenecek: doğrudan `.iso` bağlantısı. Yayın paketinde
  gerçek imaj olduğunda dosya tarayıcıdan iner; imaj henüz yayınlanmadığında
  düğme dürüst bir açıklama gösterir ("hazır imaj henüz yayında değil,
  kurulum kitini kullanın") — sahte `.iso` üretilmez, bu mevcut ilke korunur.

## 4. Doğrulama

- `bunx tsgo --noEmit` sıfır hata.
- `bunx vitest run` tüm testler geçer.
- Panel penceresi tarayıcıda açılıp her sekme tıklanarak hata konsolu
  temiz doğrulanır; ISO uç noktası çağrılıp ZIP içindeki `kur.bat` ve
  `kur-indir.ps1` metni gözle kontrol edilir.
