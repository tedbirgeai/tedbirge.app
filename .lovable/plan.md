# Tedbirge® WebOS — ISO Kurtarma, Doğrulama ve Teslim Planı

## Doğrulanan mevcut durum

- Son GitHub çalışması (`c7aa9f3`, 6 Eylül 2026) Debian `live-build` ile ISO üretimini tamamladı; iş, ISO içeriği denetiminde `ISO içinde zorunlu açılış bileşeni yok: /live` hatasıyla durdu. Bu nedenle BIOS/UEFI açılış, kalıcı kurulum ve yayın adımları hiç çalışmadı.
- Denetimde kullanılan `xorriso -find "$path" -print` çağrısı geçerli xorriso eylem söz dizimini kullanmıyor. Hata çıktısı gizlendiği için komut hatası “dosya yok” olarak raporlanıyor. İlk ve doğrudan CI kök nedeni budur.
- Yayındaki sabit imaj 6 Eylül 05:12 UTC tarihli, 681.574.400 bayt ve `a56c8590…e4e921` özetli `fb3cd08` imajıdır. Bu commit’in üretim hattı Alpine 3.20’yi çağırıyor. Fiziksel ekrandaki `6.6.142-0-lts #1-Alpine`, `switch_root` ve `Attempted to kill init` çıktısı bu eski imajla birebir uyumludur; yeni Debian hattından gelemez.
- `/api/public/iso?durum=1` şu anda bu eski sabit dosyayı “hazır” gösteriyor. Başarısız yeni çalışmalar eski `latest` varlığını kaldırmadığı için kullanıcı yanlış imajı indirmeye devam edebiliyor.
- Kalıcı kurulum testi, yorumunda `tedbirge.autoinstall=1` kullandığını söylese de QEMU komutuna bu parametreyi vermiyor. Dolayısıyla ISO doğrulama kapısı düzelse bile kurulum servisi başlamayacak ve test süre aşımına uğrayacak.
- Arayüz “açılış menüsünde SSD/HDD’ye Kur” diyor; aktif Debian yapılandırmasında bu seçeneği oluşturan özel BIOS/UEFI menüsü yok. Belgelenen akış ile gerçek imaj uyuşmuyor.
- Haberler özelliği derleme, tip, route ve tarayıcı/sunucu sınırları bakımından sağlam. Canlı `tedbirge.app/api/public/haberler` güncel gündem ve teknoloji kayıtları döndürüyor; bu özellik ISO hatasının nedeni değil.

## Uygulama planı

### 1. Hatalı ISO doğrulamasını kesin ve gözlemlenebilir hale getir

- `xorriso -find … -print` yerine geçerli, çıkış kodu denetlenen bir ISO listeleme yöntemi kullan.
- `/live/filesystem.squashfs`, çekirdek ve initrd için gerçek dosya/boyut kontrolü yap; yalnız klasör adına veya ISO toplam boyutuna güvenme.
- Squashfs’i geçici dizine çıkarmadan listeleyerek şunları doğrula: systemd/init, Chromium, nginx, `tedbirge-kur`, WebOS arayüzü, Wasm çekirdeği ve sürüm damgası.
- Her komutun stderr ve çıkış kodunu koru; “araç hatası”, “dosya eksik” ve “yanlış dağıtım” ayrı hata mesajları versin.
- ISO içinde `Alpine`, `apkovl` veya eski çekirdek imzası görülürse yayın kesin olarak dursun.

### 2. Tek ve gerçek son kullanıcı kurulum akışı oluştur

- Debian live-build için hem Legacy BIOS/syslinux hem UEFI/GRUB menüsüne iki açık seçenek ekle:
  1. `Tedbirge® WebOS — Canlı Başlat`
  2. `Tedbirge® WebOS — SSD/HDD’ye Kur`
- Kurulum seçeneği `tedbirge.autoinstall=1` değil, güvenli etkileşimli kurulum kipini başlatsın; disk ancak kullanıcı seçip `EVET` yazdıktan sonra silinsin.
- Otomatik CI kipi ayrı bir parametreyle kalsın ve yalnız test ortamında hedef diski otomatik seçsin.
- Canlı sistem açıldığında kurulum seçeneği ayrıca erişilebilir olsun; belge ve ekrandaki anlatım gerçek davranışla aynı hale gelsin.

### 3. Kalıcı kurucuyu donanım çeşitliliğine göre sağlamlaştır

- Canlı USB’yi `lsblk` üst aygıt ilişkisiyle güvenilir biçimde dışla; NVMe, eMMC, SATA, USB ve optik ortam adlarını metin kırparak tahmin etme.
- BIOS ve UEFI kurulumlarını ayrı yollar ve ayrı doğrulamalarla çalıştır:
  - BIOS: bölüm tablosu + önyükleme bayrağı + `i386-pc` GRUB.
  - UEFI: GPT + EFI sistem bölümü + çıkarılabilir yol `EFI/BOOT/BOOTX64.EFI`.
- Hedef köke bind mount, DNS, initramfs, GRUB ve `fstab` adımlarında sessizce devam eden hataları kaldır; başarısız komut yayın kapısını düşürsün.
- Kurulum kaydını canlı sistemde ve hedef diskte koru; hata ekranı son kullanıcıya neden ve uygulanabilir çözüm göstersin.

### 4. Test zincirini gerçek davranışı sınayacak şekilde düzelt

- Yapısal test: ISO etiketi, hibrit USB özelliği, BIOS ve UEFI El Torito kayıtları, `/live` dosyaları ve squashfs içeriği.
- Canlı açılış matrisi: Legacy IDE, SATA/AHCI, USB EHCI, USB XHCI, UEFI, 2 GB ve 4 GB RAM.
- Kalıcı kurulum matrisi iki ayrı uçtan uca senaryo içersin:
  - Legacy BIOS: ISO’dan aç → test diskine kur → ISO’yu çıkar → diskten aç → `TEDBIRGE_BOOT_READY`.
  - UEFI: aynı zincir OVMF CODE/VARS ile.
- Kurulum testinde Debian çekirdek/initrd dosyalarını ISO’dan çıkarıp QEMU’ya doğrudan vererek `tedbirge.autoinstall=1` parametresinin gerçekten ulaştığını doğrula; ayrıca kullanıcı menüsü yapısal olarak kontrol edilsin.
- Panik, init yokluğu, canlı ortam bulunamaması, GRUB hatası, kurulum servisi hatası, erken QEMU kapanması ve süre aşımı birbirinden ayrıştırılsın; tüm loglar başarısız çalışmada artefakt olarak yüklensin.

### 5. Eski Alpine imajının tekrar sunulmasını engelle

- İmaj içine makinece okunur kimlik ekle: dağıtım `Debian bookworm`, commit, üretim zamanı, sürüm ve dosya özeti.
- Sabit dosya adının yanında commit içeren sürümlü dosya üret; `SHA256SUMS` her ikisini de kapsasın.
- İndirme API’si yalnız beklenen Debian kimliği, minimum sürüm ve geçerli özet bilgisi olan yayın varlığını “hazır” saysın. `VITE_ISO_DOWNLOAD_URL` varsa doğrulanmadan GitHub’ın önüne geçmesin.
- Başarısız yeni derleme varken eski `latest` dosyasını sessizce sunma: durum API’si “yeni imaj doğrulanıyor” desin ve indirme düğmesi eski Alpine dosyasını vermesin.
- Release temizliğiyle tarihsel, aynı adlı Alpine varlıklarını `latest` üzerinden kaldır; yalnız başarıyla test edilmiş tek sabit ISO ve ona ait özet kalsın.

### 6. Haberleri ve WebOS paketini ISO içinde doğrula

- Canlı haber API’sinin kayıt döndürdüğünü yayın öncesi doğrula.
- Statik ISO arayüzünde Haberler, Mağaza, Sohbet ve Arama uygulamalarının katalog/pencere bağlantılarını smoke test et.
- İnternet yokken haber alanının son cihaz önbelleğini veya açık bir çevrimdışı durumu göstermesini; WebOS masaüstünün tamamen açılmasını kontrol et.

### 7. Aşamalı yayın ve geri dönüşsüz teslim

- Önce sürümlü bir **aday Debian ISO** üret; tüm yapısal, canlı açılış ve iki kalıcı kurulum testi geçmeden `latest` güncellenmesin.
- Başarılı çalışmanın ISO adı, boyutu, SHA-256 özeti, commit’i ve Debian kimliği Release notunda yayımlansın.
- `tedbirge.app` indirme durumu yeni adayın kimliğini göstermeli; kullanıcı indirdiği dosyayı yazmadan önce özeti doğrulayabilmeli.
- Otomatik kontroller geçince aday imaj GitHub’da yayımlanır ve indirme bağlantısı yeni Debian dosyasına çevrilir.

## Gerçek donanım kabul testi

Gerçek Gigabyte H81M-S1 BIOS/UEFI ve fiziksel SSD/HDD bu çalışma ortamından kontrol edilemez. Bu nedenle “gerçek donanımda test edildi” iddiası otomatik testlerle değiştirilmeyecek.

Yeni aday yayımlandıktan sonra tek fiziksel kabul turu uygulanacak:

1. Release’de gösterilen SHA-256 ile indirilen dosyayı karşılaştır.
2. Rufus’ta DD kipinde temiz USB’ye yaz.
3. Secure Boot kapalı, SATA modu AHCI iken önce Legacy BIOS, sonra mümkünse UEFI açılışı dene.
4. Açılış ekranında Debian kimliğini ve yeni commit/sürüm damgasını doğrula; `Alpine` veya `-lts` görülürse testi hemen reddet.
5. `SSD/HDD’ye Kur` seçeneğiyle hedef diski seç, `EVET` onayı ver, tamamlanınca USB’yi çıkar ve yerel diskten aç.
6. Masaüstü, ağ, ses, ekran, yeniden başlatma, Haberler, Mağaza, Sohbet ve Arama temel kontrollerini yap.
7. Sonuç geçerse aday `latest`/kararlı olarak işaretlenir; geçmezse eski imaj yeniden sunulmadan aday bloke edilir ve kalıcı log üzerinden tek noktadan düzeltilir.

## Diğer işletim sistemlerinden alınan yaklaşım

- Debian Live/Ubuntu: önceden hazırlanmış squashfs kök + initramfs live ortamı + ayrı kurucu. Tedbirge için en düşük riskli temel budur.
- Fedora: dracut ile güçlü donanım keşfi + Anaconda ile ayrı kurulum katmanı. Bizde bunun karşılığı geniş initramfs sürücü seti ve kurucunun canlı açılıştan ayrılmasıdır.
- Archiso: açık profil, kesin paket listesi ve tekrar üretilebilir imaj. Bizde paket ve zorunlu dosya manifesti aynı görevi görmelidir.
- ChromeOS/SteamOS: A/B imaj ve imzalı güncelleme zinciri. İlk kararlı teslimden sonra güvenli güncelleme için hedeflenmeli; mevcut açılış sorununu çözmek için bu tura eklenmeyecek.

## Kabul ölçütleri

- CI’daki ISO yapı denetimi yanlış pozitif vermeden geçer.
- Beş canlı açılış senaryosu ile BIOS ve UEFI kalıcı kurulum senaryoları geçer.
- Yayındaki sabit ISO artık Alpine çekirdeği içermez; sürüm/commit/özet görülebilir ve eşleşir.
- `tedbirge.app` eski imajı sunmaz; yeni aday yoksa açıkça “hazırlanıyor” der.
- Fiziksel H81M-S1 testi tamamlanana kadar “gerçek donanımda doğrulandı” denmez.
- Kaynak kod kontrolleri, tip denetimi, uygulama testleri, güvenlik denetimi ve haber API’si başarılıdır.

## Kapsam sınırı

Bu uygulama turu; ISO üretim/kurulum/yayın zinciri, haber entegrasyonunun paket içi doğrulaması ve ilgili kullanıcı yönlendirmeleriyle sınırlıdır. Ürün işlevlerine veya görsel tasarıma ilgisiz değişiklik yapılmayacaktır.
