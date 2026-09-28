# Faz 4 & 5 + Çift Yönlü Evrensel Ağ Geçidi — Uygulama Planı

Önceki turda Faz 4'ün temel taşları eklendi (`vector-clock.ts`, `packet-gate.ts`,
`gossip.ts`, `datachannel.ts`) ama entegre edilmedi. Faz 5 ve Ağ Geçidi hiç
başlamadı. Bu plan kalan işi dört küçük teslimat halinde bitirir; her teslimat
kendi başına derlenir ve test edilebilir.

## Kapsam

### Teslimat A — Faz 4 entegrasyonu (mesh + CRDT + arbiter kapısı)
- `p2p/axiom-mesh` içine gossip + vector-clock aboneliği ekle; her düğüm kendi
  saatini ilan etsin, gelen kanıtları saat sıralı özümlesin.
- `packet-gate` fonksiyonunu tüm giden P2P paketlerinde zorunlu kıl (SSRF, IP
  filtre, boyut kapısı) ve reddedilen paketleri diagnostics'e düşür.
- `sync/queue` offline outbox'ı gossip'e bağla (bağlantı gelince otomatik pump).

### Teslimat B — Faz 5 çekirdek (Desktop IPC + ZK yetki + hot-patch iskeleti)
- `shell/shell-context` üzerine tek yönlü `desktopIpc` post kanalı (uygulamalar
  arası tipli mesaj), imzalı capability token doğrulaması.
- `.tbapp` runtime'ına "hot swap" kancası: aynı `app_id` için yeni imzalı paket
  gelirse eski pencereleri kapatmadan iç modülü değiştir; imza doğrulaması
  başarısızsa geri al.
- Merkle state hook'unu IPC olaylarına bağla — her IPC çağrısı zincire yazılır.

### Teslimat C — Çift Yönlü Evrensel Ağ Geçidi (Faz 1: inbound REST + registry)
- `src/lib/gateway/registry.ts`: adapter kayıt, protokol × yön matrisi.
- `src/lib/gateway/adapters/rest.ts`: OpenAPI'den auto-probe, Zod'a çevirim,
  MCP tool olarak yayınla.
- `src/routes/api/public/gateway/[slug].ts`: inbound REST köprüsü (HMAC + rate
  limit + `packet-gate`).
- Diagnostics kartı: kaç adapter aktif, son 24s hata oranı, self-healing sayacı.

### Teslimat D — Ağ Geçidi Faz 2 (outbound + WS/SSE + webhook)
- Outbound REST/GraphQL çağrıları için SSRF'e karşı sertleştirilmiş fetch
  sarmalayıcı (`egress-guard` üstüne).
- WS/SSE proxy: sunucu tarafı köprü, istemci `wss://` kanalına yönlendirir.
- Webhook alıcı: HMAC doğrulaması + otomatik retry outbox'ı.
- gRPC/SOAP/MQTT/AMQP için stub adapter'lar (roadmap.md'ye "faz 3" olarak
  düşülür — bu turda üretim seviyesinde uygulanmaz).

## Teknik notlar

- Her teslimattan sonra: `bunx tsgo --noEmit`, `bunx vitest run` etkilenen
  klasörler, `/tmp/observability/build-errors.log` kontrolü.
- Gerçek Z3/Lean WASM hâlâ yok — hiçbir gateway çağrısı sahte mühür üretmez.
- Girdi gövdesi loglanmaz; yalnız boyut, süre ve verdict metriği tutulur.
- Değişiklikler `AGENTS.md`'ye "gateway modülü tek doğruluk kaynağı
  `src/lib/gateway/`" satırı ekler.

## Kredi ve teslim sırası

Sırayla A → B → C → D. Her teslimat bittiğinde canlı önizlemeden sonucu
raporlarım. Kredi biterse bir sonraki teslimattan devam edilir; yarım kalmış
kod bırakılmaz.

## Onay

Bu plan onaylanır onaylanmaz Teslimat A ile başlarım. Sıra veya kapsamı
değiştirmek isterseniz plan üzerinde işaretleyin.
