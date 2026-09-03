# Alpine Linux tabanlı önyüklenebilir Tedbirge® WebOS ISO'su

## Sorularınızın yanıtı (mevcut durum)

**1. Mimari kapsam.** Bugün üretilen ZIP paketi **yalnızca web dosyaları + kurulum betikleri**. İçinde Alpine'e özel embedded servis konfigürasyonu yok. Var olanlar:
- `scripts/build-iso.sh` — `dist/` + `tedbirge-shell` ikilisini bir kök ağacına koyup `xorriso` ile veri ISO'su üretiyor. Bu **önyüklenemez** (çekirdek/initramfs/bootloader yok).
- `scripts/build-bare-metal.sh` — systemd unit + OpenRC servis dosyası üretiyor (kısmen kiosk'a hazır).
- `src/routes/api/public/iso.ts` — gerçek `.iso` yayında yoksa, canlı sunucudan paketi indiren kurulum kitini (.sh/.bat/.ps1) veriyor.

**2. Kiosk launch.** Kısmen var: `boot.sh` içinde cog/chromium kiosk denemesi ve bir OpenRC servisi mevcut. Ancak Alpine için gereken `/etc/local.d` autostart, X/Wayland oturumu, `inittab` autologin ve nginx/httpd konfigürasyonu **yok**.

**3. Eksik bileşenler.** Alpine ISO'su için gereken `mkimage` profili, apkovl (overlay) üretimi ve `/var/www/localhost/htdocs` dağıtımı henüz hiç yok. Aşağıdaki iş bunları ekliyor.

## Yapılacak iş

### A. Alpine mkimage profili
`alpine/mkimg.tedbirge.sh` — `aports/scripts` içine kopyalanacak profil: `linux-lts`, `openrc`, `busybox-initscripts`, `nginx`, `chromium`, `xorg-server`, `xf86-video-*`, `xinit`, `dbus`, `mesa-dri-gallium`, `font-dejaproject` paketlerini içeren, syslinux/grub-efi ile hem BIOS hem UEFI açılan canlı ISO.
`alpine/genapkovl-tedbirge.sh` — apkovl üretici: aşağıdaki tüm konfigürasyonu ISO'ya gömer.

### B. Web katmanı dağıtımı
- Vite `dist/` çıktısı ISO içinde `/var/www/localhost/htdocs` altına açılır (apkovl içinde tar.gz olarak taşınır).
- `nginx.conf`: 80 portu, SPA fallback (`try_files $uri /index.html`), Wasm için `application/wasm` MIME, COOP/COEP başlıkları (SharedArrayBuffer/kernel için zorunlu), `/kernel/*.wasm` uzun önbellek.

### C. Kiosk açılış zinciri
- `inittab`: tty1 üzerinde `kiosk` kullanıcısıyla autologin.
- `/etc/profile.d/kiosk.sh`: tty1'de `startx` tetikler.
- `.xinitrc`: ekran koruyucu/DPMS kapalı, `chromium --kiosk --app=http://127.0.0.1/ --noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0`.
- OpenRC runlevel'leri: `nginx`, `dbus`, `tedbirge-shell` (mevcut OpenRC betiği yeniden kullanılır) `default` seviyeye eklenir.
- Chromium yoksa/GPU yoksa `cog` (WPE webview) yedeği; ikisi de yoksa headless düğüm olarak devam eder ve konsola erişim adresini yazar.

### D. Betik ve akış entegrasyonu
- `scripts/build-alpine-iso.sh`: `bun run build` → apkovl üret → Docker/Alpine chroot içinde `mkimage.sh` çalıştır → `build/iso/tedbirge-webos-<sürüm>-x86_64.iso`. Ana makinede Alpine yoksa açık Türkçe hata verir, sahte ISO üretmez.
- Mevcut `scripts/build-iso.sh` "veri ISO'su (önyüklenemez)" olarak etiketlenir; önyüklenebilir yol yeni betiğe yönlendirilir.
- `ISO.md`: USB'ye yazma (dd/Rufus/balenaEtcher), QEMU ile deneme, kalıcı kurulum (`setup-alpine` + `setup-disk`) adımları Türkçe anlatılır.
- `/api/public/iso.ts` davranışı korunur: gerçek imaj yayınlandığında akıtılır, yoksa kurulum kiti iner; kite Alpine ISO derleme adımı eklenir.

## Teknik notlar
- ISO derlemesi Linux ana makine + `alpine-sdk`/Docker gerektirir; Lovable sandbox'ında ISO **derlenmez**, dosyalar ve betikler repoya eklenir, çalıştırmayı siz veya bir CI işi yapar.
- Kalıcı kurulum için `setup-alpine` sonrası apkovl `/etc/apk/protected_paths.d` ile korunur; diske kurulumda `lbu commit` yerine normal dosya sistemi kullanılır.
- Uygulama kodu, Rust/Wasm çekirdeği, VFS ve pencere yöneticisi **değişmez**; bu iş yalnızca dağıtım/paketleme katmanı ekler.
