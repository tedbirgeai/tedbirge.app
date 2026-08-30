# Tedbirge® WebOS — 2 Koldan İlerleme: Master Uygulama Planı

Amaç: bugün çalışan Web-Native katmanı (PWA + Rust/Wasm çekirdek + IndexedDB VFS + WindowShell) hiç bozmadan, aynı çekirdeği ileride donanım üzerinde doğrudan açılabilecek bir Layer-1 kabuğa taşıyabilecek şekilde soyutlamak.

## Doğrulanan mevcut durum

- Rust çekirdek `crates/tedbirge-kernel` (`lib.rs`, `route.rs`, `heap.rs`), `#![no_std] + alloc`, üç özellik bayrağı: `wasm` (varsayılan), `std`, `bare`. Yani çoklu hedef kapısı zaten açık; ağ/IO Rust tarafında yok.
- Kabuk tarafında çekirdek sözleşmesi `src/kernel/contract.ts` (send/subscribe/resolve/route/identity/status) ve iki sağlayıcı: `ts-provider.ts`, `wasm-provider.ts`; seçim `boot.ts` üzerinden, arıza halinde TS'e sessiz düşüş.
- VFS tek dosyada: `src/lib/vfs/store.ts` (IndexedDB). Pencere/masaüstü katmanı `src/shell/*` + `src/components/shell/*`.
- 7 masaüstü uygulaması: Bilgisayarım, Dosyalar, Medya, Müzik, Mağaza, Aktarımlar, Duvar Kâğıdı/Ayarlar.
- PWA: `vite-plugin-pwa` `generateSW`, `injectRegister: null`, `devOptions.enabled: false`, `navigateFallback: "/"`, `.wasm` önbelleğe dahil.

Kritik gerçekçilik notu: 3. ve 4. faz (ISO / ARM64) bu tarayıcı-içi Lovable ortamında derlenemez ve yayınlanamaz. Bu fazlarda repo içinde **kaynak, HAL arayüzü, Rust crate iskeleti ve derleme betikleri** üretilir; gerçek imaj derlemesi kullanıcının kendi Linux makinesinde veya CI'da çalıştırılır. Planda bu ayrım açıkça korunur.

## Faz 1 — Web-Native katmanın mühürlenmesi (risk: yok)

1. Çevrimdışı bütünlük testi: `src/lib/pwa/*` ve service worker önbellek listesi denetlenir; `.wasm`, duvar kâğıtları ve uygulama parçalarının precache'e girdiği doğrulanır.
2. VFS v6 şema kilidi: `src/lib/vfs/store.ts` içine sürüm sabiti + geriye dönük göç testi (vitest) eklenir; şema dışı yazma reddedilir.
3. 7 uygulama için "smoke" testi: her uygulamanın pencere içinde açılıp kapanması, veri okuması Playwright ile bir kez doğrulanır ve rapor edilir.
4. Bu fazda hiçbir mimari değişiklik yapılmaz — yalnız test, sürüm kilidi ve doğrulama.

## Faz 2 — Çekirdek soyutlama (HAL / Adapter Pattern)

Yeni klasör: `src/hal/`. Üç arayüz, hepsi bugünkü koda birebir uyan sözleşmelerle:

```text
src/hal/
  storage.ts   StorageHal  : read/write/list/delete/stat  (web adapter → vfs/store.ts)
  net.ts       NetHal      : send/subscribe/peers/status  (web adapter → kernel/contract.ts)
  display.ts   DisplayHal  : surface/present/inputEvents  (web adapter → WindowShell/Canvas)
  index.ts     registerHal() / hal()  — boot.ts ile aynı kayıt deseni
```

- Uygulamalar ve kabuk doğrudan IndexedDB / DOM çağırmak yerine `hal()` üzerinden geçer. Geçiş kademeli: önce adapter yazılır, sonra çağrı yerleri dosya dosya taşınır; her adımda tip denetimi yeşil kalır.
- Rust tarafında paralel soyutlama: `crates/tedbirge-kernel/src/hal.rs` — `trait Clock`, `trait Rng`, `trait Transport`. `wasm` özelliği tarayıcı köprüsünü, `bare` özelliği donanım stub'ını sağlar. Çekirdek mantığı (route/heap) değişmez.
- Çıktı: aynı çekirdek, iki farklı taşıyıcıyla derlenebilir; web davranışı bit-birebir aynı kalır (mevcut `wasm-route-parity.test.ts` bunu koruma altında tutar).

## Faz 3 — Native shell ve ISO boru hattı (repo içi kaynak, dış derleme)

1. Yeni crate: `crates/tedbirge-shell-native` — `x86_64-unknown-linux-gnu` hedefi, `tedbirge-kernel`'i `bare`/`std` özelliğiyle bağlar.
2. Wasm runtime gömme: uygulama paketleri (`.tbapp`) native tarafta `wasmtime` ile çalıştırılır; aynı manifest formatı korunur (`src/apps/package.ts` şeması ortak sözleşme olur).
3. Compositor: `wgpu` üzerinde minimal pencere kompozitörü; `DisplayHal` arayüzünün ikinci uygulaması. Web tarafında DOM/Canvas2D adapteri değişmez.
4. `scripts/build-iso.sh`: Alpine/`linuxkit` tabanlı minimal kernel + init → `tedbirge-shell-native` → `dist/tedbirge-x86_64.iso`. Betik repoda durur; kullanıcı kendi Linux makinesinde/CI'da çalıştırır. Ön koşullar ve doğrulama adımları `NATIVE.md` içinde belgelenir.

## Faz 4 — ARM64 çapraz derleme ve kilitli kabuk

1. `aarch64-unknown-linux-gnu` hedefi `scripts/build-native.sh` içine eklenir; Raspberry Pi / ARM tablet için imaj varyantı.
2. Kiosk modu: native kabukta tek uygulama tam ekran, çıkış PIN'e bağlı; web tarafında karşılığı mevcut PWA `display: standalone` davranışıdır (yeni service worker eklenmez).
3. Mevcut Capacitor iOS/Android kabuğu (`MOBILE.md`) korunur; ARM native kol ona alternatif değil, ek hedeftir.

## Teknik notlar

- `src/server/*` ve SSR grafiği etkilenmez; HAL modülleri saf istemci tarafıdır ve `.wasm` yalnız `public/kernel/` altından URL ile yüklenmeye devam eder.
- Her faz sonunda `bunx tsgo --noEmit` + `bunx vitest run` sıfır hata koşulu.
- Faz 2 tek başına değer üretir: web kolu daha test edilebilir hale gelir, native kol başlamasa bile kayıp olmaz.

## Öneri

Faz 1 + Faz 2 bu turda uygulanır (tamamen bu ortamda yapılabilir, mevcut davranışı değiştirmez). Faz 3 ve 4 için kaynak/betik iskeleti ayrı bir turda üretilir, gerçek imaj derlemesi sizin makinenizde çalıştırılır.
