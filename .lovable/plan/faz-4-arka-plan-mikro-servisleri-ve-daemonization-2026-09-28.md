# Faz 4 — Arka Plan Mikro Servisleri ve Daemonization

## Kaynakta doğrulanan mevcut durum
- `src/shell/BackgroundServices.tsx` servisleri tek bir `useEffect` içinde `safeBoot` ile sırayla başlatıyor: offline-support, node-runtime, node-start, access-engine, offline-license ve viewport. Servislerin durumu, yeniden başlatma işlevi ya da bağımlılık sırası yok; bir servis düştüğünde yalnız günlüğe yazılıyor.
- `src/kernel/supervisor.ts` yalnız çekirdeği izliyor (3 deneme, sonra kurtarma, healthy/recovering/degraded). Diğer servislere uygulanmıyor.
- `src/lib/axiom/net/gossip.ts`, `datachannel.ts` ve `src/lib/axiom/sync/vector-clock.ts` hiçbir yerden içe aktarılmıyor; mesh gossip çalışma zamanına bağlı değil (yetim kod).
- `src/lib/axiom/sync/queue.ts` CRDT kuyruğu var, ancak gossip ile bağlantısı yok.
- ISO tarafında systemd birimleri mevcut: kiosk, gozcu, sysbridge, ready, installer ve autoinstall. `tedbirge_truth.sock` için ayrı bir daemon birimi yok.

## Yapılacaklar
1. **Servis kayıt defteri (Service Manager):** Her servis için ad, bağımlılıklar, `start`/`stop` ve sağlık bilgisi tanımlanır. Durumlar: `idle`, `starting`, `running`, `degraded`, `failed`, `stopped`. Bağımlılık sırasına göre başlatılır.
2. **Denetleyici (watchdog):** Düşen servis artan beklemeyle (200 ms → 3,2 s) en çok 5 kez yeniden başlatılır, ardından `failed` olur. Kalp atışı denetimi yapılır. Tek sekmede çalışması Web Locks lideri ile sağlanır; diğer sekmeler takipçi olarak kalır.
3. **BackgroundServices geçişi:** Mevcut altı servis kayıt defterine taşınır. Kullanıcıya görünen davranış değişmez.
4. **Mesh-sync daemon'u:** `openLocalLink` ve WebRTC `openGossipChannel` → gossip → vector clock → CRDT kuyruğu zinciri kurulur. Giden her paket `packet-gate.ts` kapısından geçer. Uygulamalar bu servise yalnız `desktop-ipc.ts` üzerinden erişir.
5. **Portal entegrasyonu:** Kayıtlar sekmesine servis olayları eklenir. Ağ ve Ölçümler sekmesine servis sağlık listesi ve yetkili kullanıcı için "yeniden başlat" düğmesi eklenir.
6. **ISO daemon birimi:** `tedbirge-truth.service` eklenir: socket yolu, `Restart=on-failure`, `WatchdogSec` ve sandbox ayarları (`ProtectSystem`, `NoNewPrivileges`). `check-image-config.sh` betiğine birim denetimi eklenir.
7. `AGENTS.md` dosyasına servis kayıt defteri kuralı, `roadmap.md` dosyasına Faz 4 maddeleri eklenir.

## Test ve doğrulama
- Vitest: bağımlılık sırası, döngü algılama, yeniden deneme ve `failed` eşiği, liderlik devri, gossip bağlantısı (sahte link), paket kapısının reddettiği paketin iletilmemesi.
- `bunx tsgo --noEmit`, tüm Vitest paketi, `scripts/check-image-config.sh`.
- Playwright: portal servis listesi, bir servisi zorla düşürme ve yeniden başlatma, iki sekmede tek lider.
- Sınır: gerçek systemd/QEMU çalıştırması bu ortamda yok; birim yalnız statik olarak denetlenir.

## Teknik ayrıntılar
- Yeni dosyalar: `src/shell/services/registry.ts`, `supervisor.ts`, `services.ts`, `src/lib/axiom/net/mesh-daemon.ts` ve testler.
- `image/config/includes.chroot/etc/systemd/system/tedbirge-truth.service`.
