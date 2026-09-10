# Tedbirge® WebOS — Kurulum Sonrası Açılmama Sorununu Kökten Giderme Planı

## Doğrulanmış durum

- Son ISO çalışması `48502dd` için otomatik hat **başarılı** görünmektedir ve güncel Workstation/Touch ISO dosyaları yayındadır.
- Kurucu `%100` demeden önce çekirdek, initramfs, GRUB menüsü, disk UUID’si ve UEFI dosyasının varlığını denetliyor; fakat hedef diski gerçekten yeniden başlatıp masaüstünü açarak doğrulamıyor.
- Otomatik test BIOS ve UEFI’de sanal SATA diskten ikinci açılışı deniyor; fiziksel ekran kartı, gerçek firmware davranışı, NVMe/SATA çeşitleri ve grafik masaüstü kurtarma yolu bu testin dışında kalabiliyor.
- Kurulum ISO’sunda güvenli görüntü ve uyumluluk seçenekleri var; kurulan diskin GRUB menüsünde aynı kurtarma seçeneklerinin üretildiği garanti edilmiyor.
- İş akışı aynı dalda yeni çalışma başlayınca uzun testi iptal edebiliyor (`cancel-in-progress: true`); bu, doğrulama tamamlanmadan yeni ISO’nun güvenilir sanılmasına yol açabilir.

## Uygulama

### 1. `%100` başarı ölçütünü gerçek açılabilirlik sözleşmesine bağla

- Kurulum sonunda yalnız dosya varlığını değil, GRUB yapılandırma sözdizimini ve hedef kök UUID/çekirdek/initramfs eşleşmesini doğrula.
- Initramfs içeriğinde gerçek disk açılışı için gerekli AHCI, NVMe, USB, virtio, ext4 ve firmware bileşenlerini denetle.
- BIOS kurulumunda önyükleme kodunun hedef diske yazıldığını; UEFI kurulumunda ESP, `BOOTX64.EFI` ve taşınabilir GRUB yolunun okunabilir olduğunu doğrula.
- Kök bölüm ve ESP’yi temiz biçimde ayırıp yeniden bağlayarak dosya sistemi okuma testi yap; tüm kontroller geçmeden `%100` ve “kuruldu” mesajı verme.
- Başarı kaydına sürüm, disk, açılış kipi, UUID’ler ve tamamlanan doğrulama kapılarını yaz.

### 2. Fiziksel bilgisayarlar için çok kademeli açılış ve kurtarma

- Kurulan diskin GRUB menüsüne şu seçenekleri zorunlu ekle:
  1. Normal açılış
  2. Güvenli görüntü (`nomodeset`)
  3. Donanım uyumluluk kipi
  4. Metin/kurtarma kipi
- Normal grafik açılış başarısız olursa gözcü önce yazılım çizimine, ardından güvenli görüntü/metin kurtarma ekranına düşsün; siyah ekran veya yalnız imleçte kalmasın.
- Kurtarma ekranında disk, çekirdek, initramfs, ekran ve hizmet durumunu Türkçe göster; kurulum kaydını okunabilir biçimde sun.
- USB çıkarma ve yeniden başlatma akışında cihazın BIOS/UEFI kipini değiştirmemesi gerektiğini açıkça belirt; yeniden başlatma başarısızsa güvenli kapatma yedeği kullan.

### 3. Kurucuyu farklı disk ve firmware senaryolarına dayanıklı yap

- SATA, NVMe ve eMMC bölüm adlandırması ile hedef disk seçim korumalarını testlerle kapsa.
- UEFI için NVRAM’e bağımlı olmayan taşınabilir açılışı koru; ayrıca firmware’in standart fallback yolunu okuyabildiğini doğrula.
- Legacy BIOS + GPT için `bios_grub` bölümünü ve GRUB core image yerleşimini doğrula.
- Secure Boot açık olduğunda desteklenmeyen sessiz başarısızlık yerine kullanıcıya açık yönlendirme göster.
- Çok küçük, 4K sektörlü, eski bölüm imzalı ve yavaş disk senaryolarında yanlış başarıyı engelle.

### 4. CI/CD testini yayın kapısı haline getir

- Workstation ve Touch için BIOS ile UEFI kurulum + ikinci açılış testlerini ayrı, zorunlu işler olarak çalıştır.
- İkinci aşamada yalnız seri işaret aramakla kalma; kök bölümün doğru UUID’den bağlandığını, grafik hedefin başladığını, yerel arayüzün yanıt verdiğini ve masaüstü hazır sinyalini doğrula.
- NVMe, SATA/AHCI, 4K sektör ve düşük bellek senaryolarını matrise ekle.
- Sessiz açılışta GRUB, firmware, kernel, systemd ve kiosk kayıtlarını her durumda artifact olarak sakla.
- ISO iş akışında `cancel-in-progress` davranışını kapat; yarım kalan doğrulama sonucu yayın üretmesin.
- Her iki sürümün bütün zorunlu testleri geçmeden manifest `validated: true` olmasın ve `latest` dosyaları güncellenmesin.

### 5. Otomatik regresyon testleri

- Kurucu sözleşme testlerini metin aramasından davranış testlerine genişlet.
- Bozuk GRUB, eksik initramfs modülü, yanlış UUID, eksik UEFI fallback dosyası ve grafik açılış çökmesi için negatif testler ekle.
- Kabuk sözdizimi, güvenlik testleri, Vitest, web/office/VFS paket kontrolleri ve ISO doğrulama kapılarını birlikte çalıştır.
- Başarısız herhangi bir kapının yayın adımlarını kesin olarak engellediğini test et.

## Teslim ve doğrulama ölçütleri

- Kurucu, disk gerçekten önyüklenebilirlik denetimlerini geçmeden `%100` göstermez.
- BIOS ve UEFI’de ISO çıkarılmış halde hedef diskten açılış tamamlanır.
- Normal grafik açılmazsa güvenli görüntü veya kurtarma ekranı görünür; siyah ekran/yanıp sönen imleç oluşmaz.
- Workstation ve Touch için SATA, NVMe, 4K sektör ve düşük bellek otomasyonları yeşildir.
- Yalnız tüm zorunlu kapıları geçen ISO yayınlanır; kullanıcıya SHA256 ve doğrulanmış sürüm bilgisi verilir.
- Son adımda yeni ISO fiziksel USB’ye yazılarak gerçek bilgisayarda normal ve güvenli görüntü açılışı denenir. Fiziksel test sonucu görülmeden “tüm bilgisayarlarda kusursuz” garantisi verilmeyecek; başarısızlık olursa kurtarma ekranındaki kayıt doğrudan kök nedeni gösterecek.
