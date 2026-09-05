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

## Faz 10 — Başsız daemon ve kaynak profilleri

```bash
tedbirge-shell --root /opt/tedbirge/dist --headless --state /var/tedbirge --profile sbc
```

- `--headless` (ya da `TEDBIRGE_MODE=headless`): görüntüleyici beklenmez, düğüm yalnız röle olur.
- `--profile tiny|sbc|server`: verilmezse `/proc/meminfo` üzerinden otomatik seçilir
  (≤128 MB → `tiny`, ≤1 GB → `sbc`, üstü → `server`). Duyuru sıklığı ve çerçeve
  tamponu profile göre değişir.
- `--state <dizin>`: 30 saniyede bir `telemetry.json` yazılır (yerel tanılama; ağa gitmez).

## Faz 11 — Universal HMI

- Girdi soyutlaması iki tarafta da tek sözleşme: TypeScript `src/hal/input.ts`
  (`pointer` / `press` / `key`) ve Rust `crates/tedbirge-hal-linux/src/input.rs`.
  Kabuk, olayın fare, dokunmatik, evdev ya da sensörden geldiğini bilmez.
- Üst çubuk dar ekranda taşmaz (Off-Grid rozeti kısalır, saat `sm` altında gizlenir);
  radar animasyonu telemetri tiklerinden ayrılmıştır.

## Notlar

- ISO ve ARM64 boru hatları kök yetkili bir Linux ana makinede çalıştırılır; Lovable
  önizleme ortamında yalnız betikler bulunur, imaj üretilmez.
- Ağ portları: kabuk `8377/tcp`, mesh duyurusu `7946/udp`.


## Donanım katmanı — ekran, bellek, güç, sürücüler

| Alan | Karşılığı |
| --- | --- |
| Ekran kartı | Mesa (Intel/AMD/swrast Vulkan ICD'leri), VA-API/VDPAU, `libdrm`; `ekran-duzeni.sh` bağlı tüm çıkışları açar, GPU yoksa yazılım çizimine düşülür. |
| Bellek | Açılışta ZRAM (RAM'in yarısı, zstd) + `sysctl` profili; boş bellek %5 altına inince OOM koruyucu en çok tüketen süreci durdurur. |
| Güç | `tedbirge-sysbridge` (127.0.0.1:8378) — `sync` sonrası `/sys/power/state` ya da ACPI sinyali. Fiziksel güç tuşu ve kapak `acpid` üzerinden aynı yola bağlanır. |
| Sürücüler | Wi-Fi (iwlwifi/ath/rtw/brcm/mediatek), Ethernet, Bluetooth, PipeWire + ALSA, libinput dokunmatik yüzey, NVMe/SATA/USB otomatik bağlama (`/media/<etiket>`, `nosuid,nodev`). |

Kabuktaki Hızlı Kontrol Paneli güç düğmelerini yalnız köprü servisi yanıt verdiğinde gösterir;
tarayıcı kolunda düğme çıkmaz, sahte başarı üretilmez.
