# Faz 1 — AXIOM Çekirdek Tekilleştirme ve AST Tabanlı 409_REFUTED

Kapsam yalnız Faz 1. Bitince test/tip raporu sunulur ve Faz 2 için onay beklenir. Gerçek Z3/Lean ikilisi yokken mühürlü `200_PROVEN` üretilmez (değişmez ilke).

## Doğrulanmış mevcut durum

- `src/core/` 8 dosya içeriyor: `ask_ascii_parser`, `axiom_ir`, `kernel.worker`, `omni_*`, `axiom_billing_zkp`, `axiom_cabi_bridge`. `src/services/axiom/` bunların ikinci kopyalarını tutuyor.
- `src/core/kernel.worker.ts` ve `src/services/axiom/index.ts` koşulsuz `200_PROVEN` ve rastgele hash üretiyor — sahte kanıt kaynağı.
- `src/core/` yalnız `axiom_cabi_bridge` üzerinden kullanılıyor (`AxiomApp.tsx`, `AxiomMasterShell.tsx`). Bu köprü gerçek bağlantı kurmadan `isConnected = true` diyor ve `Math.random` "HMAC" üretiyor; bellek düzeni yok.
- `engine.ts` içindeki `evaluateDeterministicGate` sabit anahtar kelime listesiyle `409_REFUTED` veriyor.
- `tb_proof_t` (212 bayt, `_pad[2]`, `_Static_assert`) yalnız `src/lib/axiom/sdk/tedbirge_truth.h` içinde tanımlı; `crates/tedbirge-kernel/src/lib.rs` içinde bu yapı **yok** (sadece rota/ABI sürüm fonksiyonları).

## 1. Mükerrer kod temizliği

- Kanonik yer `src/lib/axiom/`. Zaten var olan karşılıklar: `lang/ask-ascii.ts`, `lang/axiom-ir.ts`, `invariants.ts`, `kernel.worker.ts`, `bridge/`.
- `src/core/axiom_cabi_bridge.ts` → `src/lib/axiom/bridge/cabi-layout.ts` (yeni, gerçek bayt düzeni; bkz. madde 3). İki bileşen importu buraya çevrilir; sahte "bağlandı" durumu kaldırılır, durum `bridge/` olay akışından okunur.
- `src/core/axiom_billing_zkp.ts` ve `src/services/axiom/crdt_sync.ts`: kullanıcı varsa `src/lib/axiom/` altına taşınır, yoksa silinir (uygulamada `rg` ile kesinleştirilir).
- Kalan tüm `src/core/*` ve `src/services/axiom/*` kopyaları silinir; `src/core/ask_ascii_parser.ts` mantığı `lang/ask-ascii.ts` ile birleştirilir (tek ayrıştırıcı).

## 2. AST tabanlı çelişki motoru

- `lang/ask-ascii.ts` çıktısından kısıt düğümleri (karşılaştırma, eşitlik, olumsuzlama, birim etiketli nicelik) çıkaran yeni `src/lib/axiom/verify/constraints.ts`.
- Kural tabanı AST üzerinde çalışır:
  - Sabit eşitlik çelişkisi (`1 = 2`, `0 = 1`, `false = true`) — sayısal/boolean literal değerlendirme.
  - Aralık çelişkisi (`x > 10 ∧ x < 5`) — değişken başına alt/üst sınır kesişimi.
  - Önerme çelişkisi (`p ∧ ¬p`) — aynı atomun olumlu/olumsuz birlikte bulunması, çift olumsuzlama normalize edilir.
  - Boyut çelişkisi — mevcut `units.ts` / `dimensionMismatch` AST düğümüne bağlanır.
  - Fiziksel invariantlar (sürekli hareket, >%100 verim) `invariants.ts` eşleşmesinden gelir, metin listesi değil.
- `evaluateDeterministicGate` metin listesi kaldırılır; yerine `findContradiction(ast)` → `409_REFUTED` + gerekçe adımı. Çelişki yoksa yerel mod `422_UNDECIDED` kalır, mühür yok.
- Unicode normalizasyonu (NFKC, `≠ ¬ ∧ ∨`) ayrıştırmadan önce.

## 3. C-ABI hizalaması

- `crates/tedbirge-kernel/src/lib.rs`: `#[repr(C)] pub struct TbProof { verdict: i32, engine: i32, wasm_verified: i32, ms: u32, cid: [u8;65], seal: [u8;129], _pad: [u8;2] }` + `const _: () = assert!(size_of::<TbProof>() == 212 && align_of::<TbProof>() == 4);` + `offset_of!` denetimleri.
- `bridge/cabi-layout.ts`: `DataView` tabanlı `encodeProof`/`decodeProof`, sabit ofsetler (0,4,8,12,16,81,210), NUL sonlu dizeler, uzunluk koruması.
- Test: TS ofsetleri = C başlığı ofsetleri; gidiş-dönüş kodlama; bozuk uzunlukta ret. Cargo mevcutsa `cargo check`, değilse raporda açıkça belirtilir.

## 4. Testler ve rapor

- Yeni testler: `constraints.test.ts` (literal, aralık, önerme, boyut, olumsuzlama, yanlış pozitif yok — `E = mc^2`, `x > 1 ∧ x < 5` 409 olmamalı), `cabi-layout.test.ts`.
- Silinen modüllere ait eski testler varsa güncellenir.
- Çalıştırılacak: `bunx tsgo --noEmit`, `bunx vitest run`, derleme günlüğü. Rapor gerçek sayıları verir (279 önceki sayıdır; ekleme/silme sonrası farklı olabilir).

## Kapsam dışı

Gateway, P2P, ISO, gerçek Z3/Lean ikilileri. Faz 2 onay beklenir.
