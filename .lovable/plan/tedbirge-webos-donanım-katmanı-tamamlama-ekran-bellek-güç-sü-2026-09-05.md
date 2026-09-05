# Tedbirge® WebOS — Donanım Katmanı Tamamlama (Ekran / Bellek / Güç / Sürücüler)

Amaç: bare-metal imajın gerçek bir bilgisayarda tam donanımla açılması; kabuktaki "Kapat / Yeniden Başlat / Uyku" düğmelerinin anakarta gerçek sinyal göndermesi.

## Mevcut durum (dosyalardan doğrulandı)

- Alpine imaj profili var (`alpine/mkimg.tedbirge.sh`): X11 + Chromium kiosk, NetworkManager, ALSA, libinput, mesa-dri-gallium paketleri zaten listeli.
- Kiosk zinciri, nginx (COOP/COEP dahil), tty1 otomatik oturum, disk kurulum sihirbazı ve kayıt/logrotate yapılandırması `alpine/genapkovl-tedbirge.sh` içinde hazır.
- Donanım HAL crate'i mevcut: DRM/KMS framebuffer, evdev girdi, ağ arayüzü keşfi, blok aygıt listesi, ses.
- Eksik olanlar: Vulkan/VA-API paketleri ve GPU firmware'i, ZRAM/swap ve OOM koruması, ACPI güç servisi (kod tabanında `sysbridge`, `poweroff`, `zram`, `elogind` geçmiyor), NVMe/SSD otomatik bağlama, Wi-Fi firmware paketleri.

## Yapılacaklar

### 1. Ekran kartı ve grafik
`mkimg` paket listesine Intel/AMD/NVIDIA açık sürücüleri, Vulkan yükleyici ve ICD'leri, VA-API/VDPAU hızlandırma, `linux-firmware` GPU paketleri ve çoklu monitör araçları eklenir. Kiosk başlangıcına GPU tespiti ve otomatik ekran düzeni (bağlı tüm çıkışları etkinleştirme, en yüksek ortak çözünürlük) adımı girer; hızlandırma yoksa yazılım oluşturmaya (softpipe) düşer, ekran hiçbir durumda siyah kalmaz. Chromium bayrakları donanım hızlandırma + WebGPU açacak biçimde güncellenir.

### 2. Bellek yönetimi
Açılışta ZRAM aygıtı kurulur (RAM'in yarısı, zstd), swap önceliği ayarlanır; `earlyoom` benzeri koruma servisi ile bellek dolduğunda sistem kilitlenmez, en çok tüketen pencere kapatılır. `sysctl` profili (swappiness, dirty ratio, min_free_kbytes) imaja eklenir. Rust çekirdeğinin ayırıcı davranışı bellek profiline göre (tiny/sbc/server) seçilir.

### 3. Güç yönetimi — `tedbirge-sysbridge`
Yeni yerel servis: 127.0.0.1 üzerinde yalnız yerel isteklere yanıt veren küçük Rust ikilisi (`crates/tedbirge-sysbridge`). Görevleri:
- `kapat` / `yeniden-baslat` / `uyku` / `derin-uyku` komutları,
- her komuttan önce disk senkronizasyonu ve tarayıcı verisinin diske yazılması,
- ardından çekirdek/ACPI çağrısı (`/proc/sysrq-trigger`, `/sys/power/state`).
Fiziksel güç tuşu ve kapak kapanması aynı servise bağlanır (acpid kuralları). Kabuk tarafında Başlat Menüsü ve Hızlı Kontrol Paneli'ne güç menüsü eklenir; servis yoksa (tarayıcı kolu) düğmeler görünmez, sahte başarı gösterilmez.

### 4. Sürücü paketi
Wi-Fi (Intel/Atheros/Realtek/Broadcom) firmware'leri, Ethernet modülleri, Bluetooth, ALSA + PipeWire ses, touchpad çoklu dokunma yapılandırması, NVMe/SATA/USB depolamanın güvenli otomatik bağlanması (`/media/<etiket>`, `nosuid,nodev`) ve yazıcı/kamera olmayan gereksiz servislerin kapatılması.

### 5. Derleme hattı kilidi
`scripts/build-kernel.sh`, `scripts/build-iso.sh`, `scripts/build-iso-bundle.sh` ve `alpine/ci-build.sh` atomik hâle getirilir: hedefler önce temizlenir, yalnız klasörlere `mkdir -p`, kopyalama sonrası boyut doğrulaması. `.github/workflows/build-iso.yml`'e yeni paket ve servislerin imajda bulunduğunu doğrulayan adım eklenir. Rust birim testleri (`cargo test`) ve arayüz testleri hatta koşar.

## Sınır — dürüst beyan

Gerçek `.iso` bu ortamda üretilemez: ayrıcalıklı Docker + Alpine mkimage gerekir. Bu tur betikleri, servisleri, yapılandırmaları ve testleri tamamlar; imaj ve SHA256 dosyaları GitHub Actions hattı `main`'e itilince üretilip Release'e yüklenir. Yayın adımını sizin onayınızla Actions çalıştırır.

## Teknik notlar

- Tarayıcı kolu (tedbirge.app) ve `dist/` çıktısı değişmez; tüm eklemeler `alpine/`, `crates/`, `scripts/` altında ve kabuğun güç menüsünde.
- `portal/` ve `vercel.json` dosyalarına dokunulmaz.
- Renkler `--tb-*` token'larından; yeni sabit hex eklenmez.
