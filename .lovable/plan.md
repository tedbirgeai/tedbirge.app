# Masaüstü Simge Izgarası Çakışma Düzeltmesi

## Sorunun Kök Nedeni

Masaüstü ızgarası CSS grid değil, piksel tabanlı serbest konumlandırma (sürükleme + ızgara oturtma) kullanıyor. Çakışma üç nedenden kaynaklanıyor:

1. **Dolan sıralama kaydedilmiş konumları yok sayıyor:** Bir simge sürüklenip `localStorage`'a kaydedildiğinde, kalan simgeler yukarıdan aşağı sırayla dizilmeye devam ediyor ve sürüklenen simgenin hücresine biniyor.
2. **Alt güvenli alanı hesaplanmıyor:** Satır sayısı `(yükseklik − 160 − 16)` ile bulunuyor; altta yüzen dock (~54 px + boşluk) için yer ayrılmadığından son sıra dock'un altına giriyor.
3. **Pencere boyutu değişince kayıtlı konumlar taşırıyor:** Küçülen ekranda eski kayıtlı konumlar sınırların dışında kalıyor veya yeniden dizilen simgelerle çakışıyor.

CSS `grid-cols-auto-fill`'e geçmek sürükleme ve ızgara oturtma mimarisini bozar; aynı etki (otomatik akış + güvenli alan + taşma engeli) piksel ızgarası üzerinde uygulanacak.

## Yapılacak Değişiklikler

### 1. `src/lib/shell/desktop-layout.ts` — dolan yerleşim yardımcıları

- `DOCK_CLEARANCE = 72` sabiti (dock 46 px + 8 px alt boşluk + 18 px pay) dışa aktarılır.
- Yeni `flowIntoGrid(items, saved, rows, top, cell)` fonksiyonu:
  - Kayıtlı konumların kapladığı hücreleri işaretler (ızgaraya oturtulmuş olarak).
  - Kayıtsız simgeleri sütun sütun (yukarıdan aşağı) ilk **boş** hücreye yerleştirir — dolu hücreyi atlar, asla üzerine yazmaz.
- Yeni `clampToGrid(pos, view, area)` fonksiyonu: kayıtlı konumu güvenli alan içine (sağ/sol/alt dock payı dahil) sıkıştırır; tamamen dışarıdaysa `null` döndürür (simge yeniden akışa düşer).
- `snap()` dock payını hesaba katacak şekilde alt sınır alacak.

### 2. `src/components/shell/Desktop.tsx` — ızgara hesabı

- Satır sayısı `(yükseklik − TOP_PAD − DOCK_CLEARANCE) / satırYüksekliği` ile hesaplanır; `SIDE_PAD` yatay pay olarak kalır.
- `positionOf` artık `flowIntoGrid` kullanır: sürüklenen simgelerin hücreleri korunur, diğerleri boş hücrelere akar.
- Yüzey boyutu veya `rows` değiştiğinde (`useEffect`) sınırlar dışına çıkan kayıtlı konumlar `clampToGrid` ile içeri alınır veya düşürülür.
- `GridSnapper` clamp'li snap kullanır; simge bırakıldığında dock alanının altına inemez.

### 3. `src/components/shell/DesktopItem.tsx` — etiket taşması

- Etiket `truncate` yerine sabit iki satırlık alan: `line-clamp-2` + sabit yükseklik (`min-h-8`), böylece kart yükseklikleri eşit kalır ve uzun adlar komşu kartlara taşmaz.
- `text-xs` ve `select-none` korunur; `--tb-*` renk değişkenlerine dokunulmaz.

### 4. Testler — `src/lib/shell/__tests__/desktop-layout.test.ts` (yoksa eklenir)

- Kayıtlı konumlu simge + yeniden akış: hiçbir iki simge aynı hücreye düşmez.
- `clampToGrid`: dock alanına giren konum yukarı itilir, ekran dışı konum `null` döner.
- Snap: alt sınır dock payının altına inmez.

## Dokunulmayacaklar

- VFS, pencere yöneticisi, Dock, mobil `DesktopPager` davranışı, `localStorage` şeması ve `--tb-*` tema token'ları aynen korunur.

## Doğrulama

1. `bunx tsgo --noEmit`, `bunx eslint`, `bunx vitest run`, `bun run build` — hepsi yeşil.
2. Playwright ile masaüstü görünümünde ekran görüntüsü: simgeler çakışmadan dizilir, uzun adlar iki satıra sarılır, son sıra dock'un üstünde kalır.
