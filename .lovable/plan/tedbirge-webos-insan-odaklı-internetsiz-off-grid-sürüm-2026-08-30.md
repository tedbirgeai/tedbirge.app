# Tedbirge® WebOS — İnsan Odaklı, İnternetsiz (Off-Grid) Sürüm

Mevcut VFS, Wasm çekirdek, P2P ve pencere mimarisi korunur; üzerine eksik bağlantılar ve yeni yaşam alanı bileşenleri eklenir.

## 1. İnternetsiz tam bağımsızlık
- Servis çalışanı önbelleğini doğrula ve genişlet: uygulama kabuğu, Wasm çekirdek, duvar kâğıtları ve yazı tipleri çevrimdışı kullanılabilir olsun; gezinmeler ağ-önce, varlıklar önbellek-önce.
- "Sistemi cihaza kur" düğmesini gerçek kurulum akışına bağla: kurulabilir değilken iOS/masaüstü için adım adım yönerge kartı, kurulduğunda "Kurulu" durumu.
- Yerel VFS'in (IndexedDB) çevrimdışı yazma/okuma güvenilirliğini doğrula; depolama kotası ve kalıcı depolama izni (`navigator.storage.persist`) talebi eklenir.

## 2. Ağ paneli ve insan odaklı masaüstü
- Yeni **Ağ Yaşam Paneli**: üst çubuk ve Kontrol Merkezi'ndeki ağ simgesinden açılır. Dört mod: Küresel İnternet, Yerel Wi-Fi Mesh, Hücresel Veri Köprüsü, Tam Gizlilik (Off-Grid). Seçilen mod P2P çalışma zamanına uygulanır; Off-Grid modunda dış çıkış tamamen kapatılır.
- Panelde canlı eş listesi, sinyal/gecikme ve "Çevrede ara" eylemi; internet yokken aynı ağdaki cihazların eşleşmesi ve dosya/mesaj göndermesi doğrulanır.
- Masaüstüne üç canlı kart: **Mesh Ağ Durumu** (eş sayısı, düğüm sağlığı), **Depolama** (VFS kullanımı), **Odak Modu** (tek tıkla bildirimleri ve görsel karmaşayı sadeleştirir). Kartlar sürüklenebilir ve gizlenebilir.

## 3. Kör nokta temizliği (%0 kopukluk)
- Üst bar, Görev çubuğu, Dock, Kontrol Merkezi ve ayar pencerelerindeki tüm düğmeler taranır; işlevsiz olan kalmaz.
- Parlaklık sürgüsü ekran üstü dinamik parlaklık/gece ışığı katmanına bağlanır.
- Ses sürgüsü sistem ses efektlerinin kazancına bağlanır (kalıcı, sessize alma ile uyumlu).
- Sağ tık menüsündeki Yeni Klasör, Duvar Kâğıdı, Yenile, Ayarlar ve Özellikler komutları VFS ve tema motoruna tam bağlanır.

## 4. Evrensel arama ve uygulamalar arası akış
- **Spotlight** paleti (Ctrl/Cmd+Space): yerel dosyalar, kurulu uygulamalar ve sistem komutları; ok tuşları + Enter ile tamamen klavyeden yönetilir.
- Sürükle-bırak: Dosyalar penceresinden bir dosya Sohbet penceresine bırakılınca P2P gönderime, Medya penceresine bırakılınca oynatıcıya aktarılır; geçerli hedeflerde bırakma vurgusu gösterilir.

## 5. Performans ve doğrulama
- `bunx tsgo --noEmit` 0 hata; derleme temiz.
- Sürükleme/geçişler `requestAnimationFrame` üzerinden akıcı kalır; masaüstü açılışı, ikon çift tıklaması, pencere kapatma ve çevrimdışı yükleme tarayıcı testiyle doğrulanır.

## Teknik notlar
- Yeni dosyalar: `src/components/shell/NetworkControl.tsx`, `src/components/shell/Spotlight.tsx`, `src/components/shell/DesktopWidgets.tsx`, `src/lib/shell/network-mode.ts`, `src/lib/shell/focus-mode.ts`, `src/lib/ui/audio-gain.ts`.
- Güncellenen dosyalar: `SystemBar.tsx`, `ControlCenter.tsx`, `Desktop.tsx`, `WorkspacePanel.tsx`, `FilesApp.tsx`, `MediaApp.tsx`, `src/lib/chat/sounds.ts`, `src/lib/ui/wallpaper.ts`, `src/lib/vfs/store.ts`, `vite.config.ts` (PWA önbellek desenleri), `src/styles.css`.
- Renkler yalnızca `--tb-*` değişkenlerinden okunur; sabit hex kullanılmaz. Off-Grid modu mevcut egress-guard kilidini yeniden kullanır.
