# Tedbirge® WebOS — Uygulamaların Uçtan Uca Mühürlenmesi

Amaç: 7 varsayılan uygulamanın tamamını alt sekmeleriyle, canlı verilerle ve ölü buton bırakmadan tamamlamak. Rust-Wasm çekirdeği, IndexedDB VFS ve pencere yöneticisi olduğu gibi korunur.

## Mevcut durum (kontrol edildi)

- Yerleşik uygulamalar: Sohbet, Dosyalar, Medya, Müzik, Mağaza, Bilgisayarım, Görünüm, Aktarım.
- Bilgisayarım zaten 5 sekmeli; canlı veri bağları var, tek tek gözden geçirilip sabit/maktu kalan değerler ayıklanacak.
- Aktarım şu an ayrı bir uygulama penceresi değil, bir iletişim kutusu (FileTransferDialog) olarak açılıyor.
- Dosyalar tek düz liste; klasör, arama, önizleme ve eylem menüsü yok.
- Medya ve Müzik VFS'e bağlı değil; sadece cihazdan dosya seçiyor.
- Mağaza kategori sekmeleri var; Görünüm tek ekran (duvar kâğıdı) hâlinde.
- VFS deposunda klasör alanı yok; dosyalar düz kayıt olarak tutuluyor.

## Yapılacak işler

### 1. Bilgisayarım
Beş sekmeyi baştan sona doğrula: sabit sayı bırakma, uptime ve bellek grafiğini canlı örnekleme, depolama çubuğunu `navigator.storage.estimate()` ile tazele, kalıcı depolama anahtarı, önbellek temizleme, dışa/içe aktarma. Ağ sekmesinde 4 mod, eş listesi ve canlı aktarım sayacı. Uygulamalar sekmesinde 7 uygulamanın durumu, VFS izi ve "sıfırla" eylemi. Ayarlar sekmesinde tema, gece filtresi, ses kazancı.

### 2. Dosyalar
VFS kaydına klasör alanı eklenir (mevcut kayıtlar "Belgeler" varsayılır, veri kaybı yok). Sol tarafta dizin ağacı (Belgeler, Görseller, Medya, İndirilenler), üstte arama, sağda seçili dosya detay/önizleme paneli (metin, görsel, ses, video). Sağ tık menüsü: yeniden adlandır, klasöre taşı, dışa aktar, sil. Sohbet ve Medya pencerelerine sürükle-bırak korunur.

### 3. Medya ve Müzik
Üç bölüm: Oynatıcı, Çalma Listesi, Yerel Kütüphane (VFS'teki ses/video dosyaları). VFS'ten tek dokunuşla oynatma, ilerleme ve ses denetimi, dosya yokken görsel boş durum kartı.

### 4. Sohbet
Üç bölüm: Aktif Sohbetler, Eş Bulma, Güvenlik (E2EE rozetleri). Ağ kesikken gönderilen mesajlar yerel kuyruğa yazılır, bağlantı gelince otomatik iletilir. Sürüklenen VFS dosyası sohbet balonunda indirme/önizleme kartı olur.

### 5. Mağaza
Sekmeler: Tümü, WebOS Yerel Araçlar, PWA Servisleri. Her kartta "Çalıştır" ve "Masaüstüne Ekle"; kırık bağlantı ve işlevsiz kart bırakılmaz.

### 6. Aktarım
Kendi penceresi olan bir uygulamaya dönüşür: Aktif İndirmeler, Yüklemeler, Geçmiş sekmeleri; canlı hız (MB/s), duraklat/iptal, boş durumda bilgi kartı.

### 7. Görünüm
Sekmeler: Duvar Kâğıdı Galerisi, Tema Paletleri, Yazı Tipi Boyutu. Seçim anında masaüstüne ve `--tb-*` değişkenlerine yansır.

### 8. Web Kabuğu ve Off-Grid
Adres çubuğu yalnızca hedef alan adını gösterir (iç geçit yolu gizli), "Geçit" ve "Tedbirge Web Kabuğu · domain" rozetleri, Tam Gizlilik modunda iframe tamamen kapalı + bilgi kartı.

### 9. Hijyen
Ölü buton bırakılmaz; tamamlanmamış eylemler Tedbirge OS bildirim kartı verir. Sağ tık OS menüsü, `ESC` aktif pencereyi kapatır, `Ctrl+Space` Spotlight açar.

## Teknik notlar

- `src/lib/vfs/store.ts`: şema v6 — `folder` alanı, klasör listeleme/taşıma ve tür bazlı sorgu yardımcıları. Yükseltmede mevcut kayıtlara varsayılan klasör atanır.
- Yeni: `src/components/shell/apps/TransfersApp.tsx`, `src/lib/vfs/preview.ts`, sohbet için çevrimdışı kuyruk modülü.
- Güncellenecek: `FilesApp`, `MediaApp`, `MusicApp`, `StoreApp`, `WallpaperSettingsApp`, `ComputerApp`, `ChatApp`, `TedbirgeWebView`, `WorkspacePanel` (Aktarım penceresi kaydı), `src/shell/installed.ts`.
- Tüm ekranlar ortak `WindowShell` kabuğunu ve `--tb-*` değişkenlerini kullanır; sabit hex renk taranıp temizlenir.
- Doğrulama: `bunx tsgo --noEmit` sıfır hata, hex renk taraması, çevrimdışı açılışta masaüstü + "Off-Grid Modu Aktif" rozeti kontrolü.
