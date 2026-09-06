# Tedbirge® WebOS — Kurulum İmajı (.iso)

Bilgisayarınızda hiçbir şey derlemenize gerek yok. Yapmanız gereken üç şey var:

1. **İndir** — Uygulamadaki “Kurulum İmajını İndir (.iso)” düğmesine basın.
   Doğrudan yayınlanmış hazır imaj iner.
2. **USB'ye yaz** — Boş bir USB bellek takın ve şu araçlardan birini kullanın:
   - **Rufus** (Windows): imajı seçin → Başlat → sorulduğunda **DD Image / DD kalıbı** seçin
   - **BalenaEtcher** (Windows/macOS/Linux): Flash from file → hedefi seçin → Flash
   - **Ventoy**: `.iso` dosyasını Ventoy USB'sine kopyalamanız yeterli
3. **Başlat** — Bilgisayarı USB'den açın (açılışta genelde F12, F9, Esc veya Del).

## Açılış ve kurulum

Bilgisayar USB'den açıldığında sistem doğrudan Tedbirge® WebOS ekranına gelir.
Hiçbir kurulum adımı, paket indirmesi veya internet bağlantısı gerekmez —
sistemin tamamı imajın içinde hazır olarak gelir.

Kalıcı kurulum için arayüzden konsolu açın ve şunu yazın:

```
sudo tedbirge-kur
```

Sihirbaz diskleri listeler; siz büyük harflerle `EVET` yazana kadar hiçbir diske
yazmaz. Kurulum bittiğinde USB'yi çıkarıp yeniden başlatın.


## Bilgisayar gereksinimleri

| | En az | Önerilen |
| --- | --- | --- |
| Bellek (RAM) | 2 GB | 4 GB ve üzeri |
| Disk (kalıcı kurulum için) | 8 GB | 32 GB ve üzeri |
| İşlemci | 64‑bit (x86_64) | 2 çekirdek ve üzeri |

Canlı kullanımda sistem tamamen bellekte çalışır; 2 GB'ın altındaki bilgisayarlarda
açılış tamamlanmaz. Kalıcı kurulum yapılan bilgisayarda bu sınır geçerli değildir.

Desteklenen açılış biçimleri: klasik BIOS (CSM) ve UEFI. Disk türleri: SATA, IDE,
NVMe, eMMC ve USB. Kurulum sihirbazı bilgisayarın açılış biçimini kendisi tanır ve
uygun açılış bölümünü kendisi oluşturur.

## Notlar

- Bazı bilgisayarlarda USB'den açılış için BIOS/UEFI ayarlarından **Secure Boot** kapatılmalıdır.
- Rufus'ta “ISO çıkarma” kipini kullanmayın; canlı ortamın etiketi ve paket deposu korunması
  için **DD Image / DD kalıbı** gereklidir.
- Eski masaüstlerinde disk modu BIOS içinde **AHCI** seçilmelidir; "IDE/RAID" seçiliyken
  bazı diskler görünmeyebilir.
- Sistem açıldığında arayüz tam ekran kiosk modunda gelir; ağdaki diğer cihazlar da
  `http://<cihaz-ip>/` adresinden erişebilir.
- Wi‑Fi ve ağ ayarları arayüz içindeki Ayarlar bölümünden yapılır.
- Kurulum sırasında bir sorun çıkarsa kayıt dosyası kurulan sistemde
  `/var/log/tedbirge/kurulum.log` içinde saklanır.


## İmaj nasıl üretiliyor (teknik)

İmaj GitHub Actions üzerinde otomatik derlenir: `.github/workflows/build-iso.yml`
→ `image/build.sh` (Debian bookworm live-build).

Temel ilke: kök dosya sistemi **derleme sırasında bir kez** kurulur ve tek bir
sıkıştırılmış dosyaya (squashfs) pişirilir. Kullanıcının bilgisayarı açılışta
hiçbir paket kurmaz, yalnızca hazır kökü bağlar. Önceki Alpine hattı her açılışta
paket kurduğu için `Attempted to kill init` paniği veriyordu; o hat
`archive/alpine/` altına kaldırıldı.

Yayın hattı imajı üretmeden önce yapılandırmayı (`scripts/check-image-config.sh`),
ürettikten sonra ISO yapısını, BIOS+UEFI açılış kayıtlarını, beş QEMU açılış
senaryosunu ve `scripts/test-install-qemu.sh` ile diske kurulum + kurulan
sistemden yeniden açılışı doğrular. Bu denetimlerden biri bile geçmezse imaj
yayınlanmaz. Çıktı GitHub Releases alanına yüklenir ve `/api/public/iso` rotası
her zaman en güncel dosyaya yönlendirir.
Depo: **tedbirgeai/tedbirge.app** — https://github.com/tedbirgeai/tedbirge.app/releases/latest

Denemek için sanal makine:

```
qemu-system-x86_64 -m 2048 -enable-kvm -cdrom tedbirge-webos-x86_64.iso
```
