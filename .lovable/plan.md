# Tedbirge® WebOS — Açık Kristal Tema, Marka Eşitlemesi ve tedbirge.dev Ayrımı

Salt-okunur tarama tamamlandı. Aşağıdaki plan; WebRTC, P2P mesh, Rust-Wasm çekirdeği, E2EE ve `kernel.worker.ts` katmanlarına **hiç dokunmadan** yalnızca sunum, tema, marka ve dokümantasyon katmanını dönüştürür.

## 1. Vizyon / Misyon / Değer uyumu

| İlke | Mevcut durum | Planın katkısı |
| --- | --- | --- |
| Sovereignty & Resilience | Çekirdek (Rust-Wasm + Dijkstra mesh + DHT) hazır ve çalışıyor | Dokunulmuyor; yalnızca durum göstergesi başlıkta netleşiyor |
| Sıfır karmaşa / tek tık | `/chat` girişi çok adımlı ve koyu-açık form karması | Tek eylem: "Tek Tıkla Yerel Düğüm Girişi" |
| Zero-Knowledge | E2EE ve kasa katmanı yerinde | Değişmiyor; arayüzde jargon yasağı korunuyor |
| Zero Legacy Debt | `.tbos` koyu tema 12 dosyada sabit kodlanmış | Tek token kaynağına indirgenir, ikinci bir tema dili doğmaz |
| DX/UI Harmony | Geliştirici yüzeyi yok | `tedbirge.dev` ayrı repo olarak konumlandırılır, app bant genişliğine yük binmez |

## 2. Etkilenecek dosya haritası (adım adım)

**A. Tema altyapısı**
- `src/styles.css` — `.tbos` bloğu koyu sabit değerlerden `var(--tb-*)` referanslarına çevrilir; üç tema seti (`[data-theme="crystal"]`, `"soft"`, `"night"`) `:root` altında tanımlanır. Mevcut `.wa` / `.wa-scope` eşleşmeleri korunur, yalnızca kaynak değişkenleri değişir.
- Yeni `src/lib/ui/theme.ts` — tema okuma/yazma (`localStorage: tedbirge.theme`), `document.documentElement.dataset.theme` yazımı, SSR-güvenli varsayılan (`crystal`), FOUC önleyici küçük inline script `src/routes/__root.tsx` head'ine eklenir.
- `src/components/shell/NodeSettingsPanel.tsx` — "Arayüz Teması" bölümü (Açık Kristal / Açık Soft Minimal / Gece Modu).

**B. Açık cam yüzeye geçen ekranlar** (yalnızca sınıf/token düzeyi)
- `src/components/Dashboard.tsx`, `src/components/shell/CommandCenter.tsx`, `FeedPanel.tsx`, `WorkspacePanel.tsx`, `SecurityPanel.tsx`, `MeshStatusDialog.tsx`, `AppsDialog.tsx`, `CapabilityDialog.tsx`, `FileTransferDialog.tsx`, `RelaySettingsDialog.tsx`, `NodeTestModal.tsx`, `PaywallModal.tsx`
- `src/components/Messenger.tsx`, `src/components/chat/*` (kabuk yüzeyleri), `src/routes/chat.tsx`, `src/routes/kurumsal.tsx`, `src/routes/index.tsx`, `src/routes/system.tsx`, `src/components/site/SiteChrome.tsx`
- Kural: sabit `bg-[#06090e]`, `text-white` benzeri değerler kaldırılır; yalnızca semantik token sınıfları kalır.

**C. Marka ve metadata**
- `src/routes/__root.tsx` — başlık "Tedbirge® WebOS — Otonom P2P Ağ İşletim Sistemi (tedbirge.app)", og/twitter alanları eşitlenir.
- `public/manifest.webmanifest` — `name`/`short_name`: "Tedbirge® WebOS"; `theme_color`/`background_color` açık kristal (`#F8FAFC`).
- `package.json` — `name: "tedbirge-app"`.
- Dashboard sol üst başlık: `Tedbirge® WebOS | SİSTEM DURUMU: ÇEVRİMİÇİ` (durum gerçek düğüm durumundan okunur, uydurulmaz).
- `src/lib/protocol-layers.ts`, `business-plan.ts`, `src/routes/*` içindeki "tedbirge-protokol"/"tedbirge-panel" metinleri "tedbirge.app" veya "Tedbirge® WebOS" ile değişir (marka çatısı "Tedbirge Protocol" kavramsal katman adı olarak korunur).
- Log önekleri `src/lib/diagnostics.ts` ve log yayıcılarda `[tedbirge.app]` olarak standartlaştırılır — çekirdek worker mesaj sözleşmesi değişmez, yalnızca görüntüleme öneki.

**D. `/chat` giriş sadeleştirmesi**
- `src/components/chat/PhoneOnboarding.tsx` + `src/routes/chat.tsx`: birincil eylem "Tek Tıkla Yerel Düğüm Girişi (Zero-Touch Node ID)". Mevcut TOTP/numara-çıpalı kimlik akışı ikincil seçenek olarak korunur (silinmez).

**E. `tedbirge.dev` — ayrı repo haritası (bu repoda yalnızca köprü)**
- Bu repoda yapılacak: Header/Footer/Terminal bileşenlerine `https://tedbirge.dev` harici bağlantısı (`rel="noopener"`), `src/components/site/SiteChrome.tsx` ve Dashboard alt barı.
- Ayrı repo için çıkarılan SDK haritası (kod taşınmaz, yalnızca ihracat listesi):
  - `@tedbirge/sdk` (npm): `src/kernel/contract.ts` tipleri, `route-codec.ts`, `kernel-worker-bridge.ts` istemci API'si, `src/lib/mesh/dht.ts` ve `mesh-routing.ts` saf fonksiyonları, `src/lib/e2ee.ts` genel yüzeyi.
  - `cargo add tedbirge-core`: `crates/tedbirge-kernel` rota/digest fonksiyonları.
  - WASM Playground: `public/kernel/tedbirge_kernel.wasm` dosyasının dev portalına kopyalanmış sürümü üzerinden çalışır; app ağına istek atmaz.

## 3. Sıfır re-render tema mimarisi

- Tek yazma noktası: `document.documentElement.dataset.theme = "crystal" | "soft" | "night"`. React state ağacı bu değişimden etkilenmez; yalnızca ayarlar panelindeki seçili rozet lokal state tutar.
- Tüm renkler `var(--tb-surface)`, `var(--tb-glass)`, `var(--tb-accent)` gibi Custom Property'lerden okunur; tema değişimi tarayıcı tarafında saf CSS yeniden boyamadır.
- `@theme inline` içindeki shadcn tokenları bu değişkenlere bağlanır; böylece hem `.wa` sohbet kabuğu hem OS pencereleri tek kaynaktan beslenir.
- FOUC: `__root.tsx` head'inde 3 satırlık senkron script tercih edilen temayı ilk boyamadan önce uygular.

## 4. Koruma sınırları

Dokunulmayacak: `src/kernel/*` (worker, ipc, wasm-provider, multipath, supervisor), `crates/tedbirge-kernel`, `src/lib/browser-node.ts`, `src/lib/call/*`, `src/lib/crypto/*`, `src/lib/e2ee.ts`, `src/lib/mesh/*` iş mantığı, Supabase entegrasyon dosyaları, rota dosya adları ve import yolları.

## 5. Doğrulama taahhüdü

- `bunx tsgo --noEmit` → 0 hata.
- `bun run build` → 0 hata.
- `bunx vitest run` → mevcut çekirdek testleri (kernel, apps) yeşil.
- Görsel doğrulama: `/`, `/chat`, `/kurumsal`, `/system` üç temada da ekran görüntüsüyle kontrol.

## Kapsam dışı

- `tedbirge.dev` reposunun kendisinin oluşturulması ve Vercel bağlanması (ayrı repo işi; burada yalnızca köprü ve SDK haritası).
- Paddle canlı ödeme entegrasyonu.
- Duraklatılmış barındırılan veritabanına bağlı akışlar; mevcut zarif düşüş korunur.
