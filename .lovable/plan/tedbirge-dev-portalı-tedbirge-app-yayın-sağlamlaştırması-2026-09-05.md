# tedbirge.dev Portalı + tedbirge.app Yayın Sağlamlaştırması

## Bu turda doğrulanan durum

- Kök dizinde `vercel.json` var ve içinde SPA yönlendirmesi yok (doğru); `framework: null`, `buildCommand: npm run build`.
- `package.json` betikleri mevcut: `dev` (`vite dev`), `build`, `preview` — istenen üçlü karşılanıyor.
- `vite.config.ts` içinde `base` ayarı yok (varsayılan `/`), sunucu girişi `src/server.ts` olarak zaten bağlı.
- Bu depoda tedbirge.dev geliştirici portalına ait ayrı bir kaynak ağacı yok; `src/lib/site.ts` yalnızca adrese bağlantı veriyor.
- Tarayıcıya bağlı motorlar (WASM çekirdek yükleyici, WebRTC, medya, arka plan servisleri) `src/kernel/wasm-provider.ts`, `src/lib/browser-node.ts`, `src/lib/call/*`, `src/shell/BackgroundServices.tsx` üzerinden açılışta çalışıyor; bunların hata yutma davranışı dosya dosya denetlenecek (şu an tek tek doğrulanmadı).

## Yapılacaklar

### 1. Geliştirici & SDK portalı kaynağı (`portal/` klasörü)

Bu depo içinde bağımsız, kendi kökü olan bir Vite SPA üretilir; olduğu gibi `tedbirgeai/tedbirge.dev` deposuna kopyalanıp itilebilir:

- `portal/package.json` (`dev`/`build`/`preview` betikleri), `portal/vite.config.ts` (`base: "/"`), `portal/index.html`, `portal/tsconfig.json`, `portal/.gitignore`, `portal/README.md`.
- `portal/src`: sayfa yapısı — Başlangıç, SDK Kullanımı, Protokol/Zarf Mimarisi, Çok-sıçramalı yönlendirme, Rust-Wasm çekirdek, Kamusal API referansı (telemetri, geçit, ISO uçları), Sürüm notları.
- İçerik bu depodaki gerçek modüllerden türetilir (uydurma uç nokta yazılmaz); tema `--tb-*` token'larıyla Açık Kristal ile aynı görünür, sabit hex yok.
- Ana uygulamadaki geliştirici bağlantıları `site.ts` üzerinden `https://tedbirge.dev` adresine `rel="noopener noreferrer"` ile gider.

### 2. tedbirge.app yayın yapılandırması

- `vite.config.ts` içine açık `base: "/"` yazılır (davranış değişmez, niyet sabitlenir).
- Sunucu çıktısının Vercel'de doğru çalışması için dağıtım hedefi (nitro preset) Vercel'e ayarlanır ve `vercel.json` buna göre hizalanır. SPA rewrite **eklenmez**.
- Üretim derlemesi alınır ve yerel olarak çalıştırılıp gerçek bir açılış denemesi yapılır; sunucu hata kaydı okunur.

### 3. Açılışta çökme koruması

- WASM çekirdek yükleyici, WebRTC/medya erişimi, paylaşımlı bellek (COOP/COEP yoksa), IndexedDB/VFS ve arka plan servisleri: her biri yakalanmamış hata ve reddedilmiş söz bırakmayacak şekilde güvenli yedeğe bağlanır (TS çekirdeği, salt-okunur mod, boş durum).
- Kök seviyede `unhandledrejection` yakalayıcısı mevcut yerel hata günlüğüne yazar; ilk render hiçbir koşulda düşmez.

### 4. Doğrulama

- Tip denetimi, test paketi ve üretim derlemesi sıfır hatayla geçer; `/` ve pencere uygulamaları açılışta kontrol edilir.

## Bu ortamdan yapılamayanlar (dürüst sınır)

GitHub'a push, depo bağlama ve Vercel derlemesi tetikleme bu ortamdan yetkilendirilemiyor. Kod tarafındaki tüm hazırlığı yapıyorum; `portal/` klasörünü hedef depoya kopyalayıp itme adımı sizin GitHub bağlantınızla gerçekleşir.
