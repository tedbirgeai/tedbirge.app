# Tedbirge® WebOS — İkon Tıklama Onarımı ve Master Doğrulama

Kod tabanı okundu. Emirdeki maddelerin çoğu (VFS, Wasm çevrimdışı, canlı metrikler, kurulum düğmesi, küçültme animasyonu) önceki turda uygulanmış durumda ve kaynakta doğrulandı. Açık kalan gerçek kusur ikon tıklamasıdır.

## 1. Doğrulanan mevcut durum

- `src/lib/vfs/store.ts` var: IndexedDB kalıcı depo, `saveFiles/readFile/deleteFile/objectUrl` bağlı.
- `vite.config.ts` `globPatterns` içinde `wasm` mevcut; gezinti `NetworkFirst`, varlıklar `CacheFirst`.
- `SystemBar.tsx` `InstallSystemButton`'ı (PWA kurulum) ve `rttMs` alanını taşıyor; `WorkspacePanel` `node.rttMs` geçiriyor.
- `src/apps/registry.ts` `LOCAL_APPS` girişlerini `kind: "builtin"` ve dar yetenek listeleriyle kaydediyor.
- `Dock.tsx` tek tıkla `onLaunch` / `restoreWindow` çağırıyor — Dock tarafı sağlam.

## 2. Tespit edilen kusur: masaüstü ikonları açılmıyor

`src/components/shell/DesktopIcon.tsx:41-49` her `pointerdown` anında — hareket olmasa bile — `setPointerCapture` çağırıyor. Masaüstünde (`draggable=true`) `onClick` bilinçli olarak devre dışı; açılış yalnız `onDoubleClick`'e bağlı. Pointer yakalama devredeyken ikinci tıklamanın `dblclick` olarak eşleşmesi güvenilir değildir; sonuç: ikon "ölü" hissettiriyor.

## 3. Yapılacak iş

**A. Tembel pointer yakalama.** Yakalama yalnız 4 px eşiği aşıldığında (gerçek sürükleme başladığında) kurulur; sürükleme bitince serbest bırakılır. Tıklama olayları böylece bozulmadan akar.

**B. Güvenilir açılış.** `pointerup` anında hareket edilmemişse: masaüstünde çift dokunuş penceresi (400 ms) içindeki ikinci tıklama pencereyi açar; ilk tıklama yalnız seçer. Dokunmatik/mobilde tek dokunuş açmaya devam eder. `Enter`/`Space` klavye yolu korunur. Böylece hem OS alışkanlığı hem de "her ikon açılıyor" garantisi sağlanır.

**C. Kayıt kontrolü.** `launch()` çağrısında hedef `getApp(id)` ile kayıtta doğrulanır; kayıtsız kimlik sessizce yutulmaz, geliştirici uyarısı üretir ve yine de kataloğa göre pencere açılır (kırık ikon kalmaz).

**D. Doğrulama.** `bunx tsgo --noEmit` 0 hata; Playwright ile masaüstünde her kurulu ikonun pencere açtığı, kapat/küçült/geri getir döngüsünün çalıştığı ve Dock noktasının güncellendiği ekran görüntüsüyle teyit edilir.

## 4. Teknik notlar

- Düzenlenecek: `src/components/shell/DesktopIcon.tsx` (ana onarım), `src/components/shell/WorkspacePanel.tsx` (launch kayıt kontrolü).
- Yeni dosya yok; pencere fiziği, VFS ve PWA katmanlarına dokunulmaz.
