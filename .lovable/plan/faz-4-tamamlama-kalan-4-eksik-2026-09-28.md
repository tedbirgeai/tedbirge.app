# Faz 4 Tamamlama — Kalan 4 Eksik

## Kaynakta doğrulanan mevcut durum
- `LogsPanel.tsx` şu an yalnız portal kayıtlarını ve taşıyıcı sayaç olaylarını gösteriyor. Servis yöneticisinin `events()` ve `subscribe()` çıktısı hiçbir yerde okunmuyor.
- `src/lib/browser-node.ts` her eş için tek bir `RTCPeerConnection` ve tek veri kanalı tutuyor. `ondatachannel` gelen her kanalı etiketine bakmadan `bindChannel` işlevine veriyor; ikinci bir kanal açılsaydı mevcut sohbet kanalının üzerine yazardı. Mesh-sync servisi yalnız `openLocalLink` (sekmeler arası) kullanıyor.
- `crates/` altında `tedbirge-sysbridge` var, ancak `tedbirge-truthd` diye bir program yok. `tedbirge-truth.service` programı bulamazsa atlanıyor.
- `ServicesCard` üzerindeki yeniden başlat düğmesinde yetki kontrolü yok. Projede `usePanelRole` bulunuyor (admin/operator/viewer, `canOperate`).

## 1. Servis olayları Kayıtlar sekmesine
- `services.ts` içine `useServiceEvents()` eklenir: servis adı, durum ve kısa neden. Kullanıcı verisi yazılmaz.
- LogsPanel kaynağına eklenir: `failed` → hata, `degraded` → uyarı, diğer durumlar → bilgi; kaynak adı "servis". Duraklatma, filtre, 5000 satır sınırı ve CSV/NDJSON dışa aktarma bu olayları da kapsar.

## 2. Gossip'in gerçek WebRTC eşlerine bağlanması
- `datachannel.ts`: mevcut kanal sarmalayıcısı `wrapGossipChannel(dc)` olarak ayrılır ve hem açan hem gelen taraf aynı kodu kullanır. `createLinkHub()` birden çok bağlantıyı tek bağlantı gibi gösterir: gönderim tüm hazır bağlantılara gider, alım tek akışta birleşir.
- `browser-node.ts`: sohbet kanalına dokunulmadan her eş için `axiom-gossip` etiketli ikinci bir kanal açılır. `ondatachannel` etikete göre ayırır; eş kopunca bağlantı merkezden çıkarılır. Dışarıya yalnız `onGossipLink(fn)` aboneliği açılır.
- `mesh-sync` servisi yerel sekme bağlantısı ve WebRTC bağlantılarını aynı merkezde toplar. Giden yük önceki gibi `packet-gate` kapısından, iletilen paketler `receivePacket` kapısından geçer. Kendi yankısı ve tekrar paketleri mevcut korumalarla düşer.

## 3. `tedbirge-truthd` programı
- Yeni `crates/tedbirge-truthd` crate'i: `/run/tedbirge/tedbirge_truth.sock` Unix soketinde satır başına bir JSON (NDJSON) konuşur, en fazla 16 KB istek kabul eder ve 500 ms süre sınırı uygular.
- `tedbirge-kernel` kısıt denetimini kullanır. Çelişki varsa `409_REFUTED` döner; aksi hâlde gerçek çözücü olmadığından `422_UNDECIDED` döner. Sahte `200_PROVEN` ya da mühür üretilmez.
- `sd_notify` ile READY ve WATCHDOG sinyalleri gönderilir; birim `Type=notify` kalır.
- ISO iş akışında (GitHub Actions) derlenip `/opt/tedbirge/tedbirge-truthd` konumuna kopyalanır; yerel ISO derlemesi yapılmaz. `check-image-config.sh` betiğine kopyalama adımının varlığı eklenir.

## 4. Yeniden başlat yetkisi
- `ServicesCard` ekranında `usePanelRole(...).canOperate` doğru değilse düğme gizlenir ve "Yetki: görüntüleyici" notu gösterilir.
- `services.ts` içindeki `restart()` IPC üzerinden çağrıldığında `desktop-ipc` tek kullanımlık yetki jetonu zorunludur; jetonsuz istek reddedilir.
- Not: Oturum açılmamışsa mevcut kural rolü "görüntüleyici" sayar, yani düğme görünmez. Kendi hesabının sahibi olan kullanıcı yönetici sayılır.

## Test ve doğrulama
- Vitest: olayların log satırına dönüşümü ve seviye eşlemesi; bağlantı merkezinde ekleme, çıkarma ve yayın; etiket ayrımı (sohbet kanalı etkilenmez); reddedilen paketin WebRTC bağlantısına gitmemesi; yetkisiz rol için düğmenin gizlenmesi.
- Rust: `cargo test -p tedbirge-truthd` ile çelişki → 409, belirsiz → 422, 16 KB aşımı ve süre sınırı.
- `bunx tsgo --noEmit`, tüm Vitest paketi, `scripts/check-image-config.sh`.
- Playwright: servis düşürüldüğünde Kayıtlar sekmesinde satır görünmesi; iki sekme arasında paket yayılımı.
- Sınır: gerçek iki cihazlı WebRTC ve systemd/QEMU bu ortamda denenemez; bunlar birim testleri ve statik denetimle sınırlı kalır.

## Değişecek dosyalar
- `src/shell/services/services.ts`, `src/components/shell/apps/portal/LogsPanel.tsx`, `ServicesCard.tsx`
- `src/lib/axiom/net/datachannel.ts`, `src/lib/browser-node.ts`
- `crates/tedbirge-truthd/*`, `crates/Cargo.toml`, ISO iş akışı, `scripts/check-image-config.sh`
- `roadmap.md`
