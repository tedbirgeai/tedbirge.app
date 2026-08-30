# Tedbirge® WebOS — Uçtan Uca Sağlık Taraması ve Bağlama Planı

Kod tabanı okundu, hiçbir dosya değiştirilmedi. Aşağıdaki tespitler doğrudan kaynaktan doğrulandı.

## 1. Denetim sonuçları

**Uyanma / ağ değişimi — TAMAM.** `src/lib/browser-node.ts:460-461` hem `visibilitychange` hem `pageshow` dinliyor, `:874-875` temizliyor. `online/offline` kancaları da yerinde. Ek eksik yok.

**Çevrimdışı mimari — KISMEN.** `vite.config.ts` içinde `vite-plugin-pwa` (generateSW, autoUpdate, `injectRegister: null`, `devOptions.enabled: false`) doğru kurulu; gezinti `NetworkFirst`, varlıklar `CacheFirst`. Ancak `globPatterns` listesinde **`wasm` yok**: `public/kernel/tedbirge_kernel.wasm` ön belleğe alınmıyor, tam çevrimdışı açılışta çekirdek yüklenemeyebilir.

**Yerel ağ keşfi — SINIRLI (mimari gerçek).** `LOCAL_CHANNEL = "tedbirge-local-mesh-v1"` (`browser-node.ts:73`) BroadcastChannel'dır; yalnız **aynı tarayıcıdaki sekmeler** arasında çalışır, farklı cihazlar arasında çalışmaz. Tarayıcıda cihazdan cihaza LAN keşfi (mDNS/UDP) API'si yoktur; gerçek eşleşme sinyalleşme veya QR/kod ile kurulur. Arayüzde bunu "aynı cihazdaki pencereler" olarak dürüst adlandırmak gerekiyor.

**Uygulama kaydı — KOPUK.** `src/apps/registry.ts` yalnız `SHELL_APPS` + `WEB_APPS` kaydediyor. `src/shell/installed.ts` içindeki yerleşik modüller (Dosyalar, Medya, Müzik, Mağaza, Bilgisayar) `AppRegistry`'de **yok** → bu pencereler yetenek (capability) izni almadan çalışıyor.

**Mağaza / kalıcılık — TAMAM.** `installed.ts` `useSyncExternalStore` + localStorage ile kurulum ve ikon konumlarını anında Dock ve masaüstüne yansıtıyor.

**Pencere fiziği — TAMAM.** `WindowFrame.tsx` 8 tutamak, `requestAnimationFrame`, `body.tbos-dragging` ile iframe imleç yutmasının engellenmesi, kenara yapışma önizlemesi, çift tıkla tam ekran, kapat/küçült/büyüt hepsi bağlı. Eksik: küçültmede Dock'a doğru görsel geçiş yok (kozmetik).

**Dosya yöneticisi — EKSİK.** `FilesApp.tsx` dosyaları yalnız bellekte (`URL.createObjectURL`) tutuyor: pencere kapanınca kayboluyor, **sürükle-bırak yok**, IndexedDB/OPFS kalıcılığı yok ve "P2P gönder" seçilen dosyayı taşımadan yalnız aktarım penceresini açıyor.

**Sistem çubuğu — EKSİK.** `SystemBar.tsx` yalnız saat + eş sayısı gösteriyor; düğüm zaten `rttMs` üretiyor (`browser-node.ts:1317`) ama arayüze bağlanmamış, bellek göstergesi yok.

**Kod sağlığı.** `src/lib/access-tiers.ts:212` ve `src/lib/chat/lock.ts:125` modül seviyesinde kaldırılmayan dinleyiciler taşıyor (tekil oldukları için sızıntı değil, denetim izine girmeli).

## 2. Yapılacak işler

**A. Çevrimdışı tamamlama.** `globPatterns` içine `wasm` eklenir; Wasm çekirdeği ve ikonlar tam çevrimdışı sunulur. `maximumFileSizeToCacheInBytes` çekirdek boyutuna göre doğrulanır.

**B. Uygulama kaydının kapatılması.** `installed.ts` içindeki yerleşik modüller `registry.ts`'e `kind: "builtin"` ve dar yetenek listeleriyle eklenir (Dosyalar: `mesh.send`/`mesh.receive`; Medya/Müzik: `status.read`; Mağaza/Bilgisayar: `status.read`). Kabukta hiçbir pencere kayıtsız açılmaz.

**C. Dosyalar penceresi — gerçek VFS.** IndexedDB tabanlı `src/lib/vfs/store.ts` (kaydet/listele/oku/sil, Blob olarak). `FilesApp` pencereye sürükle-bırak, kalıcı liste, önizleme/indirme ve satır içi "Eşe gönder" ile mevcut `src/lib/p2p/file-transfer.ts` akışına doğrudan dosya iletimi kazanır. Nesne URL'leri tek noktadan geri verilir (sızıntı yok).

**D. Sistem çubuğu canlı metrikler.** Düğümden `rttMs`, eş sayısı ve bağlantı durumu okunur; destekleyen tarayıcılarda `performance.memory` ile bellek rozeti gösterilir (yoksa gizlenir). Uydurma değer üretilmez.

**E. Yerel ağ dilinin düzeltilmesi.** "Yerel ağ" etiketleri, gerçekte kapsadığı şeye göre "Aynı cihazdaki pencereler" olarak adlandırılır; cihazdan cihaza eşleşme için mevcut QR/kod akışına yönlendirme eklenir.

**F. Küçültme geçişi ve denetim kapanışı.** Küçültülen pencere için Dock simgesine doğru kısa ölçek/opaklık geçişi (CSS, 140 ms). Modül seviyesi dinleyiciler tek `disposeAll()` kaydına bağlanır. Kapanışta `bunx tsgo --noEmit` 0 hata + masaüstü ve mobil Playwright doğrulaması.

## 3. Teknik notlar

- Yeni dosyalar: `src/lib/vfs/store.ts`, `src/components/shell/apps/FilesApp.tsx` (yeniden yazım).
- Düzenlenecek: `vite.config.ts`, `src/apps/registry.ts`, `src/components/shell/SystemBar.tsx`, `src/styles.css`, yerel ağ etiketlerini taşıyan kabuk bileşenleri.
- Tarayıcı sınırı: LAN'da cihazdan cihaza otomatik keşif mümkün değildir; bu madde kod ile değil dil ve akış düzeltmesiyle kapatılır.
