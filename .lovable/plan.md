# v5.3 — Beş Katmanlı Sertleştirme Uygulama Planı

Onaylanan fizibilite planındaki beş düzeltme sırayla koda uygulanır. Mevcut karar mantığı (sahte `200_PROVEN` üretmeme, mühürsüz yerel kapı, sıfır-günlük) değişmez.

## 1. C-ABI & Soket Köprüsü

- `src/lib/axiom/sdk/tedbirge_truth.h`: `tb_proof_t` içine `uint8_t _pad[2];` açık dolgu eklenir, böylece yapı doğal 4-bayt sınırına (212 bayt) hizalanır. `_Static_assert` ile `sizeof(tb_proof_t) == 212` derleme anında doğrulanır.
- Aynı başlıkta eşzamanlılık: tutamaç yapısına `pthread_mutex_t` alanı ve `tb_truth_verify` çağrısının kilit altında çalıştığı sözleşme belgelenir; `tb_truth_open`/`tb_truth_close` kilit ömrünü tanımlar.
- `src/lib/axiom/bridge/socket.server.ts`: tek soket üzerinde eşzamanlı isteklerin karışmasını önleyen sıraya alma (istek başına tekil id + tek akış kuyruğu) eklenir; 500 ms bütçe aşımında istek kuyruktan düşürülür.

## 2. Boyutsal Analiz Katmanı

- Yeni `src/lib/axiom/units.ts`: SI temel birim üs vektörü (M, L, T, I, Theta, N, J), birim ayrıştırıcı (J, W, N, Pa, V, A, K, mol, cd, kg, m, s ve türevleri) ve üs karşılaştırıcı.
- `src/lib/axiom/invariants.ts`: eşleştirmeye boyut denetimi eklenir. İddiadaki iki tarafın birim üsleri uyuşmuyorsa (ör. Joule = Watt, enerji = güç) sonuç doğrudan `celiski` olur ve motorda `409_REFUTED` üretir.
- `src/lib/axiom/verify/engine.ts` ve `live/fallback-verifier.ts`: boyut ihlali, WASM ikilisi olmasa da kesin reddetme yolunu izler (mühür yok).

## 3. İzole Worker & Watchdog

- `src/lib/axiom/kernel.worker.ts`: ağır WASM doğrulaması yalnız worker içinde yürür (bugün de böyledir; yol netleştirilir ve bütçe worker tarafında da uygulanır).
- Yeni `src/lib/axiom/worker-session.ts`: ana thread tarafında istek başına 500 ms sert denetçi; süre aşılırsa `worker.terminate()` çağrılır, `504_EXECUTION_TIMEOUT` döner ve sonraki istek için worker yeniden doğar.
- `src/components/axiom/AxiomApp.tsx`: "Servisi yeniden başlat" düğmesi bu oturum sıfırlamasını kullanır; ana thread yedek motoru yalnız worker hiç başlatılamadığında çalışır.

## 4. LIMEN VFS & Web Locks

- `src/lib/limen/mount.ts`: IndexedDB yazımları `navigator.locks.request("limen_mount_lock", ...)` içine alınır; API yoksa mevcut davranışa düşülür (tek geçişli iç kuyruk).
- `src/lib/limen/sync.ts`: otomatik pompalama aynı kilidi paylaşır, böylece çok sekmeli çakışma ve yarım mount oluşmaz.

## 5. Derleme ve Entegrasyon

- `bash scripts/build-kernel.sh` ile `crates/tedbirge-kernel` `wasm32-unknown-unknown` hedefine derlenir; çıktı `public/kernel/tedbirge_kernel.wasm`.
- `src/lib/axiom/live/wasm-runtime.ts` / `z3-adapter.ts`: yüklenen ikili gerçek ABI denetiminden geçerse `wasmVerified: true` ve `proofSeal` üretilir; geçmezse bugünkü gibi mühür üretilmez.
- Cargo araç zinciri bu ortamda yoksa derleme adımı raporlanır ve bayrak davranışı testlerle doğrulanır — sahte `true` üretilmez.

## Doğrulama kapıları

`bunx tsgo --noEmit`, `bunx vitest run` (boyut matrisi, watchdog zaman aşımı, mount kilidi için yeni testlerle), ESLint, `bun run security:check`, build.

## Kapsam dışı

Gerçek Z3/Lean 4 ikililerinin temini, fiziksel ISO/USB önyükleme ve çoklu cihaz WebRTC doğrulaması.
