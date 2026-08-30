# Tedbirge® WebOS — Kalan Sürtünme Noktalarının Kapatılması

Sistemin büyük bölümü (Web Kabuğu kartı, PWA çevrimdışı önbelleği, VFS, ağ modları, Spotlight, sürüklenebilir kartlar, sağ tık menüleri, ses/parlaklık sürgüleri) hâlihazırda kurulu ve çalışıyor. Bu plan yalnızca doğrulanmış eksikleri kapatır; VFS, Rust-Wasm çekirdek ve pencere mimarisi değiştirilmez.

## 1. Temiz adres çubuğu (gerçek eksik)

Şu an pencere üst çubuğunda etkin adres ham olarak yazılıyor; "Geçit Üzerinden Çalıştır" seçilince kullanıcı `/api/public/gecit?url=...` metnini görüyor.

- Adres çubuğu artık yalnızca temiz alan adını gösterir (ör. `google.com`).
- Geçit üzerinden çalışan hedeflerde bile hedefin kendi alan adı yazılır; dahili yol asla görünmez.
- Geçit etkinken alan adının yanında küçük "Geçit" rozeti; kabuk modunda "Tedbirge Web Kabuğu · alan adı".
- Sayfa başlığı okunabiliyorsa başlık, okunamıyorsa alan adı gösterilir.

## 2. Off-Grid modunda pencere içi çıkış kilidi (gerçek eksik)

Web görünümü şu an ağ moduna bakmıyor; Tam Gizlilik modunda da harici hedef yüklemeye çalışıyor.

- Ağ modu "Tam Gizlilik" iken web pencereleri hiç iframe açmaz; yerine "Tam Gizlilik açık — dış çıkış kapalı" kartı ve modu değiştirme kısayolu gösterilir.
- "Harici Sekmede Aç" ve "Geçit" eylemleri bu modda gizlenir.
- Mod tekrar açıldığında pencere kendi kendine yeniden yüklenir.

## 3. Kapanış doğrulaması

- `bunx tsgo --noEmit` → 0 hata.
- Değişen dosyalarda sabit hex renk yok; tüm renkler `--tb-*` değişkenlerinden.
- Kurulu davranışların gözle kontrolü: kurulum düğmesi, kalıcı depolama izni + kota kartı, Spotlight (Ctrl/⌘+Boşluk), Dosyalar→Sohbet/Medya sürükle-bırak, sağ tık menüleri.

## Teknik notlar

- `src/components/shell/TedbirgeWebView.tsx`: adres maskeleme için `domainOf()` kullanımı, geçit rozeti, off-grid kartı.
- `src/lib/shell/network-mode.ts` içindeki `useNetworkMode()` web görünümüne bağlanır.
- `src/components/shell/GenericAppContainer.tsx`: yükleme metnindeki teknik aşama notu insan diline sadeleştirilir.
- Başka dosya değişmez.
