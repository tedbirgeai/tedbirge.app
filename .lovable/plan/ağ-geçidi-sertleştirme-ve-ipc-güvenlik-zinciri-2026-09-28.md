# Ağ Geçidi Sertleştirme ve IPC Güvenlik Zinciri

Onaylanan sıraya birebir uyar. Her adım kendi başına derlenir.

## 1. Adaptör tipi genişletmesi — `src/lib/gateway/registry.ts`

- `GatewayAdapter` tipine `strictHmac?: boolean` alanı eklenir: imza zorunluluğu
  artık adaptörün kendi beyanından okunur.
- `registerAdapter` bu alanı olduğu gibi saklar; `collectMetrics` çıktısına
  `strictHmac` yansıtılır ki tanılama kartı hangi köprünün imza zorunlu
  olduğunu gösterebilsin.
- `src/lib/gateway/adapters/rest.ts` içindeki `RestInboundConfig` ve
  `registerRestInbound` bu alanı geçirir; `src/lib/gateway/bootstrap.ts`
  içinde `webhook` adaptörü `strictHmac: true` ile kaydedilir.

## 2. Çıkış filtresi sertleştirmesi — `src/lib/gateway/outbound.ts`

Mevcut regex listesi yetersiz; aşağıdaki kapılar eklenir:

- Sıfır adres (`0.0.0.0`, `0`), tamsayı/sekizli kısaltmalı IPv4 (`21307064330`,
  `0177.0.0.1`) — ana makine adı sayısal ise 32-bit tamsayıya çevrilip özel
  blok testinden geçirilir.
- IPv4-eşlenmiş IPv6 (`::ffff:127.0.0.1`, `[::ffff:a9fe:a9fe]`) — köşeli parantez
  soyulur, `::ffff:` öneki ayrıştırılıp IPv4 kuralları uygulanır.
- Bulut metadata hedefleri: `169.254.169.254`, `metadata.google.internal`,
  `metadata`, `instance-data`.
- Yönlendirme zinciri: `redirect: "manual"` ile yanıt alınır; 3xx durumunda
  `Location` aynı filtreden geçirilerek en çok 3 adım izlenir.
- Tüm redler `recordCall(slug, false)` ile sayılır ve gerekçe döner; gövde metni
  loglanmaz.

Birim testleri `src/lib/gateway/__tests__/outbound.test.ts` içine yazılır:
her kaçış vektörü için red, normal https hedef için kabul.

## 3. Giriş köprüsü — `src/routes/api/public/gateway/$slug.ts`

- `src/lib/api-rate-limit.server.ts` üzerindeki mevcut sayaç kullanılarak IP +
  slug başına pencere sınırı uygulanır; aşımda `429` ve `Retry-After`.
- `adapter.strictHmac === true` ise imza başlığı yokken veya env sırrı tanımlı
  değilken istek `401` ile reddedilir (sessizce imzasız kabul yok).
- Gövde bir kez ayrıştırılır (şu an `JSON.parse` iki kez çağrılıyor), sonuç
  değişmez kapısına verilir.

## 4. Uygulama arası mesajlaşma — `src/shell/desktop-ipc.ts`

- `postIpc` artık `cap` alanını `src/lib/vfs/tokens.ts` doğrulayıcısıyla
  kontrol eder; geçersiz/süresi geçmiş yetki jetonu olan mesaj gönderilmez ve
  alıcı tarafta da ikinci kez doğrulanır.
- Kabul edilen her mesaj `src/lib/axiom/zk/state-chain.ts` üzerinden zincire
  yazılır; yalnız `from`, `to`, `kind` ve gövde özeti işlenir — gövde içeriği
  asla saklanmaz.
- Reddedilen mesajlar için sayaç tutulur; tanılama kartı bu sayacı okur.

## 5. Yol haritası eşitlemesi — `roadmap.md`

- Faz 3 satırına `GraphQL` adaptörü eklenir.
- Bu turda tamamlanan üç sertleştirme maddesi işaretlenmiş olarak yazılır.

## Doğrulama

- `bunx tsgo --noEmit -p tsconfig.json`
- `bunx vitest run src/lib/gateway src/shell src/lib/p2p`
- Derleme günlüğü kontrolü ve canlı önizleme durumu raporlanır.

Gerçek Z3/Lean WASM olmadığı sürece hiçbir köprü mühürlü başarı üretmez.
