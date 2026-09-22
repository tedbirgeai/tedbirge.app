# Faz 3 — ZK Durum Makineleri ve Uygulama Durum Geçişleri

Uygulama durum değişiklikleri artık tek tek önermeler olarak değil, birbirine bağlı
sıralı bir durum zinciri olarak tutulacak. Her geçiş özetlenir, önceki özetle
bağlanır ve AXIOM çekirdeğinin kararıyla (kanıtlandı / reddedildi / kararsız)
işaretlenir. Ham veri hiçbir aşamada zincire yazılmaz — yalnız özeti taşınır.

## Ne yapılacak

1. **Durum ağacı (Merkle) katmanı**
   - Her durum mutasyonu bir yaprak özetine dönüşür; yapraklar ikili ağaçta
     birleşerek tek bir kök özeti (state root) üretir.
   - Tek yaprağın kanıt yolu (kardeş özetler listesi) üretilir ve bu yolla
     yaprağın köke ait olup olmadığı ham veriye bakılmadan doğrulanabilir.
   - Özet üretimi mevcut CID üretimiyle aynı deterministik yöntemi kullanır:
     aynı girdi her zaman aynı kök.

2. **Ardışık durum zinciri**
   - Her geçiş kaydı: sıra numarası, önceki kök, yeni kök, karar, süre, zaman.
   - Önceki kök hafızada tutulur; yeni geçiş ona bağlanır. Bağ kopuksa kayıt
     kabul edilmez (zincir çatallanması engellenir).
   - Zincir uzunluğu sınırlıdır; en eski kayıtlar tek bir sıkıştırılmış kök
     altında birleştirilerek bellek şişmesi önlenir.

3. **Sıfır bilgi kanıt uygulama kancaları**
   - Bir geçiş doğrulamaya gönderilirken yalnız durum özeti ve geçiş türü
     taşınır; alan değerleri ve kullanıcı metni taşınmaz.
   - Karar `200_PROVEN` ise geçiş mühürlenir ve zincire işlenir.
   - Karar `409_REFUTED` ise geçiş reddedilir, zincir değişmeden kalır.
   - Kararsız, zaman aşımı ve panik yollarında mühür üretilmez ve zincir
     dokunulmaz kalır (mevcut sahte mühür yasağı korunur).

4. **Arayüz**
   - AXIOM uygulamasına "Durum Zinciri" kartı: son geçişler, kök özetinin kısa
     biçimi, karar rozeti ve reddedilen geçiş sayacı — hepsi sade Türkçe.
   - Renkler yalnız mevcut `--tb-*` değişkenlerinden okunur.

5. **Kapılar**
   - Tip denetimi, Merkle kök/kanıt yolu testleri, zincir bağ testleri, tüm
     Vitest paketi, biçim denetimi, güvenlik denetimi ve derleme tek tabloda
     raporlanır.

## Teknik ayrıntı

**Yeni dosyalar**
- `src/lib/axiom/zk/merkle.ts` — `leafDigest`, `buildTree`, `merkleRoot`,
  `proofPath`, `verifyProof`. Özetleme `verify/seal.ts` içindeki FNV-1a
  türevini yeniden kullanır (yeni bağımlılık yok).
- `src/lib/axiom/zk/state-chain.ts` — `StateTransition`, `StateChain`,
  `emptyChain`, `appendTransition` (önceki kök denetimi + reddetme),
  `compactChain`, `getChain`/`subscribeChain` (referans sabitliği korunur,
  `useSyncExternalStore` sonsuz döngüsü oluşmaz).
- `src/lib/axiom/zk/execute.ts` — `proveTransition(kind, digest)`: geçiş
  özetini `verify/engine.ts` üzerinden çalıştırır, kararı zincire yazar.
  Girdi metni yerine yalnız `digest` gönderilir.
- `src/components/axiom/StateChainCard.tsx` — zincir kartı.
- `src/lib/axiom/zk/__tests__/merkle.test.ts` ve `state-chain.test.ts`.

**Değişecek dosyalar**
- `src/components/axiom/AxiomApp.tsx` — Durum Zinciri kartının bağlanması.
- `src/lib/axiom/i18n.ts` — kart metinleri.

**Korunacak değişmezler**
- Canlı WASM yoksa `200_PROVEN` mührü üretilmez.
- 500 ms yumuşak / 750 ms sert bütçe ve worker infaz kalkanı aynı kalır.
- Ham metin, alan değerleri ve gizli veri hiçbir kayda, olaya veya günlüğe
  yazılmaz.
- `limen_mount_lock` ve VFS izin modeli değiştirilmez.
