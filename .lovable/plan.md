# Gerçek Logolar, OS Sağ Tık Menüsü ve Web Uygulama Motoru Düzeltmesi

Üç başlığı mevcut VFS / Wasm / pencere altyapısına dokunmadan bağlarız.

## 1. İşletim sistemi bağlam menüsü

- Yeni `src/components/shell/ContextMenu.tsx`: tek, yeniden kullanılabilir cam efektli (glassmorphism) menü bileşeni — konum, öğe listesi, ayırıcı, klavye ile kapanma (Esc) ve dışarı tıklamada kapanma.
- `Desktop.tsx` içindeki yerel menü bu bileşene taşınır; boş alan menüsü: **Yeni Klasör · Duvar Kâğıdını Değiştir · Yenile · Sistem Ayarları** (sonuncusu "Görünüm/Bilgisayarım" penceresini açar).
- `DesktopIcon.tsx` ikon üzerinde `onContextMenu` alır (`e.preventDefault()`): **Uygulamayı Aç · Yeni Pencerede Aç · Harici Sekmede Aç · Kısayolu Sil · Özellikler**. Harici sekme yalnız web uygulamalarında, silme yalnız kaldırılabilir (builtin olmayan) uygulamalarda etkin; diğerleri devre dışı görünür.
- `Dock.tsx` ve `Taskbar.tsx` üzerinde de tarayıcı menüsü engellenir; Dock ikonlarında aynı uygulama menüsü açılır.
- "Özellikler" küçük bir bilgi kartı gösterir (ad, kimlik, tür, yetenekler, hedef adres) — `AppRegistry` verisinden okunur.

## 2. Gerçek marka logoları

- Yeni `src/components/shell/BrandIcon.tsx`: verilen hedef adresten alan adını çıkarıp `https://www.google.com/s2/favicons?domain=<alan>&sz=128` görselini yükler; yükleme başarısızsa mevcut Lucide ikonuna düşer (`AppIcon`).
- `app-icons.tsx` içindeki `AppIcon` genişletilir: kimlik `web.` / `web3.` ile başlıyorsa katalogdaki `url` alanından marka logosu denenir, yerleşik sistem uygulamaları mevcut çizgi ikonlarını korur.
- Katalog (`src/shell/web-apps.ts`) her kayda isteğe bağlı `iconDomain` alanı kazanır; proxy/embed adresi farklı olan hedeflerde (ör. video, X) logo doğru markadan çekilir.
- Masaüstü, Dock, Mağaza ve pencere başlığı aynı `AppIcon` üzerinden geçtiği için tek değişiklikle hepsi güncellenir.

## 3. Kesintisiz web çalışma zamanı

- `TedbirgeWebView.tsx` üst çubuğuna iki belirgin buton: **Harici Sekmede Aç** ve **Geçit Üzerinden Çalıştır** (mevcut `gatewayUrl` yardımcı fonksiyonu artık gizli bağlantı yerine gerçek düğme olur; tıklanınca pencere içinde geçit aşamasına geçer).
- Gömmeyi reddeden hedeflerde (Google, TikTok, X, LinkedIn) kırmızı/beyaz hata ekranı yerine doğrudan **Tedbirge Web Kabuğu** yüklenir: pencere içinde çalışan arama kutusu + sonuç gezintisi (hafif DuckDuckGo uç noktası üzerinden), üstte hedefe dönme ve harici açma kısayolları.
- Bilinen engelli hedefler için katalogda `embed: "popup"` kalır ama kabuk artık yeni sekmeye düşmez; ilk render'da doğrudan web kabuğuna açılır, kullanıcı isterse "Geçit Üzerinden Çalıştır" ile gömmeyi dener.

## Teknik notlar

- Dokunulan dosyalar: `Desktop.tsx`, `DesktopIcon.tsx`, `Dock.tsx`, `Taskbar.tsx`, `app-icons.tsx`, `TedbirgeWebView.tsx`, `web-apps.ts`, `installed.ts` (kısayol silme), yeni `ContextMenu.tsx` ve `BrandIcon.tsx`.
- VFS (`src/lib/vfs/store.ts`), çekirdek (`src/kernel/*`), pencere yöneticisi ve P2P katmanı değişmez.
- Renkler yalnız `--tb-*` token'larından okunur; sabit hex kullanılmaz.
- Doğrulama: `bunx tsgo --noEmit` 0 hata, ardından Playwright ile masaüstü ve ikon sağ tıkında tarayıcı menüsünün çıkmadığı, OS menüsünün açıldığı ve marka logolarının yüklendiği ekran görüntüsüyle teyit edilir.
