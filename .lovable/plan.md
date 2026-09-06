# Tedbirge® WEBOS açılış ve kurulum zincirini sağlamlaştırma

## Hedef

Fotoğraftaki `switch_root` / `Attempted to kill init (exitcode=0x100)` çökmesini, yalnız görünen hatayı bastırmadan canlı sistemin kök dosya sistemi oluşturma zincirinde gidermek. Çalışan web arayüzü ve ürün işlevleri değişmeden kalacak.

Destek kapsamı: 64-bit Intel/AMD masaüstü ve dizüstüler; hem klasik BIOS hem UEFI; SATA, NVMe, eMMC ve USB önyükleme. ARM cihazlar ve Apple Silicon bu x86_64 imajının kapsamı dışındadır.

## Uygulama

1. **Canlı açılışta eksik/yarım kök sistemi oluşmasını önle**
   - Alpine diskless açılışında yüzlerce MB paketin RAM tabanlı köke kurulması sırasında oluşan alan baskısını azalt.
   - Firmware’i iki kez kök sisteme kurmak yerine Alpine modloop üzerinden yükle; yalnız kullanıcı alanında gerçekten gereken grafik, ağ, ses ve kurulum paketlerini bırak.
   - Kök tmpfs için sabit küçük tavan kullanmadan güvenli oransal alan tanımla; düşük RAM’de sessizce yarım kurulum yerine açık hata üret.
   - `/sbin/init`, çalıştırıcı yükleyicisi, OpenRC ve zorunlu servis dosyalarının ISO içinde gerçekten bulunduğunu yayın öncesi doğrula.

2. **Kalıcı disk kurulumunu BIOS ve UEFI için düzelt**
   - GPT düzenine BIOS önyükleme bölümü + EFI bölümü + ext4 sistem bölümü koy.
   - EFI bölümünü sistem kopyalanmadan önce doğru yere bağla; çalışma moduna göre UEFI veya BIOS kurulumu yap.
   - Alpine kurulum aracına hedef diski açıkça ver; ikinci kez ve hatası gizlenerek çalışan GRUB kurulumunu kaldır.
   - SATA/NVMe/eMMC bölüm adlarını, minimum disk alanını, disk görünürlüğünü ve her kritik kopya/bağlama/önyükleyici sonucunu doğrula.
   - Kurulan sisteme yalnız temel Alpine değil, WebOS’un gerçek çalışma paketlerini ve etkin servislerini kalıcı olarak taşı; başarı mesajını ancak açılabilir sistem kontrolleri geçince göster.

3. **Donanım uyumluluğunu koru**
   - Intel/AMD grafik, yaygın Wi‑Fi/Ethernet, ses, ACPI, USB 2/3, SATA/AHCI, NVMe ve eMMC sürücülerini koru.
   - Donanım hızlandırma bulunmazsa mevcut yazılım çizimi geri dönüşünü sürdür.
   - Belleği yetersiz bilgisayarda grafik başlatmayı zorlayıp çekirdeği çökertmek yerine anlaşılır tanılama ve güvenli konsol geri dönüşü sağla.

4. **Hatalı ISO’nun yayımlanmasını engelle**
   - Üretilen ISO’da birim etiketi, boot parametreleri, paket deposu, apkovl, kernel/initramfs/modloop ve kurulum dosyalarını yapısal olarak denetle.
   - QEMU’da en az BIOS+USB ve UEFI açılış senaryolarını çalıştır; `/sbin/init`, kurtarma kabuğu, kernel panic ve zaman aşımını kesin başarısızlık say.
   - Canlı sistem servisleri başladı işaretine ek olarak, gerçek kurulum bağımlılıklarının ve WebOS paket dünyasının mevcut olduğunu kontrol et.
   - Kontroller geçmeden Release varlığı oluşturma; sabit ISO adı ve SHA-256 çıktısını koru.

5. **Doğrulama**
   - Kabuk/YAML sözdizimi, paket listesi ve açılış invariant testleri.
   - Mevcut uygulama güvenlik kontrolü, testleri ve derlemesi.
   - Docker erişimi varsa gerçek Alpine `mkimage` üretimi; ardından BIOS ve UEFI QEMU smoke testleri.
   - Sonuçta yeni ISO’nun yeniden indirilmesi gerektiğini sürüm/özet içinde açıkça belirt.

## Teknik not

Ekrandaki hata disk kurulum sihirbazından önce, canlı Alpine kökü hazırlanıp PID 1’e geçilirken oluşuyor. Bu nedenle yalnız GRUB veya USB yazma biçimini değiştirmek yeterli değil; paket/RAM kök kurulumu, init bütünlüğü, BIOS/UEFI disk kurulumu ve yayın testi birlikte düzeltilmeli.
