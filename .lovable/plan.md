# AXIOM Faz 4 — Faturalandırma, Hakem Düğümler, CRDT, SDK ve Rozetler

Faz 3'ün doğrulama motoru ve MCP uç noktası üzerine beş yeni yetenek eklenir. Hiçbir mevcut dosyanın davranışı bozulmaz; doğrulama zinciri, yedek motor ve mühür kartı olduğu gibi kalır.

## Dürüstlük sınırı (önce okunmalı)

- Gerçek para akışı yok: faturalandırma paneli, MCP çağrılarının **gerçek sayımı** üzerinden ücret hesaplar ama hiçbir ödeme sağlayıcısına (Paddle) bağlanmaz. Kart "test/ölçüm kipi" yazar.
- Hakem düğüm onayı ve düğüm ödülleri, ağda gerçek üçüncü taraf hakem bulunmadığı için **benzetimdir** ve kartlarda açıkça "simülasyon" ibaresi taşır.
- CRDT senkronizasyonu gerçek çalışır (yerel depo + mevcut röle/P2P kanalı); ağ yoksa çevrimdışı kuyrukta bekler.
- SDK/derleyici eklentileri **şablon üreticidir**: gerçek bir Rust/Java derleyici eklentisi kurmaz, kopyalanabilir kaynak metni ve CI iş akışı üretir.

## Dosya yapısı

Emirdeki `src/core/*` ve `src/sdk/*` yolları, projenin mevcut düzenine (`src/lib/axiom/...`) eşlenir; başka türlü ithal koruması ve test düzeni bozulur.

Yeni — faturalandırma
- `src/lib/axiom/billing/tariff.ts` — motor başına birim ücret (Z3 0.001, Lean 4 0.010, Omni-Science 0.050 USD), para birimi ve yuvarlama kuralları.
- `src/lib/axiom/billing/meter.ts` — çağrı defteri: motor, gecikme (ms), müşteri anahtarı özeti, tutar; toplamlar, p50/p95 gecikme, saatlik seri. Girdi metni asla yazılmaz.
- `src/lib/axiom/billing/store.ts` — defterin yerel kalıcılığı (IndexedDB/VFS, mevcut depolama katmanı kullanılır) ve 30 günlük pencere.

Yeni — hakem düğümler ve CRDT
- `src/lib/axiom/net/arbiters.ts` — üç hakem düğüm benzetimi: mühür + CID üzerinden bağımsız sıfır-bilgi denetimi, çoğunluk kararı (2/3), sahte imza reddi.
- `src/lib/axiom/sync/crdt.ts` (emirdeki `crdt_sync.ts`) — LWW-Element-Set + vektör saati; `merge`, `delta`, `apply` ile çakışmasız birleşme.
- `src/lib/axiom/sync/queue.ts` — çevrimdışı delta kuyruğu; ağ gelince mevcut röle kanalıyla gönderim, idempotent uygulama.

Yeni — SDK ve CI
- `src/lib/axiom/sdk/adapters.ts` — Node.js, Python, Rust, Java, Go, C#, HDL için MCP çağrısı yapan adaptör şablonları (metin üreticiler).
- `src/lib/axiom/sdk/compiler-macros.ts` — `#[axiom_verify]`, `@axiom_proof`, `@AxiomVerify`, `[AxiomProof]` makro/annotation şablonları ve kullanım örnekleri.
- `src/lib/axiom/sdk/ci-bot.ts` — `axiom-proof-action` iş akışı metni ve denetim simülatörü (dosya listesi → karar özeti, PR yorumu taslağı).
- `src/lib/axiom/sdk/provenance.ts` — npm, crates.io, PyPI, Maven, NuGet, GoPkg için rozet verisi ve SVG/markdown çıktısı.

Yeni — arayüz (hepsi `--tb-*` token'ları, sabit renk yok)
- `src/components/axiom/BillingDashboard.tsx` — motor kırılımı, canlı ms gecikme, biriken USD, saatlik grafik.
- `src/components/axiom/ArbiterPanel.tsx` — üç hakem düğüm durumu, 2/3 çoğunluk kararı, sahte imza reddi göstergesi.
- `src/components/axiom/SyncStatusCard.tsx` — çevrimdışı kuyruk uzunluğu, son birleşme, çakışma sayacı.
- `src/components/axiom/SdkPanel.tsx` — 7 dil sekmesi, makro şablonları, kopyala düğmesi, CI iş akışı metni.
- `src/components/axiom/ProvenanceBadge.tsx` — 6 paket deposu için `STATUS: 200_PROVEN` rozet kartı + markdown/SVG kopyalama.
- `src/components/axiom/RewardsCard.tsx` — düğüm kredisi, başarılı doğrulama sayısı, kazanç (ağ kredisi) göstergesi.

Değişecek mevcut dosyalar
- `src/components/axiom/AxiomApp.tsx` — yeni kartlar sekmeli bir düzene yerleştirilir (Konsol · Faturalandırma · Ağ · SDK); mevcut çözümleme/doğrulama akışı aynen korunur.
- `src/lib/axiom/net/mcp-server.ts` — her `axiom.verify` çağrısından sonra ölçüm defterine kayıt; yanıt biçimi değişmez.
- `src/routes/api/public/v1/mcp/verify.ts` — müşteri anahtarı özeti ve gecikme ölçümünün deftere aktarılması.
- `src/lib/axiom/i18n.ts` — yeni arayüz metinleri (tr/en).

Testler
- `src/lib/axiom/__tests__/axiom-billing.test.ts` — tarife, toplam, p95, yuvarlama.
- `src/lib/axiom/__tests__/axiom-crdt.test.ts` — sıra bağımsız birleşme, yineleme dayanıklılığı, çakışma çözümü.
- `src/lib/axiom/__tests__/axiom-arbiters.test.ts` — 2/3 çoğunluk, bozuk mühür reddi.
- `src/lib/axiom/__tests__/axiom-sdk.test.ts` — şablon üretimi, rozet çıktısı, CI iş akışı biçimi.

## Uygulama adımları

1. Tarife + ölçüm defteri ve kalıcılığı yaz; MCP sunucusunu ve genel uç noktayı deftere bağla (girdi metni kaydı yasak).
2. Faturalandırma panelini kur: motor kırılımı, canlı gecikme, biriken USD, "ölçüm kipi" ibaresi.
3. CRDT çekirdeği ve çevrimdışı delta kuyruğunu yaz; röle kanalıyla idempotent gönderim.
4. Hakem düğüm benzetimi + 2/3 çoğunluk kararı; ProofViewer kartına hakem satırı, sahte imza reddi.
5. Senkronizasyon ve ödül kartlarını ekle (ödüller ağ kredisi, para değil).
6. SDK adaptörleri, makro şablonları, CI bot metni ve paket köken rozetlerini üret; panelde kopyalanabilir göster.
7. AxiomApp'ta sekmeli düzen; tüm metinler i18n'e girer.
8. Kapılar: `bunx tsgo --noEmit`, `bunx eslint src`, `bunx vitest run`, `bun run build`, `bun run security:check`; ardından tarayıcıda MCP çağrısı → panelde tutar/gecikme artışı, çevrimdışı→çevrimiçi CRDT birleşmesi, rozet üretimi canlı doğrulanır.

## Kapsam dışı

Gerçek ödeme alma, gerçek üçüncü taraf hakem düğüm ağı, gerçek derleyici eklentisi kurulumu, npm/crates yayımı, gerçek Z3/Lean WASM ikilileri.
