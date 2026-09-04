# Tedbirge® WebOS — Hazır ISO Dağıtımı (CI/CD + Doğrudan İndirme)

Son kullanıcı hiçbir şey derlemez. Docker, WSL, xorriso, bash yok. Tek akış:
**ISO'yu indir → Rufus/BalenaEtcher ile USB'ye yaz → bilgisayarı USB'den başlat.**

```text
GitHub Actions (Alpine + Docker runner)
   → mkimage + apkovl → tedbirge-webos-x86_64.iso
   → GitHub Releases (latest)
        ↓
"ISO İndir" butonu → /api/public/iso → en güncel .iso ikilisi
        ↓
USB → Önyükleme → GRUB menüsü: [Canlı Kiosk] / [Diske Kur]
```

## 1. Otomatik derleme hattı (GitHub Actions)

`.github/workflows/build-iso.yml`
- Tetik: `main`'e push, `v*` tag'i, ve elle çalıştırma (`workflow_dispatch`).
- Adımlar: Bun ile web paketini derle → `alpine:latest` konteynerinde `alpine-sdk`, `xorriso`, `syslinux`, `grub-efi`, `mtools`, `dosfstools` kur → `aports` klonla → Tedbirge profilini kopyala → `mkimage.sh` çalıştır.
- Çıktı: `tedbirge-webos-<sürüm>-x86_64.iso` + `SHA256SUMS`.
- Tag derlemesinde `softprops/action-gh-release` ile GitHub Releases'a yüklenir; push derlemesinde `latest` ön-sürümü güncellenir. Ayrıca artifact olarak saklanır.
- İmaj üretilmezse veya 100 MB altındaysa iş **başarısız** olur; sahte çıktı yayınlanmaz.

## 2. Alpine profili ve overlay

`alpine/mkimg.tedbirge.sh` — canlı ISO profili: `linux-lts`, `openrc`, `nginx`, `chromium`, `xorg-server`, `xinit`, `dbus`, `mesa-dri-gallium`, `alpine-conf` (setup-disk için), `syslinux` + `grub-efi` (BIOS ve UEFI birlikte).

`alpine/genapkovl-tedbirge.sh` — ISO'ya gömülen yapılandırma:
- Web paketi `/var/www/localhost/htdocs` altına açılır.
- `nginx.conf`: 80 portu, SPA fallback (`try_files $uri /index.html`), `application/wasm` MIME, COOP/COEP başlıkları, `/kernel/*` uzun önbellek.
- `inittab` ile tty1'de otomatik oturum; `.xinitrc` ekran koruyucuyu kapatıp `chromium --kiosk --app=http://127.0.0.1/` başlatır. Chromium açılmazsa `cog` yedeği, o da yoksa başsız düğüm olarak devam eder ve adresi yazar.
- OpenRC `default` seviyesine `nginx`, `dbus` ve mevcut `tedbirge-shell` servisi eklenir.

## 3. Önyükleme menüsü ve diske kurulum

`alpine/boot/grub.cfg` + `syslinux.cfg` — iki seçenek:
1. **Tedbirge® WebOS (Canlı Kiosk)** — RAM'den çalışır, diske dokunmaz.
2. **Tedbirge® WebOS (SSD/HDD'ye Kur)** — çekirdeğe `tedbirge.install=1` parametresi geçer.

`alpine/install/tedbirge-kurulum.sh` (ISO içinde, `local.d` ile tetiklenir): parametre görülünce Türkçe tam ekran sihirbaz açılır — hedef disk seçimi, açık uyarı ve onay, sonra `setup-disk -m sys` ile kalıcı kurulum, apkovl kopyalanır, bootloader yazılır, yeniden başlatılır. Onay verilmezse canlı moda döner. Disk yoksa/yazılamazsa anlaşılır Türkçe hata verir.

## 4. İndirme akışı (`src/routes/api/public/iso.ts`)

- Rota tamamen sadeleşir: kurulum kiti (.zip/.bat/.sh/.ps1) üretimi **kaldırılır**.
- Sıra: `VITE_ISO_DOWNLOAD_URL` tanımlıysa oraya; yoksa GitHub Releases `latest` API'sinden `.iso` varlığı bulunup 302 ile ona yönlendirilir; yayında ISO yoksa 503 + arayüzde “imaj henüz yayınlanmadı, sürüm hazırlanıyor” mesajı (sahte dosya yok).
- `src/lib/iso-release.ts`: GitHub deposu/sürüm bilgisi tek doğruluk kaynağı olur.
- `src/components/shell/BareMetalIso.tsx`: metin tek akışa indirgenir — indir, USB'ye yaz, başlat. Yerel derleme/WSL anlatımı kaldırılır; sürüm numarası, boyut ve SHA-256 gösterilir.
- `scripts/build-iso.sh` yalnızca geliştirici aracı olarak kalır (etiketlenir); son kullanıcı akışında yer almaz.

## 5. Belgeler
`ISO.md` — indirme adresi, Rufus/BalenaEtcher/Ventoy ile USB yazma, UEFI/Secure Boot notu, canlı ve kurulum modu farkı, QEMU ile deneme. Tamamı Türkçe ve komut satırı gerektirmeyen dille.

## Teknik notlar
- ISO derlemesi bu ortamda **çalıştırılmaz**; workflow ve profil dosyaları depoya eklenir, ilk imaj GitHub Actions'ta üretilir. Depo `tedbirgeai/aetheris` üzerinde çalıştırılacaksa Actions izinlerinin (`contents: write`) açık olması gerekir.
- Secure Boot imzalama kapsam dışıdır; kullanıcıya UEFI'de Secure Boot'u kapatması gerekebileceği belirtilir.
- Uygulama kodu, Wasm çekirdeği, VFS ve pencere yöneticisi değişmez; iş yalnızca dağıtım katmanındadır.
