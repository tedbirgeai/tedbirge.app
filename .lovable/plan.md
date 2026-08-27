# Tedbirge® WebOS — Fizibilite ve Mimari Uygulama Planı

Kod yazılmadı. Aşağıdaki tespitler depo üzerinde doğrulandı.

## Mevcut durum (doğrulanmış)

- Çekirdek: `crates/tedbirge-kernel` var; `std` üzerinde derleniyor (`std::alloc` kullanıyor), `#![no_std]` ve `feature` bayrağı **yok**. Yüzey dar: `abi_version`, `route_hops`, `edge_weight_q16`, `chunk_count`, `lane_for_chunk`, `digest32`, `kernel_alloc/free`. Dijkstra, DHT ve E2EE hâlâ TypeScript'te (`src/lib/mesh-routing.ts`, `src/lib/mesh/dht.ts`, `src/lib/e2ee.ts`).
- IPC: `src/kernel/ipc.ts` sabit 12 bayt başlıklı ikili çerçeve + Transferable kullanıyor. `SharedArrayBuffer`/`Atomics` **hiç kullanılmıyor**; `vite.config.ts` içinde COOP/COEP başlığı **yok** (crossOriginIsolated kapalı).
- Telemetri: `src/kernel/telemetry.ts` gerçek çekirdek olaylarını (send/route/error, ms) topluyor; `src/lib/mesh/link-metrics.ts` RTT/bant ölçüyor. Ancak `src/components/Dashboard.tsx` topoloji, parçacık akışı ve log akışını `Math.random()` + `SIM_LOGS` ile üretiyor (satır ~69-71, 132, 225) — panelin görsel katmanı hâlâ simülasyon.
- TUN/VPN: Depoda **hiçbir** daemon, Wintun/utun/VpnService bağlayıcısı veya ham IP kapsülleme kodu yok. Aksine `src/lib/egress-guard.ts` genel internete çıkışı sert kodlu olarak yasaklıyor ve `src/lib/regulation.ts` exit node'u 5651 kapsamında açık risk olarak tanımlıyor.
- Dayanıklılık: `AppErrorBoundary`, `supervisor.ts`, `peer-trust.ts`, hayalet düğüm budaması mevcut; pasif sekme dondurmasına karşı `Navigator.locks`/Web Lock kullanımı yok.

## Hedef bazlı fizibilite ve rota

### 1. Gerçek telemetri (Yapılabilir — düşük risk)
- Tek kaynak: `src/lib/telemetry/live-store.ts` (yeni) — `node-runtime` eş listesi, `link-metrics` RTT/verim, `kernel/telemetry` sayaçları, `store/idb` kuyruk derinliği ve `kernelWorkerInfo()` Wasm durumunu birleştirir; `useSyncExternalStore` ile yayınlar.
- `Dashboard.tsx`: `SIM_LOGS` ve `Math.random()` parçacıkları kaldırılır; topoloji düğümleri gerçek `peers[]`, kenar kalınlığı gerçek `edge_weight_q16`, log akışı `kernelEvents()` olur.
- Veri yoksa "ölçüm yok" durumu gösterilir — uydurma değer üretilmez.

### 2. Zero-copy SharedArrayBuffer (Yapılabilir — orta risk)
- Ön koşul: COOP/COEP başlıkları (`vite.config.ts` dev server + üretim yanıt başlıkları). `crossOriginIsolated === false` olan ortamlarda (bazı iframe/preview) SAB kullanılamaz → mevcut Transferable yolu **yedek olarak korunur**.
- `src/kernel/shared-ring.ts`: tek yazar/tek okur halka tampon; `Atomics.wait` yalnız worker tarafında, ana iş parçacığında `Atomics.waitAsync` veya notify + mesaj.
- Wasm belleği `WebAssembly.Memory({ shared: true })` ile paylaşılır; Rust tarafı `atomics` hedef özelliği ile derlenir. Rota tablosu ana iş parçacığına `Uint32Array` görünümü olarak verilir, kopya yok.
- Risk: paylaşımlı Wasm belleği yeniden derleme (`+atomics,+bulk-memory`) gerektirir; ABI sürümü 2'ye çıkarılır ve eski `.wasm` ile geriye dönük uyum `abi_version()` kontrolüyle korunur.

### 3. Self-heal güvenlik (Yapılabilir)
- Zarf doğrulama kasası: imza + tekrar (replay) penceresi + `digest32` mükerrer filtresi tek noktada (`src/lib/mesh/guard.ts`), imzasız/geçersiz paket sayacı panele bağlanır.
- Rota iyileştirme: kenar başarısızlığında ağırlığa üstel ceza, N hatadan sonra kenar karantinası ve periyodik iyileşme (decay); DHT'den yeniden keşif.
- Hata sınırları: her shell uygulaması için yeniden başlatma sayacı, worker çökerse `supervisor.ts` üzerinden yeniden doğuş + TS motoruna düşüş.

### 4. `#![no_std] + alloc` saf çekirdek (Yapılabilir — kademeli)
- `Cargo.toml`'a `[features] default=["wasm"] wasm=[] std=[] bare=[]` eklenir; `lib.rs` başına `#![cfg_attr(not(feature="std"), no_std)] extern crate alloc;`.
- Mevcut `std::alloc` çağrıları `alloc::alloc` ile değiştirilir; `bare` için `#[global_allocator]` (talc/linked_list_allocator) ve `panic_handler` ayrı modülde.
- Dijkstra ve DHT çekirdeğe **kademeli** taşınır (önce Dijkstra, sonra DHT); TS motoru referans uygulama olarak kalır ve testlerde birebir eşitlik doğrulanır.

### 5. TUN/VPN + native daemon (Teknik olarak mümkün — yasal olarak bloklu)
- Tarayıcı/PWA'da TUN **imkânsızdır**; zorunlu olarak ayrı bir yerel daemon gerekir: `crates/tedbirge-daemon` (Rust, `std` feature) + Wintun/utun/Android VpnService bağlayıcıları + WebOS'a yerel WSS kontrol kanalı.
- Ancak mevcut ürün doktrini ve `egress-guard.ts` genel internet çıkışını yasaklıyor; 3. taraf uygulama trafiğini komşu düğüm üzerinden internete çıkarmak 5651 kapsamında "erişim/toplu kullanım sağlayıcı" sıfatı doğurur.
- Önerilen kapsam: **split-tunnel, yalnızca Tedbirge ağına ait özel adres bloğu** (kurum içi mesh erişimi). Genel internet çıkışı varsayılan kapalı, ayrı kurumsal lisans ve sözleşme eki olmadan etkinleştirilemez.
- Bu madde ayrı bir faz ve ayrı onay gerektirir; bu plandaki diğer maddelerle birlikte uygulanmaz.

### 6. Stabilite ve kod sağlığı
- Pasif sekme: `navigator.locks` + `Web Lock` ile tek etkin düğüm seçimi, `setInterval` yerine worker zamanlayıcısı (worker'lar throttle edilmez).
- Bellek: worker abonelik/timer sızıntı denetimi, IDB budama eşikleri, halka tamponun sabit boyutu.
- CI: `tsgo --noEmit`, vitest, `cargo test` + `cargo build --target wasm32` üçlüsü tek betikte.

## Uygulama sırası (önerilen)

1. Faz A — Gerçek telemetri (Hedef 1) ve simülasyon temizliği.
2. Faz B — Self-heal güvenlik + rota karantinası (Hedef 3) ve stabilite önlemleri (Hedef 6).
3. Faz C — `no_std` + feature bayrakları, Dijkstra'nın çekirdeğe taşınması (Hedef 4).
4. Faz D — SharedArrayBuffer/Atomics halka tamponu, COOP/COEP, ABI v2 (Hedef 2).
5. Faz E — (Ayrı onay) daemon + split-tunnel TUN fizibilite prototipi (Hedef 5).

## Riskler

- COOP/COEP açılması üçüncü taraf gömülü içerikleri (harita, ödeme iframe'i) kırabilir → yalnız WebOS rotalarında uygulanır.
- Paylaşımlı Wasm belleği tüm tarayıcılarda yok → çift yol (SAB / Transferable) kalıcı olarak korunur.
- Dijkstra'nın Rust'a taşınması davranış farkı doğurabilir → TS motoruyla eşitlik testi zorunlu.
- Hedef 5 yasal sınır nedeniyle ürün doktrinini değiştirir; onaysız uygulanmaz.
