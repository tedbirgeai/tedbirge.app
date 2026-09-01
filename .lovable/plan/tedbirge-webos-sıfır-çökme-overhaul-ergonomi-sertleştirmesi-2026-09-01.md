# Tedbirge® WebOS — Sıfır Çökme Overhaul, Ergonomi Sertleştirmesi ve A-Z Denetim Raporu

Tek turda uygulanır; sonunda sohbete Türkçe A-Z fizibilite ve denetim raporu yazılır.

## 1. Çökme koruması ve hata izolasyonu

Doğrulanan durum: `AppSurface` (pencere gövdesi) hiçbir hata sınırıyla sarılmıyor; `AppErrorBoundary` bileşeni projede var ama yalnızca `Messenger` içinde kullanılıyor. Bu yüzden herhangi bir uygulamanın (Panel, Dosyalar, Medya, Profil…) render/efekt hatası doğrudan kök rotaya düşüyor ve kullanıcı "This page didn't load" ekranını görüyor. Ekran görüntüsündeki çöküşün tetikleyici satırı henüz doğrulanmadı; ilk adım onu tespit etmek.

- Kök neden tespiti: masaüstü kabuğu ve tüm uygulamalar tarayıcı otomasyonuyla tek tek açılıp kapatılır, konsol/ağ hataları toplanır; bulunan gerçek hata (null erişimi, async yarış, hidrasyon uyuşmazlığı) kaynağında düzeltilir.
- Her pencere gövdesi (masaüstü + mobil kabuk) `AppErrorBoundary` ile sarılır; başlık uygulama adını taşır, kart içinde "Uygulamayı Yeniden Başlat" düğmesi bulunur. Kabuk ayakta kalır.
- Masaüstü kabuğunun kendisi (SystemBar, Desktop, Dock, Taskbar) ayrı bir üst sınırla korunur: bir kabuk parçası çökerse masaüstü siyaha düşmez, o şerit yerine kurtarma kartı gelir.
- Hatalar `reportLovableError` ile bildirilir; sessiz yutma yok.

## 2. ISO 9241 / Nielsen ergonomi açıkları

- Odak hapsi (9241-171): aktif pencere içinde Tab döngüsü kapatılır, arkadaki pencereler `inert` yapılır; pencere açılınca ilk odak başlığa gider, kapanınca çağıran öğeye döner.
- Ekran okuyucu: pencere açma/kapama/odak değişimi ve bildirimler için tek bir `aria-live` duyuru bölgesi eklenir.
- Nielsen #3: sistem geneli geri alma yığını (pencere kapatma, dosya silme, masaüstü ikon taşıma) `Ctrl+Z` ile; `Alt+Tab` görsel pencere geçiş overlay'i.
- Nielsen #5: yıkıcı işlemlerde (VFS dosya silme, mesh bağlantısını koparma, lisans/abonelik iptali) iki aşamalı onay + 5 sn geri alma penceresi.
- Nielsen #7: `Super + Sol/Sağ` pencere hizalama (yarım ekran), `Super + Yukarı` tam ekran, `Super + D` masaüstünü göster/gizle. Kısayol listesi Ayarlar içinde görünür.
- Kontrast: cam yüzeylerdeki metin/ikon renkleri `--tb-*` token'ları üzerinden WCAG AAA (7:1) eşiğine çekilir; sabit hex kullanılmaz.

## 3. Titreşim ve render optimizasyonu

- Kalan telemetri tüketicileri (`SecurityPanel`, `DesktopWidgets`, ağ durumu metni, ping ve cihaz sayısı) mevcut `telemetry-store.ts` paylaşımlı aboneliğine bağlanır; 1000 ms tick, değer değişmediyse state güncellenmez.
- Tüm dinamik sayaçlar sabit genişlikli, `tabular-nums`, `inline-block`, `truncate` kapsayıcılara alınır; değişken uzunluklu durum metinleri sabit alanda tutulur.

## 4. Hidrasyon ve GPU sürükleme

- Masaüstü ilk yüklemesindeki key tabanlı remount/flaş kaldırılır; stabil `key` değerleri kullanılır.
- Pencere ve ikon sürüklemesi tamamen `requestAnimationFrame` + `translate3d` ile yürür; sürükleme boyunca `will-change: transform` açılır, DOM ölçümü yalnız başlangıçta okunur, bırakışta tek state commit edilir.

## 5. Üst bar, ticarileştirme ve stub temizliği

- Çark → Sistem Ayarları, Profil → Profil & Hesap, Bilgisayarım → sistem özeti; kalan mükerrer yönlendirmeler temizlenir.
- Paddle test ortamı checkout overlay'i, müşteri portalı bağlantısı, fiyat kartları ve kota aşımında `PaywallModal` tetikleyicisi uçtan uca bağlanır; her düğmede yükleniyor/başarı/hata durumu görünür.
- PanelApp'in 8 sekmesi, Dosyalar, Mağaza, Sohbet, Medya, Müzik taranır: boş `onClick`, `href="#"` ve 404 üreten bağlantı bırakılmaz (`OsLink` içindeki yer tutucu dâhil); veri yoksa dürüst "veri yok" kartı gösterilir.
- İstisnasız tüm etkileşimli hedefler en az 48×48 px.

## 6. Otonom QA

- `bunx tsgo --noEmit` sıfır hata, `bunx vitest run` tam geçiş; hata çıkarsa sorulmadan düzeltilir.
- Tarayıcı otomasyonuyla her uygulama açılır/kapatılır, konsolda hata kalmadığı doğrulanır.
- Yeni testler: hata sınırı izolasyonu, pencere kısayolları, geri alma yığını.

## 7. Kapanış raporu (sohbete)

1. Sayfa çökmesi ve hata izolasyonu çözüm raporu
2. A-Z kod tabanı ve fonksiyonel tamlık matrisi
3. ISO 9241 & Nielsen uyumluluk haritası
4. Performans, GPU/WebGPU ve mesh altyapı fizibilitesi
5. Son kullanıcı teslim şekli ve üretim hazırlık seviyesi

## Teknik notlar

- Yeni: `src/lib/shell/undo-stack.ts`, `src/lib/shell/announce.ts` (aria-live), `src/lib/shell/shortcuts.ts`, `src/components/shell/WindowSwitcher.tsx`, `src/components/shell/ConfirmDialog.tsx`.
- Güncellenecek: `WorkspacePanel.tsx`, `AppErrorBoundary.tsx`, `WindowFrame.tsx`, `Desktop.tsx`, `DesktopIcon.tsx`, `DesktopWidgets.tsx`, `SecurityPanel.tsx`, `Taskbar.tsx`, `PanelApp.tsx`, `FilesApp.tsx`, `StoreApp.tsx`, `ProfileApp.tsx`, `PaywallModal.tsx`, `OsLink.tsx`, `styles.css`.
- Şema değişikliği yok; mevcut tablolar yeterli.
