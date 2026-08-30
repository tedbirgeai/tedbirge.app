# Tedbirge® WebOS — Web Kabuğu Onarımı ve Off-Grid Kapanış

Mevcut VFS, Rust-Wasm çekirdek, pencere yöneticisi ve P2P mimarisi olduğu gibi korunur. Bu tur yalnızca kopuk kalan bağlantılar kapatılır.

## 1. "Bağlanmayı reddetti" ekranının kökten kaldırılması

Bugün harici bir uygulama açıldığında sıra şu: gömme uyumlu adres → Tedbirge Geçidi (`/api/public/gecit`) → doğrudan adres. Geçit aşaması sunucu tarafına bağımlı ve izin listesi dışındaki hedeflerde 403 döndüğü için pencerede tarayıcının kendi ret ekranı görünebiliyor.

- Gömme strateji zinciri geçit bağımlılığından çıkarılır: yalnızca gömme dostu eşdeğer adres ve doğrudan adres denenir.
- Geçit, otomatik aşama olmaktan çıkıp yalnızca kullanıcının "Geçit Üzerinden Çalıştır" düğmesine bastığında ve hedef izin listesindeyse çalışan isteğe bağlı bir seçenek olur; izin listesinde değilse düğme gizlenir.
- Yükleme denetimi sertleştirilir: boş çerçeve, zaman aşımı ve `X-Frame-Options` reddi durumlarının hepsinde çerçeve anında sökülür ve Web Kabuğu kartı devreye girer — arada tarayıcı hata sayfası hiç görünmez.
- WhatsApp Web, Google, TikTok gibi bilinen ret veren hedefler kayıtta doğrudan `popup` politikasıyla işaretlenir; böylece hiç çerçeve denemesi yapılmadan Web Kabuğu açılır.

## 2. Zengin Tedbirge Web Kabuğu kartı

Kart mevcut; eksikleri tamamlanır:

- Servisin gerçek logosu (`BrandIcon`) ve adı büyük başlık olarak gösterilir.
- Açıklama: "Bu servis pencere içi gömmeyi kısıtlıyor."
- Birincil eylem "Harici Sekmede Aç", ikincil eylem dahili arama çubuğu (sonuçlar pencere içinde gömme dostu arama motorunda açılır), üçüncüsü uygunsa "Geçit Üzerinden Çalıştır".
- Son ziyaret edilen adres pencere başlığında kalır; "Yenile" kabuğu sıfırlar.

## 3. Kalan off-grid ve kör nokta kontrolleri

Önceki turda kurulan parçalar uçtan uca doğrulanır ve eksik kalan bağlantı varsa tamamlanır:

- Servis çalışanı önbelleği: uygulama kabuğu, Wasm çekirdek, duvar kâğıtları ve yazı tipleri çevrimdışı açılır; gezinmeler ağ-önce, varlıklar önbellek-önce.
- "Cihaza Kur" düğmesi: kurulabilirken gerçek kurulum akışı, değilken iOS/masaüstü yönerge kartı, kuruluyken "Kurulu" durumu.
- Yerel VFS: kalıcı depolama izni talebi ve kota göstergesi çalışır durumda.
- Ağ Yaşam Paneli dört mod, canlı eş listesi ve çevre taraması; Off-Grid modunda dış çıkış kilidi.
- Masaüstü kartları (Mesh, Depolama, Odak) sürüklenebilir ve gizlenebilir hâle getirilir — şu an sabit konumdalar.
- Parlaklık/ses sürgüleri, sağ tık menüleri, Spotlight (Ctrl/Cmd+Boşluk) ve Dosyalar → Sohbet/Medya sürükle-bırak akışları tek tek denenir.

## 4. Doğrulama

- `bunx tsgo --noEmit` 0 hata, derleme temiz.
- Tarayıcı testi: WhatsApp Web ve bir video servisi açılır; ret ekranı çıkmadığı, Web Kabuğu kartının ve "Harici Sekmede Aç" düğmesinin çalıştığı ekran görüntüsüyle teyit edilir.
- Çevrimdışı test: ağ kapalıyken masaüstü, çekirdek ve VFS dosyaları açılır.

## Teknik notlar

- Güncellenecek dosyalar: `src/lib/shell/embed-strategy.ts` (geçit zincirden çıkar, izin listesi dışa açılır), `src/components/shell/GenericAppContainer.tsx` (ret tespiti + anında kabuk devri), `src/components/shell/TedbirgeWebView.tsx` (zengin kart, logo, koşullu geçit düğmesi), `src/shell/web-apps.ts` (bilinen ret veren hedeflere `popup`), `src/components/shell/DesktopWidgets.tsx` (sürükleme + gizleme).
- `src/routes/api/public/gecit.ts` silinmez; sunucu çalışırken isteğe bağlı yardımcı olarak kalır.
- Renkler yalnızca `--tb-*` değişkenlerinden okunur; sabit hex kullanılmaz.
