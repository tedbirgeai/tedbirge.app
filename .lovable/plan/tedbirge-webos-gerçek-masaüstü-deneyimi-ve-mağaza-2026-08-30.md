# Tedbirge® WebOS — Gerçek Masaüstü Deneyimi ve Mağaza

Amaç: ana ekranı boş bir panel + modal yerine, duvar kâğıdı, sürüklenebilir masaüstü ikonları, üst sistem çubuğu, alt cam Dock ve bağımsız bir Mağaza penceresi olan gerçek bir işletim sistemi masaüstüne dönüştürmek.

## 1. Masaüstü yüzeyi

- Ortadaki "Masaüstünüz hazır" duyuru kutusu ve `cyber-grid` zemin kaldırılır.
- Yerine `--tb-*` token'larından beslenen katmanlı OS duvar kâğıdı: yumuşak radial ışık huzmeleri + hafif cam doku (sabit hex yok, tema değişkenleri).
- Masaüstü ikonları: Sohbet, Dosyalar, Medya, Müzik, Mağaza, Bilgisayarım (sistem/düğüm durumu). Tek tık seçer, çift tık açar; mobilde tek dokunuş açar.
- İkonlar serbest sürüklenebilir; konumlar `localStorage` (`tbos.desktop.icons`) içinde kalıcı tutulur, ekran küçülünce ızgaraya sığdırılır.

## 2. Tedbirge Mağaza (App Store)

- "Uygulamalar" modalı kaldırılır; yerine `store` kimlikli normal bir pencere olarak açılan Mağaza uygulaması gelir.
- İçerik: arama kutusu + kategori sekmeleri (Sosyal Medya, Üretkenlik, Araçlar, Web3). Kayıtlar `src/shell/web-apps.ts` kataloğundan okunur; her girdiye `category` alanı eklenir ve Web3 için birkaç yeni girdi tanımlanır.
- Her kartta "Masaüstüne ekle" / "Kaldır" eylemi. Yüklenen uygulama masaüstü ikonları ve Dock'a dinamik olarak eklenir; liste `localStorage` (`tbos.installed`) içinde saklanır.
- Yerleşik modüller (Sohbet, Dosyalar…) her zaman kurulu sayılır, kaldırılamaz.

## 3. Pencere yöneticisi

- Başlık çubuğundan sürükleme `requestAnimationFrame` ile pürüzsüzleştirilir, pencere ekran dışına taşmaz.
- Boyutlandırma yalnız sağ-alt köşe yerine 8 tutamak (4 kenar + 4 köşe) ile yapılır.
- Odak/z-index davranışı korunur; tıklanan pencere öne gelir.
- Küçültme: pencere Dock'taki kendi simgesine doğru küçülerek kaybolur (CSS transform animasyonu), Dock simgesine tıklayınca aynı animasyonla geri gelir.

## 4. Sistem çubuğu ve Dock

- Üstte ince sistem çubuğu: Tedbirge amblemi, canlı saat, P2P ağ durumu rozeti (mevcut `describeNode`), profil ve sistem ayarları girişleri.
- Altta cam (glassmorphism) Dock: kurulu uygulama simgeleri + açık pencere göstergeleri (aktif pencerede altında nokta), hover'da isim balonu. Mevcut `Taskbar` bu Dock ile değiştirilir.
- Mobilde (<768px) davranış korunur: tek uygulama tam ekran, Dock sadeleşir, sürükleme kapalı.

## Teknik notlar

- Yeni dosyalar: `src/components/shell/Desktop.tsx` (duvar kâğıdı + ikon katmanı), `src/components/shell/DesktopIcon.tsx`, `src/components/shell/Dock.tsx`, `src/components/shell/SystemBar.tsx`, `src/components/shell/apps/StoreApp.tsx`, `src/shell/installed.ts` (kurulu uygulama + ikon konumu kalıcılığı).
- Düzenlenecek: `WorkspacePanel.tsx` (yeni yerleşim), `WindowFrame.tsx` (8 tutamak, rAF sürükleme, minimize animasyonu), `windows.ts` (ekran içinde tutma yardımcıları), `web-apps.ts` (kategori alanı), `AppLauncher.tsx`/`AppsDialog.tsx` kullanımı Mağaza lehine kaldırılır, `styles.css` (duvar kâğıdı ve Dock yardımcı sınıfları).
- Tüm renkler `--tb-*` token'larından; sabit hex kullanılmaz.
- Doğrulama: `bunx tsgo --noEmit` 0 hata, Playwright ile masaüstü açılışı, ikon sürükleme, mağazadan yükleme ve pencere minimize/restore akışı kontrol edilir.
