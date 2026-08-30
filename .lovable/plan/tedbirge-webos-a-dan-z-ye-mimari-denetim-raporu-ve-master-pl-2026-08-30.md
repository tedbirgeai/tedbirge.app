# Tedbirge® WebOS — A'dan Z'ye Mimari Denetim Raporu ve Master Plan

Kod tabanı okundu; hiçbir dosya değiştirilmedi. Aşağıdaki durum tespitleri doğrudan kaynak dosyalardan doğrulandı.

## 1. Mevcut durum (doğrulanmış)

**Uygulama kaydı — kısmen hazır.** `src/shell/apps.ts` yalnızca 5 sabit dahili sekme tanımlıyor (chats, calls, communities, feed, me). `src/apps/registry.ts` üzerinde `kind: "builtin" | "wasm"`, yetenek listesi ve `registerApp()` genişletme kapısı var. Yani veri modeli genişlemeye uygun, ancak **harici web uygulaması (iframe) türü yok**; Google/YouTube/X gibi hedefler için `kind: "web"`, URL, ikon, embed politikası alanları eksik.

**X-Frame/CSP savunması — yok.** Kod tabanında hiçbir iframe konteynırı yok. Ayrıca `src/lib/coi-headers.ts` WebOS rotalarına `Cross-Origin-Embedder-Policy: credentialless` uyguluyor; bu, harici sitelerin gömülmesini ayrıca zorlaştıran bir kısıt (yalıtım politikasıyla iframe stratejisi birlikte tasarlanmalı).

**Pencere yöneticisi — yok.** `src/shell/surfaces.ts` yalnızca modal/panel yığını (`SurfaceId` listesi). Sürüklenebilir, boyutlandırılabilir, z-index öncelikli pencere ve görev çubuğu bulunmuyor. Olumlu taraf: `ChatApp` daha önce `h-full w-full` esnek kapsayıcıya alındı, yani pencere gövdesine gömülmeye hazır. `src/hooks/use-mobile.tsx` 768px kırılımını zaten sağlıyor.

**Tek havuz keşfi — tamam.** `src/lib/browser-node.ts` tek kanal sabiti kullanıyor: `tedbirge-mesh-v1` (yerel LAN için ayrı `tedbirge-local-mesh-v1` BroadcastChannel). Bayat eşler `gcTimer` ile süpürülüyor (`sweepStalePeers`), 5 sn'de bir `dialNewPeers` kalp atışı çalışıyor, kanal düşünce yeniden abone olunuyor.

**TURN yedeği — kısmen.** Görüşme motoru `src/lib/call/engine.ts` STUN + `openrelay.metered.ca` TURN (80/443) taşıyor. Mesh düğümü `browser-node.ts` yapılandırması ise yalnızca Google STUN sunucularıyla başlıyor — simetrik NAT/mobil operatör ağlarında veri kanalı için TURN yedeği zayıf.

**Ağ değişimi / ekran kilidi — eksik.** `browser-node.ts` `online`/`offline` olaylarını dinliyor, ancak **`visibilitychange` veya `pagehide/resume` dinlemiyor**. iOS'ta ekran kilitlenip açıldığında WebSocket/ICE yeniden canlandırma tetiklenmiyor; yalnızca 5 sn'lik timer'a bağlı ve arka planda timer'lar kısılıyor.

**Web Worker izolasyonu — yalnızca çekirdekte.** Tek worker `src/kernel/kernel.worker.ts` (yönlendirme çekirdeği). Medya yolu (`src/lib/chat/media.ts`) ana iş parçacığında; donmayı 8'erli turlarla `setTimeout(0)` nefesi ve ilerleme geri çağrısı engelliyor. Bu donmayı azaltıyor ama 60 FPS garantisi vermiyor; base64 + şifreleme hâlâ ana thread'de.

**Anti-flicker ve dil — tamam.** `PeerRow` özel karşılaştırıcılı `React.memo`, presence 300 ms trailing debounce, giriş/çıkış geçiş animasyonları yerinde. `describeNode` metinleri insan dostu ("Ağ Hazır · Çevredeki Cihazlar Aranıyor", "N Aktif Cihaz Bağlı", "Güvenli Aktarıcı"). Not: katılımcı listesi hâlâ `Messenger.tsx` içinde; ayrı memo'lu `ParticipantsList` bileşenine çıkarılmadı.

**Kod sağlığı.** `bunx tsgo --noEmit` → **0 hata** (bu denetimde çalıştırıldı). Düğüm zamanlayıcıları `stop()` içinde tek noktadan temizleniyor. Kalan risk noktaları: `src/lib/access-tiers.ts:212` ve `src/lib/chat/lock.ts:125` içindeki modül seviyesi `visibilitychange` dinleyicileri hiç kaldırılmıyor (tekil oldukları için pratikte sızıntı değil, ama denetim izine girmeli) ve medya track'lerinin kapanış yolları bileşen bazlı — tek elden `releaseAllTracks()` yok.

## 2. Master plan (A-Z, sırayla, 0 hata hedefiyle)

**A. Uygulama modeli genişletmesi.** `AppManifest`'e `kind: "builtin" | "wasm" | "web"`, `url`, `icon`, `embed: "iframe" | "popup" | "auto"` alanları eklenir. Harici hedefler (Arama, Video, Sosyal…) ayrı bir veri dosyasında tanımlanır; kabuk kodunda hiçbir marka adı sabitlenmez.

**B. Akıllı gömme (X-Frame/CSP fallback).** `GenericAppContainer`: iframe yüklenir, `load` olayı belirli süre içinde gelmez veya erişim reddedilirse otomatik olarak "Bu servis gömülmeye izin vermiyor — yeni pencerede aç" kartına düşer (`window.open` + pencere içi bilgi ekranı). Bilinen kısıtlı alan adları için `embed: "popup"` ön tanımlı verilir, tarama denemesi hiç yapılmaz. COEP `credentialless` politikasının WebOS rotalarında iframe'e etkisi ölçülür; gerekirse yalnız pencere yöneticisi rotası politika dışına alınır.

**C. Pencere yöneticisi.** `src/shell/windows.ts` (durum: id, appId, konum, boyut, z, minimize/maximize) + `WindowFrame` (pointer events ile sürükle/boyutlandır, odak z-index) + `Taskbar`. Mevcut yüzey yığını korunur; pencereler ayrı katmandır. `useIsMobile()` true iken pencere yöneticisi devre dışı: tek uygulama tam ekran, alt sekme çubuğu bugünkü davranışıyla kalır.

**D. Sinyalleşme dayanıklılığı.** `browser-node.ts` içine `visibilitychange` + `pagehide/pageshow` kancaları: sayfa öne geldiğinde kanal sağlığı denetlenir, gerekirse yeniden abone olunur ve bağlantısız eşler yeniden aranır. Mesh RTCPeerConnection yapılandırmasına görüşme motorundakiyle aynı TURN havuzu eklenir (tek kaynaktan okunur).

**E. Medya worker'ı.** `src/workers/media.worker.ts`: base64 dönüşümü, parçalama ve zarf şifreleme worker'a taşınır; ana thread yalnız Blob gönderir, ilerleme ve hazır parçaları alır. Ana iş parçacığında kalan tek iş DOM güncellemesi olur — 60 FPS hedefi bu şekilde ölçülebilir hâle gelir (aktarım sırasında frame ölçümü ile doğrulanır).

**F. Son cila ve denetim.** `ParticipantsList` ayrı memo'lu bileşene çıkarılır; modül seviyesi dinleyiciler tek `disposeAll()` kaydına bağlanır; medya track kapatma tek yardımcıya toplanır. Kapanışta `bunx tsgo --noEmit` + lint 0 hata ve masaüstü/mobil Playwright doğrulaması.

## 3. Kapsam notu

Bu iş emrinde kod yazılmadı. Yukarıdaki A-F adımları onay verildiğinde sırayla uygulanır; A-C (pencere/uygulama katmanı) ile D-E (ağ/performans) bağımsızdır, istenirse ayrı turlarda yürütülebilir.
