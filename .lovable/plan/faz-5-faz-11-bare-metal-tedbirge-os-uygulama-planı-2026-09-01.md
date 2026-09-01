# Faz 5 → Faz 11: Bare-Metal Tedbirge OS Uygulama Planı

Amaç: bugünkü tarayıcı kolunu bozmadan, aynı çekirdeği çıplak donanımda çalıştıran tam dağıtım zincirini kurmak. Her faz kendi başına derlenip test edilebilir; sıra bozulmadan uygulanır.

## Kapsam ve sınır

- Tarayıcı/PWA kolu, VFS, pencere yöneticisi ve mevcut rotalar değişmez.
- Lovable ortamında gerçek `.iso`/`.img` üretilmez (kök yetkili Linux ana makine ister). Bu turlarda üretilen şey: derlenebilir betikler, Rust modülleri, HAL sürücüleri ve bunların birim testleri.
- Her faz sonunda `bunx vitest run` + `cargo test` + tip denetimi çalıştırılır.

## Faz 5 — Gerçek önyüklenebilir imaj

- `scripts/build-image.sh`: Linux çekirdeği + initramfs (busybox tabanlı, `init` betiği `boot.sh`'i çağırır) + squashfs kök katmanı.
- Hibrit önyükleme: `isolinux` (Legacy BIOS) + `grub-efi` (UEFI) aynı imajda; `.iso` ve ham `.img`/`.raw` çıktısı.
- `scripts/build-riscv64.sh`: `riscv64gc-unknown-linux-gnu` hedefi, U-Boot/extlinux tanımı.
- `/api/public/iso` rotası mimariye göre doğru varlığı sunacak şekilde genişletilir.

## Faz 6 — Native HAL sürücüleri

`crates/tedbirge-hal-linux` (yeni crate, bağımlılıksız, doğrudan syscall/ioctl):
- DRM/KMS framebuffer (kart açma, mod ayarı, dumb buffer).
- evdev girdi (klavye/dokunmatik/fare olay akışı).
- ALSA ses (opsiyonel, PCM çıkışı).
- netlink/nl80211 arayüz keşfi.
Hepsi `tedbirge-kernel::hal` trait'lerini uygular; `Transport` için UDP yanına serial/LoRa ikinci uygulaması.

## Faz 7 — Kiosk kompozitör + Wasm çalıştırıcı

- `crates/tedbirge-compositor`: DRM framebuffer üzerine doğrudan çizim; pencere listesi, odak, girdi yönlendirme — tarayıcı gerekmez.
- `wasmi` (saf Rust, no_std uyumlu) ile `.tbapp` Wasm uygulamalarının bare-metal tarafta çalıştırılması; yetenek (capability) kontrolü web kolundaki `capabilities.ts` sözleşmesiyle birebir.

## Faz 8 — Blok depolama köprüsü

- `StorageHal` native uygulaması: blok aygıt keşfi (`/sys/block`), ext4/F2FS bölüm bağlama, kalıcı `/var/tedbirge` şeması.
- Web VFS ile aynı üstveri şeması → aynı uygulamalar iki kolda da çalışır.

## Faz 9 — Installer

- `crates/tedbirge-installer`: TUI sihirbaz — hedef disk seçimi, bölümlendirme (GPT + ESP + kök), biçimlendirme, kök ağacı kopyalama, yükleyici yazımı, ilk açılış kimliği (TBG) üretimi.
- Live imajdan `tedbirge-install` komutuyla çağrılır.

## Faz 10 — Headless daemon

- Yerel kabuğa `--headless` bayrağı; görüntüleyici beklemeden röle olarak çalışır.
- Bellek/kaynak profilleri (64 MB SBC → sunucu), systemd ve openrc birimleri, yerel telemetri soketi.

## Faz 11 — Universal HMI

- Girdi soyutlaması: evdev/gpio/sensör olaylarının tek olay kanalına indirgenmesi (web'de pointer/klavye ile aynı sözleşme).
- Üst çubuk dar ekran metin taşması onarımı; tarama ikonlarının sürekli re-render'ının kaldırılması (memo + animasyon CSS'e taşınır).
- Tüm renkler `--tb-*` token'larından; sabit hex eklenmez.

## Teknik notlar

- Yeni crate'ler `crates/` altında, workspace'e bağlanır; `tedbirge-kernel` API'si değişmez, yalnız trait uygulamaları eklenir.
- Wasm için `wasmi` tercih edilir (JIT yok, küçük SBC'de düşük bellek).
- `vite.config.ts` ve SSR yapılandırmasına dokunulmaz.
- Betikler kök yetkisi gerektiren adımları açıkça bildirir; ağ yoksa yerel `dist/` ağacına düşer.

## Teslim sırası

Faz 5 → 6 → 7 → 8 → 9 → 10 → 11. Her faz ayrı bir turda uygulanır ve doğrulanır; ara turlarda tarayıcı kolunun testleri kırılmadan kalır.
