# Tedbirge® WebOS — Sistem Geneli Overhaul, Titreşim Eradikasyonu ve Denetim Raporu

Tek turda uygulanır; sonunda sohbete Türkçe mimari denetim raporu yazılır.

## 1. Titreşim (layout shift) ve re-render eradikasyonu

- Telemetri kaynakları tek bir abonelik katmanına toplanır: saat, bellek (`performance.memory`), ping/RTT, eş sayısı ve ağ durumu metni. Güncelleme aralığı en az 1000 ms'e sabitlenir ve debounce edilir; değer değişmediyse state güncellenmez (eşitlik kontrolü).
- `SystemBar` (5 sn), `ComputerApp` (2 sn), `SecurityPanel` (4 sn), `DesktopWidgets` (30 sn) ayrı zamanlayıcıları tek paylaşımlı zamanlayıcıya bağlanır; her bileşen kendi seçicisine abone olur, komşu bileşenler yeniden render olmaz.
- Tüm dinamik sayaç metinleri sabit ölçülü kapsayıcıya alınır: `tabular-nums`, `inline-block`, `min-w-*` ve sabit satır yüksekliği. "Ağ Hazır · Çevredeki cihazlar aranıyor" gibi değişken uzunluktaki durum metinleri sabit genişlikli, `truncate` bir alanda tutulur.

## 2. Masaüstü hidrasyon ve GPU hızlandırmalı sürükleme

- İlk yüklemede ikon/pencere kabuğunun iki kez kurulmasına yol açan key tabanlı remount kaldırılır; kalıcı `key` değerleri ve stabil bileşen kimlikleri kullanılır. Masaüstü ızgarası hidrasyon sonrası yeniden monte edilmez.
- Pencere taşıma/boyutlandırma ve masaüstü öğesi sürüklemesi `requestAnimationFrame` + `transform: translate3d()` ile yürütülür; sürükleme boyunca `will-change: transform` açılır, bitince kaldırılır.
- Sürükleme sırasında `getBoundingClientRect` okuması tek sefer başlangıçta yapılır, döngüde React state güncellemesi yerine doğrudan stil yazılır; bırakıldığında tek bir state commit edilir.
- `Desktop.tsx` dikey CSS Grid yapısı (`grid-flow-col grid-rows-[repeat(auto-fill,100px)]`) aynen korunur.

## 3. Üst bar, bildirim ve uygulama izolasyonu

- Çark → Sistem Ayarları uygulaması, Profil → Profil & Hesap uygulaması, Bilgisayarım → yalnızca sistem özeti + donanım telemetrisi. Kalan `launch("computer")` mükerrer yönlendirmeleri (masaüstü sağ tık menüsündeki "Ayarlar" dâhil) temizlenir.
- Bildirim paneli: sistem olayları, bağlantı kesilme/geri dönüş, dosya aktarımı ve lisans/ödeme bildirimleri; okundu işaretleme, tümünü temizle ve boş durum.

## 4. Ticarileştirme ve stub temizliği (sıfır boş buton)

- Paddle test ortamı checkout overlay'i, müşteri portalı bağlantısı, Community/Pro/Enterprise fiyat kartları ve kota aşımında `PaywallModal` tetikleyicisi uçtan uca bağlanır; her butonda yükleniyor/başarı/hata durumu görünür.
- PanelApp sekmeleri (Kalibrasyon, Yönetim, Ops, Mesh, Secure, Live, AI, Commerce), Dosyalar (VFS listeleme, yükleme, silme, yeniden adlandırma, önizleme), Mağaza, Sohbet, Medya, Müzik, Sistem Bilgisi, Aktarım taranır: boş `onClick`, 404 üreten bağlantı ve sahte veri bırakılmaz; veri yoksa dürüst "veri yok" kartı gösterilir.

## 5. ISO 9241 / Nielsen

- Tüm etkileşimli hedefler en az 48×48 px (`min-h-12 min-w-12`): üst bar, görev çubuğu, sekme şeritleri, modal butonları, masaüstü ikonları, fiyat kartları.
- Kalan eski renk sınıfları `--tb-*` token'larına çevrilir.
- Her sekme/pencere için Yükleniyor · Boş · Hata durumları görünür.

## 6. QA

- Korumalı server fn'ler yalnızca bileşenden `useServerFn` ile çağrılır (public loader'dan değil) — 401 kaynağı kapatılır.
- `bunx tsgo --noEmit` sıfır hata, `bunx vitest run` tam geçiş.

## 7. Kapanış raporu (sohbete)

1. Performans darboğazları ve titreşim çözüm özeti
2. Güvenlik ve oturum izolasyon raporu
3. WebGPU / P2P mesh senkronizasyon açıkları
4. Gelecek yol haritası ve önerilen modüller

## Teknik notlar

- Yeni: `src/lib/shell/telemetry-store.ts` (tek zamanlayıcı + seçici tabanlı abonelik), `src/lib/ui/drag.ts` (rAF + translate3d sürükleme yardımcısı).
- Güncellenecek: `SystemBar.tsx`, `Desktop.tsx`, `DesktopIcon.tsx`, `DesktopWidgets.tsx`, `WindowFrame.tsx`, `WorkspacePanel.tsx`, `Taskbar.tsx`, `ComputerApp.tsx`, `SecurityPanel.tsx`, `PanelApp.tsx`, `AyarlarApp.tsx`, `FilesApp.tsx`, `StoreApp.tsx`, `ProfileApp.tsx`, `PaywallModal.tsx`, `styles.css`.
- Şema değişikliği yok; mevcut `licenses`, `subscriptions`, `devices`, `api_usage_events` tabloları yeterli.
