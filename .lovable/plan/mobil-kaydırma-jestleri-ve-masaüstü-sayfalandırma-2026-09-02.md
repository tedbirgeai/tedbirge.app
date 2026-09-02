# Mobil Kaydırma Jestleri ve Masaüstü Sayfalandırma

Amaç: mobil/tablet kabuğa native iOS hissi kazandırmak — sayfalanan masaüstü, kenardan geri kaydırma ve Dock üzerinden hızlı uygulama geçişi.

## 1. Masaüstü sayfalandırma ve yatay kaydırma

- Masaüstü ikonları, ekran ölçüsüne göre hesaplanan sütun × satır kapasitesine bölünür; mobilde sayfa başına en fazla 16 ikon (4×4). Kapasite ekran boyutundan türetilir, dolayısıyla küçük ekranda daha az ikon.
- Sayfalar yan yana dizilir; yatay kaydırma `scroll-snap-type: x mandatory` + her sayfada `scroll-snap-align: start` ile yapılır. Kaydırma katmanı `will-change: transform` ve GPU dostu `overscroll-behavior-x: contain` kullanır.
- Geniş ekranda (masaüstü modu) mevcut dikey ızgara davranışı aynen korunur; sayfalandırma yalnız dar yerleşimde devreye girer.

## 2. Sayfa nokta göstergeleri

- Dock'un hemen üstünde, yarı saydam iOS tarzı nokta sırası. Aktif sayfa dolu, diğerleri sönük.
- Kaydırma sırasında `scroll` konumundan aktif sayfa hesaplanır; noktaya dokunmak ilgili sayfaya yumuşak kaydırır.
- Tek sayfa varsa gösterge gizlenir.

## 3. Kenardan geri kaydırma (edge back)

- Yeni `useSwipeGesture` hook'u: dokunmanın başladığı nokta ekranın sol %5'lik şeridindeyse ve yatay hareket eşiği aşılırsa pencere parmakla birlikte sağa kayar (`translateX`) ve şeffaflaşır.
- Parmak bırakıldığında hareket ekran genişliğinin ~%35'ini aştıysa pencere kapanır, aşmadıysa yumuşak geri yaylanır.
- Mevcut başlıktan aşağı çekerek kapatma davranışı korunur; ikisi tek jest yöneticisinde birleştirilir (baskın eksen seçimi).

## 4. Dock / alt çizgi ile uygulama değiştirme

- Dock şeridi veya alt home-indicator alanında yatay kaydırma, son iki açık uygulama arasında geçiş yapar (en son odaklanan iki pencere).
- Sağa/sola kaydırma açık pencere listesinde sırayla ilerler; tek pencere varsa işlem yapılmaz.

## 5. Çakışma önleme ve performans

- Ortak eşik mantığı: en az 30 px yatay hareket ve yatay hareketin dikeyden büyük olması şartı; aksi hâlde jest iptal edilir ve normal dikey kaydırma serbest bırakılır.
- Tüm hareket güncellemeleri `requestAnimationFrame` içinde `translate3d` ile uygulanır; React state yalnızca jest bittiğinde güncellenir.
- Dokunma dinleyicileri `passive` uyumlu; yalnız jest kilitlendiğinde `preventDefault` çağrılır.

## Teknik notlar

- Yeni dosyalar: `src/hooks/useSwipeGesture.ts` (eşik + eksen kilidi + rAF), `src/components/shell/DesktopPager.tsx` (sayfa hesabı ve snap kabı), `src/components/shell/PageDots.tsx`.
- Düzenlenecek: `src/components/shell/Desktop.tsx` (dar yerleşimde pager kullanımı), `src/components/shell/WorkspacePanel.tsx` (`MobileAppShell` içine edge-back jesti), `src/components/shell/Dock.tsx` (yatay kaydırmayla uygulama değiştirme), `src/styles.css` (snap ve nokta yardımcı sınıfları).
- `src/shell/windows.ts` mevcut `focusWindow` / `activeWindow` API'si kullanılır; pencere durum mantığı değişmez.
- Tüm renkler `--tb-*` token'larından okunur, sabit hex yok.
- Doğrulama: `bunx tsgo --noEmit` sıfır hata, `bunx vitest run` tam yeşil, Playwright ile mobil viewport'ta sayfa kaydırma, kenardan geri ve Dock geçişi kontrolü.
