# AXIOM Faz 3 — Doğrulama Motoru, Panik Koruması, MCP ve Kanıt Görüntüleyici

Faz 2 (dil tanıma, yapı ağacı, değişmez eşleşmeleri, ağ düğümü) korunur. Faz 3 bunun üzerine
simgesel doğrulama katmanını, sert zaman aşımını, dış dünyaya açılan MCP uç noktasını ve
mühürlü kanıt kartını ekler.

## Önce netleştirilen iki sınır

1. **Dosya yolları mevcut düzene uyar.** Emirde `src/core/kernel.worker.ts`,
   `src/network/mcp_server.ts` ve `src/components/ProofViewer.tsx` geçiyor; projede bu klasörler
   yok. Aynı roller sırasıyla `src/lib/axiom/kernel.worker.ts`, `src/lib/axiom/net/mcp-server.ts`
   ve `src/components/axiom/ProofViewer.tsx` dosyalarıyla karşılanır.
2. **Gerçek Z3 / Lean 4 WASM ikilisi depoda yok ve CDN yasak.** Bu fazda motor arayüzü,
   yükleyici ve mühür zinciri gerçek olarak kurulur; ikili bulunamadığında determinist
   **Mock Engine** yanıt verir ve arayüz motorun "mock" olduğunu açıkça yazar. İkili daha sonra
   `public/axiom/z3.wasm` / `lean.wasm` olarak eklendiğinde kod değişikliği gerekmez.

## Adım adım uygulama

### 1. Doğrulama motoru (çekirdek daemon içinde)

- `src/lib/axiom/verify/types.ts` — `EngineId = "z3" | "lean4" | "mock"`,
  `ProofStep { index, rule, detail }`, `VerifyVerdict = "200_PROVEN" | "409_REFUTED" |
  "422_UNDECIDED" | "504_EXECUTION_TIMEOUT" | "500_PANIC"`, `VerifyResult { engine, verdict,
  steps, ms, cid, seal }`.
- `src/lib/axiom/verify/smt.ts` — AXIOM-IR + değişmez kayıtlarını SMT-LIB 2 önermelerine çevirir
  (nicelik/birim kısıtları, korunum yasaları, negasyon).
- `src/lib/axiom/verify/lean.ts` — aynı IR'den Lean 4 `theorem` iskeleti üretir; biçimsel
  kayıtlar (halting, Gödel) ve mühendislik standartları için hedef önerme kurar.
- `src/lib/axiom/verify/loader.ts` — `public/axiom/*.wasm` varlığını `fetch(HEAD)` ile yoklar,
  bulursa `WebAssembly.instantiateStreaming`, bulamazsa mock motora düşer; sonuç tek sefer
  önbelleklenir.
- `src/lib/axiom/verify/mock.ts` — çelişki/ilgi eşleşmelerinden determinist adım listesi ve
  karar üretir (aynı girdi → aynı çıktı).
- `src/lib/axiom/verify/engine.ts` — `verify(ir, text, matches)`: motor seç → önerme üret →
  çalıştır → adımları ve kararı döndür.
- `kernel.worker.ts`: `verify` istek/yanıt tipleri, `analyze` sonrası isteğe bağlı doğrulama,
  RAM muhasebesine `kanit:<cid>` kaydı.

### 2. Zaman aşımı ve panik koruması

- `src/lib/axiom/verify/guard.ts` — her doğrulamaya 500 ms sert bütçe: `AbortController` +
  `performance.now()` ölçümü; WASM tarafı için ayrı `Worker` üzerinde çalıştırma ve süre aşımında
  `terminate()`.
- Süre aşımı → `504_EXECUTION_TIMEOUT`; WASM `unreachable`/bellek çöküşü → `500_PANIC`.
- **Sıfır günlük kuralı:** panik ve zaman aşımı yollarında girdi metni, IR veya bellek içeriği
  hiçbir yere yazılmaz; yalnız `{ verdict, ms, engine }` taşınır. `console.*` çağrısı yok.
- `src/components/axiom/VerifyBoundary.tsx` — React error boundary; çökme mesajını göstermez,
  yalnız Türkçe "doğrulama kesildi, veri sızdırılmadı" kartı ve yeniden dene düğmesi.

### 3. CSP / derleme manifestosu

- `src/routes/__root.tsx` içindeki CSP meta değerine `script-src 'self' 'wasm-unsafe-eval'`
  eklenir; `worker-src 'self' blob:` korunur.
- `src/lib/coi-headers.ts` başlık seti aynı CSP'yi sunucu yanıtında da verir (yalıtım başlıkları
  bozulmadan).
- Bare-metal imaj tarafı: `image/` altındaki nginx yapılandırmasına aynı CSP satırı eklenir,
  böylece ISO'da da WASM çalışır.

### 4. Evrensel MCP uç noktası

- `src/lib/axiom/net/mcp-server.ts` — JSON-RPC 2.0 gövde doğrulaması (Zod), metotlar:
  `axiom.verify`, `axiom.analyze`, `axiom.capabilities`; standart hata kodları
  (-32600/-32601/-32602/-32000).
- `src/routes/api/public/v1/mcp/verify.ts` — `POST` handler; yalnız bu yol dış çağrıya açıktır,
  `src/lib/cors.ts` izin listesi uygulanır, gövde 64 KB ile sınırlanır, istek başına 500 ms bütçe.
  (Emirdeki `/api/v1/mcp/verify` yerine projenin kamusal API öneki kullanılır;
  istenirse `/api/v1/...` yönlendirmesi de eklenir.)
- `src/lib/axiom/net/llm-adapters.ts` — OpenAI tool-call, Anthropic tool ve düz JSON-RPC
  istemcileri için istek/yanıt dönüştürücüler; `axiom.capabilities` araç şemasını döner.
- Faz 2'deki 5 düğüm ücretsiz sınırı korunur: sınır aşılırsa `SUBSCRIPTION_REQUIRED` döner.

### 5. Kanıt görüntüleyici

- `src/components/axiom/ProofViewer.tsx` — motor rozeti (Z3 / Lean 4 / Mock), numaralı adım
  listesi, CID hash, süre (ms) ve karara göre mühür kartı:
  `STATUS: 200_PROVEN` + `TEDBİRGE-WEBOS-ZKP` mührü, çürütmede `409_REFUTED`, zaman aşımında
  `504_EXECUTION_TIMEOUT`.
- `src/lib/axiom/verify/seal.ts` — CID: içerik + motor + karar üzerinden determinist hash;
  mühür dizesi `TEDBİRGE-WEBOS-ZKP:<cid kısa>`.
- `AxiomApp.tsx` — "Doğrula" düğmesi, `VerifyBoundary` ile sarılı `ProofViewer`; mock motorda
  "bu mühür simülasyondur" satırı görünür.
- Tüm renkler `--tb-*` token'larından; yeni bağımlılık ve CDN yok; her dosyada telif başlığı.

### 6. Testler ve kapılar

- `src/lib/axiom/__tests__/axiom-verify.test.ts` — SMT/Lean önerme üretimi, mock motor
  determinizmi, 500 ms zaman aşımı kararı, panik yolunda sızıntı olmaması (çıktı alanları
  beyaz liste), CID kararlılığı.
- `src/lib/axiom/__tests__/axiom-mcp.test.ts` — JSON-RPC geçerli/geçersiz istek, bilinmeyen
  metot, gövde sınırı, LLM adaptör dönüşümü.
- `bunx tsgo --noEmit`, `bunx eslint src`, `bunx vitest run`, `bun run build`,
  `bun run security:check` yeşil olacak; Playwright ile "Doğrula" akışı ve mühür kartı görsel
  olarak teyit edilecek.

## Kapsam dışı

Ücretlendirme/abonelik tahsilatı, hakem düğüm onayı ve sahte imza banı, SDK paketleme ve
CI/CD rozetleri sonraki faza bırakılır. Gerçek Z3/Lean WASM ikilileri depoya eklenene kadar
arayüz "kanıt simülasyondur" ibaresini kaldırmaz.
