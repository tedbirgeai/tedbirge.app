# MASTER DONANIM PLANI — Tedbirge® WebOS Evrensel Cihaz Desteği

Bu tur hiçbir dosya değiştirilmedi. Aşağıdaki tespit, mevcut imaj yapılandırmasının (`image/config/package-lists/tedbirge.list.chroot`, `image/build.sh`, `image/config/hooks/normal/9000-tedbirge.hook.chroot`, `image/install/tedbirge-kur`, initramfs ayarları) okunmasıyla çıkarıldı.

## Mevcut durum — özet

Var olanlar: Debian bookworm amd64 çekirdeği, `main contrib non-free-firmware` depoları, Intel/Realtek/Atheros/Broadcom/AMD firmware, Mesa + Vulkan, NetworkManager, BlueZ, PipeWire, `acpid`, zram, geniş depolama araçları, canlı imajda `MODULES=most`.

Yapısal sınır (dürüst beyan): mevcut hat **yalnız x86_64**'tür. Qualcomm/MediaTek/Exynos telefonlar farklı bir dünyadır — ARM64 çekirdeği, cihaz ağacı (DTB), üreticiye özel önyükleyici (fastboot/U-Boot) ve kilitli bootloader gerektirir. Tek bir ISO ile "tüm telefonlarda" bare-metal çalışmak teknik olarak mümkün değildir; bunun için ayrı bir ARM64 hattı (postmarketOS/Mobian tarzı, cihaz başına port) kurulur. Plan bunu ayrı Faz olarak ayırır ve x86 tablet/2'si 1 arada cihazları mevcut hatta tam kapsar.

## 1) Kategori bazlı eksik paket ve sürücü listesi

### Grafik (Intel / AMD / Nvidia / harici ekran / parlaklık)
Eksik: `firmware-nvidia-graphics` (Turing/Ampere/Ada GSP), `firmware-amd-graphics` güncel sürümü, `firmware-intel-graphics`/GuC-HuC içeren `firmware-misc-nonfree` teyidi, `intel-media-va-driver-non-free`, `va-driver-all`, `vdpau-driver-all`, `libvulkan1`, `vulkan-tools`, `libdrm-tests`, `brightnessctl`, `light`, `ddcutil` (harici monitör parlaklığı), `edid-decode`.
Not: `xe` sürücüsü bookworm 6.1'de yok → çekirdek `linux-image-amd64` yerine `bookworm-backports` çekirdeğine (6.12+) geçilir; Intel Lunar/Arrow Lake, AMD RDNA3+ ve yeni Nvidia bu olmadan çalışmaz.

### Ses
Eksik: `firmware-sof-signed` (modern Intel dizüstülerinin çoğunda sesin ön koşulu), `firmware-cirrus`/`firmware-intel-sound` (bookworm'da yoksa backports), `alsa-ucm-conf`, `libasound2-plugins`, `pipewire-audio`, `pipewire-pulse` (var), `bluez-firmware`, `libspa-0.2-bluetooth` (BT kulaklık A2DP/HFP), `pulseaudio-utils` (araçlar).

### Kablosuz ve ağ
Eksik: `firmware-mediatek` (MT7921/7922 — yeni dizüstülerin çoğu), `firmware-ath9k-htc`, `firmware-qcom-soc`, `firmware-ti-connectivity`, `firmware-iwlwifi` (var), `bluez-firmware`, `firmware-linux-nonfree` (toplayıcı), `modemmanager`, `libmbim-utils`, `libqmi-utils`, `usb-modeswitch`, `usb-modeswitch-data` (4G/5G WWAN modemler), `rfkill`, `wireless-regdb`, `iwd` (opsiyonel yedek supplicant).

### Girdi, dokunmatik, kalem, sensörler
Eksik: `iio-sensor-proxy` (otomatik ekran döndürme, ışık/yakınlık sensörü), `xserver-xorg-input-wacom` (kalem/stylus), `libwacom-common`, `xinput-calibrator` veya `xinput` (var), `libinput-tools`, `evtest`, `i2c-tools`, `acpi-support`. Ekran döndürmede X üzerinde `xrandr` + `xinput` eşlemesi yazılacak (dönünce dokunmatik eksenlerin de dönmesi için).

### Güç, pil, termal
Eksik: `upower` (pil göstergesinin standart kaynağı — şu an yok), `power-profiles-daemon`, `thermald` (Intel), `tlp` (opsiyonel, `power-profiles-daemon` ile çakışmayacak biçimde tek seçim), `acpi`, `acpi-call-dkms` gerekmiyor, `systemd-logind` lid politikası yapılandırması, `pm-utils` gereksiz. S4 hibernasyon: swap bölümü ve `RESUME=` zaten kurucuda var; canlı sistemde S4 kapalı kalır (doğru davranış).

### Depolama, çipset, portatiflik
Eksik: `mmc-utils`, `sdparm`, `hdparm`, `smartmontools`, `bolt` (Thunderbolt/USB4 yetkilendirme), `thunderbolt-tools` yerine `bolt` yeterli, `udisks2` (otomatik güvenli bağlama), `exfat-fuse` (varsa `exfatprogs` yeterli), `dmraid`/`mdadm` (Intel RST/VMD RAID görünürlüğü), `nvme-cli` (var).
Kritik portatiflik: kurulan sistemde initramfs `MODULES=dep` — imaj başka donanıma taşındığında açılmama riski. `MODULES=most` yapılır; kurulum süresi artışı zstd-1 ile telafi edilir.

### Kamera ve biyometrik
Eksik: `v4l-utils`, `libv4l-0`, `uvcdynctrl` gereksiz, `fwupd` (firmware güncelleme), `fprintd` + `libpam-fprintd` (parmak izi), `firmware-sof-signed` içindeki IPU6 desteği için backports çekirdeği + `intel-ipu6` yığını (bookworm'da yok → yeni Intel dizüstülerin dahili kamerası çalışmaz; UVC kameralar çalışır).

### Mobil (ARM64 / Android sınıfı) — ayrı hat
x86 hattında yeri yok. Gerekenler: ARM64 çapraz derleme, cihaz başına DTB, mainline destekli SoC listesi (Snapdragon 845/8xx, MT6xxx sınırlı), Mesa `freedreno` (Adreno) ve `panfrost` (Mali) sürücüleri, `firmware-qcom-soc`, `ofono`/`ModemManager`, `mtp-server`, `adbd`, Waydroid (binder çekirdek modülü + Wayland zorunlu). Waydroid X11 kiosk ile çalışmaz → mobil kolda Wayland kompozitörüne geçiş gerekir.

## 2) Eklenecek sistem servisleri ve kernel modülleri

Servisler (imajda etkinleştirilecek): `upower`, `power-profiles-daemon`, `thermald`, `iio-sensor-proxy`, `ModemManager`, `bolt`, `udisks2`, `fwupd`, `bluetooth` (mevcut), `systemd-logind` lid/güç tuşu politikası (`HandleLidSwitch=suspend`, `HandlePowerKey` → `tedbirge-sysbridge`).

Çekirdek/initramfs modülleri (canlı `most` zaten kapsıyor; kurulu sistemde de garanti altına alınacak): `nvme`, `ahci`, `vmd`, `sdhci_pci`, `mmc_block`, `rtsx_pci_sdmmc`, `xhci_pci`, `uas`, `usb_storage`, `thunderbolt`, `i2c_hid_acpi`, `intel_lpss_pci`, `hid_multitouch`, `pinctrl_*`, `snd_sof_pci`, `i915`, `amdgpu`, `nouveau`.

sysbridge/ControlCenter entegrasyonu: pil yüzdesi, şarj durumu, pil sağlığı ve güç profili D-Bus (`upower`, `power-profiles-daemon`) üzerinden okunur; parlaklık `/sys/class/backlight` + `brightnessctl` ile gerçek donanıma yazılır (bugünkü CSS karartması yerine). Servis yoksa arayüzde düğme görünmez — sahte başarı gösterilmez.

## 3) Bütünsel uygulama planı (tek derlemede)

1. **Çekirdek yükseltmesi**: `image/build.sh`'e `bookworm-backports` deposu eklenir; `linux-image-amd64` backports sürümünden kurulur. Tüm modern GPU/SOF/Wi-Fi desteğinin ön koşulu budur.
2. **Paket listesi genişletmesi**: yukarıdaki tüm eksikler `image/config/package-lists/tedbirge.list.chroot` içine kategori yorumlarıyla eklenir; `--archive-areas` zaten `non-free-firmware` içeriyor, `non-free` de eklenir (Nvidia GSP firmware için).
3. **Servis etkinleştirme**: `9000-tedbirge.hook.chroot` içine yeni servislerin `systemctl enable` satırları ve logind güç politikası yazılır.
4. **Gerçek parlaklık + pil köprüsü**: `tedbirge-sysbridge` içine backlight yazma ve `upower` okuma uçları; kabuk tarafında ControlCenter bunları kullanır.
5. **Ekran döndürme**: `iio-sensor-proxy` çıktısını dinleyip `xrandr` + `xinput` dönüşüm matrisi uygulayan küçük servis (`/opt/tedbirge/ekran-donme.sh`).
6. **Kurulu sistem portatifliği**: `image/install/tedbirge-kur` içinde `MODULES=dep` → `MODULES=most`.
7. **Doğrulama adımı**: `scripts/check-image-config.sh` ve `.github/workflows/build-iso.yml`'e "beklenen paket/servis imajda var mı" denetimi; QEMU BIOS/UEFI + kalıcı kurulum testleri mevcut watchdog ile korunur.
8. **Mobil hat (ayrı faz, bu derlemeye dahil değil)**: `image-arm64/` profili, Wayland kompozitörü, Waydroid/binder, ModemManager+ofono; cihaz başına port listesi ile.

### Riskler
- Backports çekirdeği imaj boyutunu ve derleme süresini artırır (~%15).
- Nvidia GSP firmware `non-free` gerektirir; lisans metni imaja eklenir.
- Intel IPU6 dahili kameralar ve kilitli bootloader'lı telefonlar bu derlemeyle de çalışmaz — kapsam dışı olarak beyan edilir.

Onaylarsanız 1–7 arası maddeler tek derlemede uygulanır; mobil hat (8) ayrı turda ele alınır.
