# Tedbirge® WebOS — Off-Grid Dayanıklılık ve "Bilgisayarım" Yenilemesi

Rust-Wasm çekirdek, VFS (IndexedDB) ve pencere yöneticisi olduğu gibi korunur. Bu tur üç iş yapılır: çevrimdışı açılışın garantiye alınması, "Bilgisayarım" uygulamasının beş sekmeli gerçek sistem paneline dönüşmesi ve pencere kabuklarının tek tipe getirilmesi.

## 1. Çevrimdışı açılış garantisi

Bugün çevrimdışı gezinmelerde yedek sayfa `/cevrimdisi` — yani masaüstü yerine bilgi sayfası açılıyor. Değişecekler:

- Gezinme yedeği masaüstü kabuğuna (`/`) alınır; `/cevrimdisi` yalnız bilinçli açılan bir bilgi sayfası olarak kalır.
- Uygulama kabuğu, Wasm çekirdek, yazı tipleri ve duvar kâğıtları ilk açılışta önbelleğe alınır (varlıklar önbellek-önce, gezinmeler ağ-önce + kısa zaman aşımı, sonra önbellek).
- Ağ koptuğunda üst durum çubuğunda insan dostu rozet: "Off-Grid Modu Aktif · Yerel VFS & Wasm Hazır"; ağ dönünce rozet sessizce kaybolur.
- Beyaz "Çevrimdışısınız" ekranı hiçbir koşulda görünmez; çevrimdışıyken de masaüstü anında açılır.

## 2. "Bilgisayarım" — beş sekmeli sistem paneli

Mevcut tek kartlı ekran (ve anlamsız görünen "Bekleyen aktarım" satırı) kaldırılır; yerine sekmeli panel gelir. Tüm değerler canlı okunur, sabit sayı yazılmaz.

1. **Sistem Özeti** — cihaz adı, Tedbirge OS sürümü ve derleme damgası, çekirdek çalışma süresi, bellek kullanımı, Wasm çalışma durumu.
2. **Depolama & VFS** — kullanılan alan / toplam kota ilerleme çubuğu, kalıcı depolama izni anahtarı, "Önbelleği Temizle", "Verileri Dışa Aktar (.json)", "Yedek Yükle".
3. **Ağ & Mesh** — dört ağ modu anahtarı (Küresel / Yerel Wi-Fi Mesh / Hücresel Köprü / Tam Gizlilik), bağlı eş listesi ve gerçek aktarım kuyruğu sayısı (boşsa "kuyruk boş" yazar).
4. **Uygulamalar & İzinler** — kurulu sistem uygulamalarının durumu, uygulama bazlı depolama/ağ izin matrisi, tek tek sıfırlama ve yeniden başlatma.
5. **Sistem Ayarları** — tema seçimi (Açık Kristal · Soft Minimal · Gece/OLED), gece filtresi ve parlaklık sürgüsü, sistem ses kazancı sürgüsü.

Sekmeler klavye ve dokunmayla gezilebilir; dar ekranda tek sütuna iner.

## 3. Tek tip pencere kabuğu

- Dosyalar, Sohbet, Medya, Görünüm, Mağaza ve Aktarım pencereleri ortak bir `WindowShell` sarmalayıcısı kullanır: aynı başlık, araç şeridi, boş durum ve hata durumu.
- Dosyalar → Sohbet ve Dosyalar → Medya sürükle-bırak akışı uçtan uca yeniden doğrulanır.

## Doğrulama

- `bunx tsgo --noEmit` 0 hata, derleme temiz.
- Tarayıcıda ağ kapatılıp sayfa yenilenir: masaüstünün açıldığı ve off-grid rozetinin göründüğü ekran görüntüsüyle teyit edilir.
- Dokunulan dosyalarda sabit hex renk taraması yapılır; tüm renkler `--tb-*` değişkenlerinden okunur.

## Teknik notlar

- `vite.config.ts`: `navigateFallback` `/` olur, denylist korunur; Wasm ve font glob'ları teyit edilir.
- Yeni: `src/lib/pwa/offline-status.ts` (çevrimdışı durum aboneliği), `src/components/shell/WindowShell.tsx`, `src/components/shell/apps/computer/*` (beş sekme).
- Güncellenecek: `src/components/shell/apps/ComputerApp.tsx`, `SystemBar.tsx` (rozet), `src/lib/pwa.ts`, `src/lib/vfs/store.ts` (dışa aktar / içe al yardımcıları).
- Tema kimlikleri mevcut `crystal | soft | night` olarak kalır; yalnız etiketler kullanıcı diline uydurulur — yeni tema kimliği eklenmez ki kayıtlı tercihler bozulmasın.
