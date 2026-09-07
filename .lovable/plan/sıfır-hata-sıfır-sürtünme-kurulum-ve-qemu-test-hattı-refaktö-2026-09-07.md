# Sıfır hata / sıfır sürtünme: kurulum ve QEMU test hattı refaktörü

Son koşuda (34120264592) kurulum aşaması geçiyor, ancak **UEFI 2. aşamada kurulan diskten hiç seri çıktı gelmiyor** ve 420 saniye sessizlikten sonra test düşüyor. Yani sorun artık kapanış değil, kurulan sistemin UEFI'de açılmaması (ya da açılırken seri porta tek satır yazmaması).

Kod okumasına göre iki güçlü aday var, ikisi de düzeltilecek:

- `update-initramfs` (90s) ve `update-grub` (60s) çağrıları `|| true` ile sessizce geçiliyor. Zaman aşımına uğrarsa canlı imajdan gelen ESKİ `grub.cfg` diskte kalıyor; bu menü kurulan diskin kök UUID'sini bilmediği için açılış sessizce ölür. Doğrulama adımı yalnızca "grub.cfg var mı" diye baktığı için bunu yakalamıyor.
- GRUB'un kendi çıktısı seri porta hiç yönlendirilmiyor (`GRUB_TERMINAL` / `GRUB_SERIAL_COMMAND` yok), bu yüzden hata olduğunda log tamamen boş kalıyor.

## Yapılacaklar

### 1. image/install/tedbirge-kur — chroot ve açılış garantisi
- Tüm chroot çağrıları için ortam zorunlu: `DEBIAN_FRONTEND=noninteractive`, `INITRD=Yes`, `GRUB_DISABLE_OS_PROBER=true`, `UDEV_DISABLE=1`; her çağrı `< /dev/null` ve sert timeout ile sarılı (mevcut `policy-rc.d exit 101` ve `chmod -x 30_os-prober` korunur).
- `/etc/default/grub` satır satır (varsa değiştir, yoksa ekle) yazılır:
  `GRUB_CMDLINE_LINUX_DEFAULT="console=tty0 console=ttyS0,115200n8 quiet"`,
  `GRUB_TERMINAL="console serial"`,
  `GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"`,
  `GRUB_DISABLE_OS_PROBER=true`, `GRUB_TIMEOUT=3`.
- `update-initramfs` ve `update-grub` artık **sessizce geçilmez**: başarısız/zaman aşımına uğrarsa kurulum `TEDBIRGE_INSTALL_FAIL` ile durur. Süreler gerçekçi tutulur (initramfs 300s, grub 120s) — asıl koruma ilerlemesizlik watchdog'u.
- Yeni doğrulama: üretilen `grub.cfg` kurulan kökün UUID'sini ve `console=ttyS0` parametresini içermeli; içermiyorsa kurulum durur.
- UEFI'de `grub-install` sonrası `EFI/BOOT/BOOTX64.EFI` yoksa `EFI/Tedbirge/grubx64.efi` oradan kopyalanır; ayrıca ESP'ye taşınabilir açılış için `EFI/BOOT/grub.cfg` köprüsü yazılır. Dosya yoksa kurulum durur.
- Kapanış zinciri: `systemctl poweroff -i --no-block` → `poweroff -f` → `halt -f`.

### 2. scripts/test-install-qemu.sh — log akışı ve akıllı bitiş
- QEMU çağrıları `stdbuf -oL -eL` ile başlatılır; seri çıktı zaten dosyaya yazılıyor, izleyici bu dosyayı okumaya devam eder.
- Her iki aşamada `-no-reboot -action shutdown=poweroff` (mevcut) korunur; UEFI aşamasında `-boot order=c,menu=on` ve SATA diskte `bootindex=1` kullanılır.
- İlerlemesizlik sınırı 420s yerine 180s.
- Başarı bayrağı (`TEDBIRGE_INSTALL_OK` / `TEDBIRGE_BOOT_READY`) görüldüğü anda QEMU 15 saniye içinde kapanmazsa `kill -9` ile sonlandırılır ve aşama BAŞARILI sayılır (uyarı satırıyla).
- Bayrak yoksa: aşama başarısız kalır ve **UEFI firmware logu (`-debugcon`) ile seri logun son satırları hata çıktısında basılır**, böylece sessiz açılış hatası bir daha kör nokta olmaz.

### 3. image/build.sh
- Canlı imaj GRUB/isolinux tarafında seri konsol parametreleri zaten var; ek olarak derleme sonunda ISO içinde `EFI/BOOT/BOOTX64.EFI` varlığı denetlenir (yoksa derleme durur).

### 4. Doğrulama
- `bash -n` tüm değişen betikler, `scripts/check-image-config.sh`, paket doğrulaması.
- Değişiklik yayınlandığında CI hattı iki sürüm (workstation + touch) × BIOS/UEFI için yeniden koşar.

## Teknik not

Dokunulacak dosyalar: `image/install/tedbirge-kur`, `scripts/test-install-qemu.sh`, `image/build.sh`, gerekirse `scripts/check-image-config.sh` (yeni değişmezleri denetlemek için). Kritik davranış değişikliği: açılış yükleyici adımlarındaki `|| true` kaldırılıyor — hatalı imajın "başarılı" görünüp yayınlanması bu yüzden mümkündü.
