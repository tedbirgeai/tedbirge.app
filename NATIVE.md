# Tedbirge OS — 2. Kol (Donanım Katmanı)

Aynı çekirdek, iki kol:

| Kol | Katman | Çalışma yeri | Derleme |
| --- | --- | --- | --- |
| Web-Native (PWA) | Layer 2 | Tarayıcı, çevrimdışı | `bun run build` (+ `scripts/build-kernel.sh`) |
| Bare-Metal | Layer 1 | Doğrudan donanım | `scripts/build-native.sh`, `scripts/build-iso.sh`, `scripts/build-arm64.sh` |

## Soyutlama sözleşmesi

- **Rust tarafı** (`crates/tedbirge-kernel/src/hal.rs`): `Clock`, `Rng`, `Transport` trait'leri.
  Tarayıcıda JS köprüsü, donanımda işletim sistemi sürücüsü doldurur.
- **TypeScript tarafı** (`src/hal/`): `StorageHal`, `NetHal`, `DisplayHal`.
  `registerHal({...}, "native")` ile kabuk kodu değişmeden devralınır.

Çekirdek hiçbir IO yapmaz; yönlendirme ve ayırıcı platformdan bağımsızdır.

## Faz 3 — Yerel kabuk ve ISO

`crates/tedbirge-shell-native` bağımlılıksız (yalnız std) bir ikili dosyadır:

- HAL sürücüleri: monotonik saat, xorshift RNG, UDP yayın taşıyıcısı.
- `dist/` kabuk paketini `http://127.0.0.1:8377` üzerinden sunar; bilinmeyen rotalar
  `index.html`'e düşer, yani çevrimdışı davranış web ile birebir aynıdır.
- COOP/COEP başlıkları web ile aynı gönderilir (Wasm yalıtımı korunur).

```bash
bash scripts/build-native.sh
./crates/tedbirge-shell-native/target/release/tedbirge-shell --root dist
bash scripts/build-iso.sh        # kök ağacı + (xorriso varsa) .iso
```

ISO açılışında `boot.sh` kabuk servisini başlatır ve kiosk görüntüleyiciyi (cog ya da
chromium) tam ekran açar. Görüntüleyici yoksa düğüm başsız (headless) röle olarak çalışır.

## Faz 4 — ARM64 ve kilitli kabuk

```bash
bash scripts/build-arm64.sh
```

`aarch64-unknown-linux-gnu` ikilisi, `dist/` ve `tedbirge-shell.service` üretir.
systemd birimi kabuğu her açılışta yeniden başlatır; SBC/kiosk cihazları için varsayılan yoldur.

Mobil kilitli kabuk (iOS/Android) Capacitor kolundan yürür — bkz. `MOBILE.md`.

## Notlar

- ISO ve ARM64 boru hatları kök yetkili bir Linux ana makinede çalıştırılır; Lovable
  önizleme ortamında yalnız betikler bulunur, imaj üretilmez.
- Ağ portları: kabuk `8377/tcp`, mesh duyurusu `7946/udp`.
