# AXIOM Faz 5 — MoR Lisanslama, C-ABI Soket/WSS Köprüsü ve Tüm OS Derleme Altyapısı

## Amaç

Üç iş: (1) 6. cihaz tespit edilince açılan lisans/yükseltme penceresi, (2) masaüstü Unix soketi ↔ tarayıcı güvenli WebSocket köprüsü ve C başlık dosyası, (3) yedi hedef için derleme yapılandırmaları ve betikleri.

## Dürüstlük sınırları (arayüzde de yazılacak)

- Ödeme sağlayıcısı (Paddle) bağlı değil: lisans penceresi planı ve "SUBSCRIPTION_REQUIRED" durumunu gösterir, gerçek tahsilat yapmaz; kartta "ölçüm/test kipi" ibaresi kalır.
- `wss://tedbirge.dev/ws` sunucusu bu depoda yok: köprü bağlanmayı dener, başarısızsa "sunucu bekleniyor" durumuna düşer ve çevrimdışı kuyruğu kullanır. Uydurma bağlantı göstermez.
- Unix soketi ve C-ABI tarayıcıda çalışmaz: `tedbirge_truth.h` + soket adaptörü masaüstü/bare-metal içindir, tarayıcıda otomatik WSS'ye geçer. Emirdeki "simülatör" ifadesi korunur.
- `.exe/.dmg/.AppImage/.apk/.ipa` çıktıları imzalı üretim için Windows/macOS/Android/iOS araç zinciri ve imza anahtarı ister; bu fazda yapılandırma + betik + CI iş akışı üretilir, ikili dosya bu ortamda derlenmez.

## 1. Lisans penceresi (MoR)

- `src/lib/axiom/license/policy.ts` — `FREE_NODE_LIMIT` (mevcut 5) üzerine kademeler: Community (1–5 cihaz), Enterprise, Operator; `licenseStateFor(peers)` → `ok | subscription_required`; kalıcılık `axiom.license.v1` (yalnız kapatma/erteleme bilgisi, kişisel veri yok).
- `src/components/axiom/LicenseModal.tsx` — cam (glassmorphic) modal, `--tb-*` token renkleri, `role="dialog"` + odak tuzağı + Esc; kademe kartları, "STATUS: SUBSCRIPTION_REQUIRED" mührü, "Daha sonra" ve "Yükseltme talebi" düğmeleri (talep yalnız yerel kayıt + bilgilendirme).
- `src/lib/axiom/net/node.ts` durumu zaten `SUBSCRIPTION_REQUIRED` üretiyor; `AxiomApp.tsx` bu duruma girdiğinde modalı bir kez açar, `NodeStatusCard` içinde "Lisansı görüntüle" bağlantısı olur.
- i18n: `lic.*` anahtarları (tr/en).

## 2. C-ABI soket / WSS köprüsü

- `src/lib/axiom/bridge/types.ts` — `BridgeTransport = "unix" | "wss" | "none"`, `BridgeState`, `TruthRequest/TruthResponse` (MCP `axiom.verify` gövdesiyle aynı sözleşme).
- `src/lib/axiom/bridge/socket.ts` — masaüstü/sunucu tarafı: `TEDBIRGE_TRUTH_SOCK` (varsayılan `/run/tedbirge/tedbirge_truth.sock`) üzerinden `node:net` ile konuşur; yalnız sunucu/Node ortamında yüklenir (tarayıcı paketine girmez, `*.server.ts` adlandırma kuralına uyar).
- `src/lib/axiom/bridge/wss.ts` — tarayıcı yedeği: `wss://tedbirge.dev/ws`, üstel geri çekilme, ping/pong, `crdt`/`queue` katmanına düşen çevrimdışı kuyruk.
- `src/lib/axiom/bridge/index.ts` — ortam algılayıp uygun taşıyıcıyı seçen tek `openTruthBridge()`; hiçbiri yoksa mevcut yerel motor (`local-kernel.ts`) kullanılır.
- `src/lib/axiom/sdk/tedbirge_truth.h` — C-ABI başlığı: `tb_truth_open/close/verify/last_error`, `tb_verdict_t` enum (200_PROVEN / 409_REFUTED / 422_UNDECIDED / 504_EXECUTION_TIMEOUT / 500_PANIC), ABI sürümü ve 500 ms zaman aşımı sabiti; `sdk/adapters.ts` içine "C / C-ABI" hedefi ve kopyalanabilir örnek eklenir.
- `src/components/axiom/BridgeStatusCard.tsx` — Ağ sekmesinde taşıyıcı, gecikme, yeniden bağlanma sayacı; bağlantı yoksa açık "sunucu bekleniyor" ibaresi.

## 3. Derleme altyapısı

- `build/` altında hedef yapılandırmaları: `tauri.conf.json` (Windows `.exe`/NSIS, macOS `.dmg`, Linux `.AppImage`), `capacitor` üzerinden Android `.apk` ve iOS `.ipa` (mevcut `@capacitor/*` kullanılır), PWA (mevcut `vite-plugin-pwa` yapılandırması korunur), bare-metal `.iso` (mevcut `scripts/build-iso-bundle.sh` ve `image/` yeniden kullanılır — yeniden yazılmaz).
- `scripts/build-desktop.sh`, `scripts/build-android.sh`, `scripts/build-ios.sh`, `scripts/build-pwa.sh` — hepsi araç zinciri yoksa anlaşılır Türkçe mesajla ve sıfır olmayan çıkışla durur, sahte başarı vermez.
- `scripts/build-all.sh` — hedef listesi, hangi hedefin bu makinede üretilebildiğini rapor eder.
- `package.json` betikleri: `build:desktop`, `build:android`, `build:ios`, `build:pwa`, `build:all` (mevcut `build:iso` korunur).
- `.github/workflows/packages.yml` — matris: windows-latest, macos-latest (dmg + ipa adımı imza sırrı varsa), ubuntu-latest (AppImage + apk); çıktılar Actions artefaktı, ISO iş akışı değişmez.
- `BUILD.md` — her hedef için gereken araç, imza anahtarı ve komut.

## Denetim

`bunx tsgo --noEmit`, `bunx eslint src`, `bunx vitest run`, `bun run build`, `bun run security:check`, `bash scripts/validation-gates.sh`; yeni testler: `src/lib/axiom/__tests__/axiom-license.test.ts` (kademe/6. cihaz eşiği) ve `axiom-bridge.test.ts` (taşıyıcı seçimi, geri çekilme, kuyruk). Tarayıcıda: 6. cihaz benzetiminde modalın açılışı ve Ağ sekmesindeki köprü kartı Playwright ile doğrulanır.

## Kapsam dışı

Gerçek tahsilat/Paddle canlı geçişi, `tedbirge.dev/ws` sunucusunun kendisi, imzalı mağaza yayınları (App Store/Play/Microsoft Store), gerçek Z3/Lean WASM ikilileri.
