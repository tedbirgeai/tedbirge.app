# Tam Evrensel Bare-Metal Dağıtım — Durum Analizi ve Yol Haritası

Bu tur hiçbir uygulama dosyası değiştirilmedi. Aşağıdaki rapor mevcut kod tabanının okunmasıyla çıkarıldı; onaylarsanız yalnız Bölüm C.1'deki betik düzeltmesini uygularım.

## A. Kod tabanında hazır olan parçalar

- Rust çekirdek `crates/tedbirge-kernel` — `no_std` + `alloc`, kendi serbest-liste ayırıcısı (`heap.rs`), yönlendirme motoru (`route.rs`), üç hedefli özellik bayrakları (`wasm` / `std` / `bare`).
- HAL sözleşmesi iki tarafta da tanımlı: Rust'ta `Clock` / `Rng` / `Transport` (`hal.rs`), TypeScript'te `StorageHal` / `NetHal` / `DisplayHal` (`src/hal/`) ve `registerHal(..., "native")` devralma noktası.
- Yerel kabuk `crates/tedbirge-shell-native` (263 satır, bağımlılıksız): monotonik saat, xorshift RNG, UDP yayın taşıyıcısı, `dist/` sunumu (8377/tcp), COOP/COEP başlıkları, SPA fallback.
- Derleme betikleri: `scripts/build-native.sh` (x86_64), `scripts/build-arm64.sh` (aarch64 + systemd kiosk birimi), `scripts/build-iso.sh` (kök ağaç + `boot.sh` + xorriso).
- Dağıtım UX'i: `/api/public/iso` rotası ve `BareMetalIso.tsx` (tek tık indirme + Rufus/Ventoy/Etcher rehberi).
- Tarayıcı kolu: VFS (IndexedDB, şema kilidi), pencere yöneticisi, Geçit proxy, PWA çevrimdışı katmanı.

## B. %100 eksik olan parçalar

1. **İmaj boru hattı**: `build-iso.sh` yalnız bir kök ağaç üretiyor — Linux çekirdeği, initramfs, `isolinux`/`grub-efi` yükleyici, squashfs katmanı ve `.img`/`.raw` flash çıktısı yok. RISC-V hedefi hiç yok.
2. **Kernel↔Wasm köprüsü**: bare-metal tarafta Wasm çalıştırıcı yok (`wasmtime`/`wasmi` seçimi yapılmamış); `Transport` yalnız UDP, DRM/ALSA/evdev sürücü köprüleri yok.
3. **Kiosk motoru**: kabuk hâlâ bir tarayıcı (cog/chromium) bekliyor. DRM/KMS üzerine doğrudan çizen bir kompozitör yok; `DisplayHal` native uygulaması boş.
4. **Önyükleme**: UEFI + Legacy BIOS hibrit yapılandırması, Secure Boot imzası, U-Boot/extlinux (ARM/RISC-V) tanımları yok.
5. **Blok depolama**: `StorageHal` yalnız IndexedDB'yi sarıyor. NVMe/eMMC/UFS için blok aygıt + dosya sistemi (ext4/F2FS) uygulaması yok; kalıcı `/var/tedbirge` şeması yok.
6. **Kurulum sihirbazı**: disk keşfi, bölümlendirme, biçimlendirme, kopyalama, yükleyici yazma adımlarını yapan "Tedbirge OS Installer" modülü hiç yok.
7. **Headless mod**: kabuk her zaman HTTP + görüntüleyici bekliyor; `--headless` bayrağı, kaynak profilleri (64 MB → sunucu) ve daemon telemetri soketi yok.
8. **Universal HMI**: evdev/gpio/sensör girdi soyutlaması yok; üst çubuk dar ekranda metin taşması ve tarama ikon animasyonlarının sürekli re-render'ı gözden geçirilmedi.

## C. Yol haritası

### C.1 Kurulum kiti betiğinin düzeltilmesi (tek dosya: `src/routes/api/public/iso.ts`)

Harici `github.com/tedbirgeai/aetheris` klonlaması ve `bun install` bağımlılığı kaldırılır. Yeni betik mimarisi:

```text
kurulum-kiti.sh
 ├─ 1. Yayın sunucusundan pre-built varlıkları indirir
 │     /kernel/tedbirge_kernel.wasm, /dist-bundle.tar.gz, /tedbirge-shell-<arch>
 ├─ 2. Mimariyi otomatik tespit eder (uname -m → x86_64 | aarch64 | riscv64)
 ├─ 3. Kök ağacı yerelde kurar (/opt/tedbirge/{dist,tedbirge-shell,boot.sh})
 ├─ 4. xorriso varsa .iso, yoksa .tar.gz kök ağacı üretir
 └─ 5. Rust/bun kuruluysa kaynaktan derlemeyi opsiyonel yedek olarak sunar
```
Klon/derleme zinciri yok; ağ yoksa betik yerel `dist/` dizinini kullanır.

### C.2 Faz planı (uygulama sırası)

| Faz | Kapsam | Ana çıktı |
| --- | --- | --- |
| 5 | Gerçek önyüklenebilir imaj | kernel+initramfs+squashfs, GRUB-EFI/isolinux hibrit, `.img`/`.raw` |
| 6 | Native HAL sürücüleri | DRM/KMS framebuffer, evdev girdi, ALSA ses, netlink/nl80211 |
| 7 | Kiosk kompozitör | tarayıcısız çizim; `wasmi` ile Wasm uygulama çalıştırma |
| 8 | Blok depolama köprüsü | `StorageHal` native: ext4/F2FS üstünde VFS, otomatik disk keşfi |
| 9 | Installer | TUI/kabuk sihirbazı: hedef disk, bölüm, yükleyici yazımı |
| 10 | Headless daemon | `--headless`, bellek profilleri, systemd/openrc birimleri |
| 11 | Universal HMI | girdi soyutlaması, üst çubuk taşma onarımı, animasyon re-render temizliği |

### C.3 Teknik notlar

- Bare-metal Wasm için `wasmi` (saf Rust, no_std uyumlu) `wasmtime`'a tercih edilir; küçük SBC'lerde JIT yükü kalkar.
- `Transport` trait'i UDP dışında LoRa/serial için ikinci uygulamaya açılır; çekirdek değişmez.
- ISO/IMG üretimi kök yetkili Linux ana makine ister; Lovable önizlemesinde yalnız betikler bulunur.

Onaylarsanız yalnız C.1 (kurulum kiti betiği) uygulanır; C.2 fazları ayrı turlarda ele alınır.
