# BÖLÜNMÜŞ DERLEME PLANI — Workstation vs. Touch & Mobile

Bu tur hiçbir dosya değiştirilmedi. Analiz `image/build.sh`, `image/config/package-lists/tedbirge.list.chroot`, `9000-tedbirge.hook.chroot`, `image/install/tedbirge-kur` ve `scripts/check-image-config.sh` okunarak yapıldı.

## 1) Mimari değerlendirme — bölme mantıklı mı?

Kısa yanıt: **evet, ama paket listesi düzeyinde bölme; iki ayrı derleme hattı değil.**

Sayısal gerçekler:

| Ölçüt | Tek birleşik ISO | İki profil |
| --- | --- | --- |
| ISO boyutu | ~2.6–3.0 GB (tüm firmware + dokunmatik yığın) | Workstation ~2.4–2.7 GB · Touch ~2.6–2.9 GB |
| Derleme süresi (CI) | ~35–50 dk | Her profil ~35–45 dk; **paralel** iki iş → duvar saati aynı, CI dakikası 2× |
| Çalışma zamanı RAM | Fark ~40–70 MB (iio-sensor-proxy, sanal klavye, wacom girdi sürücüsü) | Workstation'da bu servisler hiç yok |
| Bakım yükü | 1 liste | 3 liste (ortak + 2 profil) + 2 doğrulama matrisi |

Kritik nokta — dürüst beyan: **boyutun büyük kısmı ayrılamaz.** `linux-image`, `linux-firmware` (Wi-Fi/GPU firmware), Mesa, Xorg ve Chromium toplamın ~%85'ini oluşturur ve her iki sürümde de zorunludur. Dokunmatik/sensör katmanı ISO'ya ancak **~40–80 MB** ekler. Yani bölmenin gerçek kazancı **disk boyutu değil**, şunlardır:

- Workstation'da gereksiz servis çalışmaz (daha temiz süreç tablosu, daha az D-Bus yüzeyi, daha hızlı açılış ~1–2 sn).
- Touch sürümünde dokunmatik odaklı kabuk davranışı (sanal klavye, jest, döndürme) varsayılan açık gelir — masaüstünde bu yanlış davranış olurdu.
- Hata alanı ayrışır: dokunmatik regresyonu masaüstü kullanıcısını etkilemez.

Bunun karşılığında CI dakikası ikiye katlanır ve her donanım düzeltmesi iki matriste doğrulanmalıdır. Bu maliyet, yalnız ortak taban tek yerde tutulursa (aşağıdaki `common` listesi) kabul edilebilir.

Alternatif olarak değerlendirilip **reddedilen** yol: tek ISO + açılışta donanım tespitiyle servisleri etkinleştirme. Reddi nedeni: dokunmatik cihaz tespiti (ACPI convertible/tablet mode) güvenilmez, hatalı tespit masaüstünde sanal klavyenin açılmasına yol açar; ayrıca "sıfır sürtünme" ilkesine ters şekilde davranış çalışma zamanında değişkenleşir.

Önerilen model: **tek `image/build.sh`, `--profile` argümanı ile iki ürün.** Ortak taban ve tüm boot/kurulum mantığı tek kaynakta kalır (Unix ilkesi: tek iş, iyi yap — build betiği yalnız derler, profil yalnız paket/servis seçer).

## 2) Bölünmüş uygulama planı (adım adım)

### Adım 1 — Paket listelerinin üçe ayrılması
`image/config/package-lists/` yeniden düzenlenir:
- `common.list.chroot` — live-boot, çekirdek, Xorg, Mesa, Chromium, nginx, NetworkManager, PipeWire, depolama/kurulum araçları, tüm Wi-Fi/BT/GPU firmware, `upower`, `udisks2`, `fwupd`, `v4l-utils`.
- `workstation.list.chroot` — `thermald`, `power-profiles-daemon`, `smartmontools`, `bolt`, `ddcutil`, `mdadm`, `intel-media-va-driver-non-free`, `vulkan-tools`.
- `touch.list.chroot` — `iio-sensor-proxy`, `xserver-xorg-input-wacom`, `libwacom-common`, `onboard` (ekran klavyesi), `libinput-tools`, `i2c-tools`, `xinput`, dokunmatik jest yardımcıları.
Derleme başında yalnız seçilen profilin listesi `config/package-lists/` içine kopyalanır; diğeri hiç girmez.

### Adım 2 — `image/build.sh` profil argümanı
`TEDBIRGE_EDITION=workstation|touch` (varsayılan `workstation`). Değişen tek şeyler: kopyalanan paket listesi, `--iso-application`/`--iso-volume` etiketi (`TEDBIRGE_WS` / `TEDBIRGE_TOUCH`), çıktı adı (`tedbirge-webos-workstation-x86_64.iso`, `tedbirge-webos-touch-x86_64.iso`) ve manifest içindeki `edition` alanı. Boot menüsü, kurulum aracı, hazır sinyali, seri konsol — hepsi ortak kalır.

### Adım 3 — Servis etkinleştirmenin profile duyarlı hâle gelmesi
`9000-tedbirge.hook.chroot` içinde ortak servisler her zaman etkinleşir; profil servisleri yalnız o paket kuruluysa (`systemctl enable X || true` yerine `dpkg -s X` kontrolü ile) etkinleşir. Böylece hook tek dosya kalır, profil listesi tek doğruluk kaynağı olur.

### Adım 4 — Kabuk (arayüz) tarafı tek kod, farklı varsayılan
`/etc/tedbirge-release` içine `EDITION=workstation|touch` yazılır. Arayüz bunu okuyup dokunmatik varsayılanlarını (büyük dokunma hedefleri, sanal klavye çağrısı, jest katmanı) açar/kapatır. Ayrı bir arayüz derlemesi yapılmaz — tek `dist`, tek davranış anahtarı.

### Adım 5 — Donanım katmanının tamamlanması (her iki profile de yansır)
Önceki donanım denetiminde çıkan eksikler ortak veya profil listelerine dağıtılır: backports çekirdeği (yeni Intel/AMD/Nvidia için zorunlu), `firmware-sof-signed`, `firmware-mediatek`, `firmware-nvidia-graphics` (`non-free`), `modemmanager` + `libmbim/libqmi` + `usb-modeswitch`, `brightnessctl` ile gerçek donanım parlaklığı, `upower` ile gerçek pil, kurulu sistemde `MODULES=most` portatifliği.

### Adım 6 — CI matrisi
`.github/workflows/build-iso.yml` `strategy.matrix.edition: [workstation, touch]` ile paralel iki iş üretir. Doğrulama (`verify-iso.sh`, QEMU BIOS/UEFI/kurulum) her iki imaj için ayrı koşar; Touch matrisine QEMU dokunmatik aygıt (`-device usb-tablet`) senaryosu eklenir. Release'e iki ISO + tek `SHA256SUMS` yüklenir.

### Adım 7 — Doğrulama betiği
`scripts/check-image-config.sh` profil farkındalığı kazanır: ortak zorunlu paketler her iki listede aranır, profil paketleri yalnız kendi listesinde; iki `.iso` adının ve `edition` alanının manifestte bulunduğu denetlenir.

### Adım 8 — İndirme sayfası
`BareMetalIso` bölümü iki seçenek gösterir: "Masaüstü & Dizüstü" ve "Tablet & Dokunmatik", her biri kısa bir "hangisini seçmeliyim" açıklamasıyla.

### Adım 9 — ARM64 / mobil (bu derlemenin dışında)
Touch Edition ileride ARM64 kolunun tabanı olur; ancak Snapdragon/MediaTek/Exynos telefonlar cihaz ağacı, üretici önyükleyicisi ve kilitli bootloader nedeniyle ayrı bir port hattı gerektirir. Bu, ayrı bir faz olarak planlanır; şimdi söz verilmez.

## Riskler
- CI dakikası iki katına çıkar; ISO boyutu kazancı küçüktür (asıl kazanç davranış ve servis temizliğidir).
- İki imaj = iki doğrulama matrisi; bir düzeltme unutulursa sürümler ayrışır. Ortak taban tek dosyada tutularak bu risk sınırlanır.
- Convertible cihazlarda kullanıcı yanlış sürümü indirebilir; indirme sayfasındaki açıklama bunu azaltır.

Onaylarsanız Adım 1–8 tek turda uygulanır; Adım 9 ayrı faz olarak kalır.
