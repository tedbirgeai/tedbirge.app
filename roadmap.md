# Teslim yol haritası

- [x] Kurulum imajını Debian live-build'e taşı (kök derleme sırasında pişirilir, açılışta paket kurulmaz)
- [ ] Yeni Debian aday ISO'sunu GitHub hattında üret, yapısal doğrulama ve tüm QEMU testlerinden geçir
- [ ] Doğrulanmış Debian adayını yayınla; eski Alpine imajını indirme kanalından kaldır
- [ ] Gerçek donanımda (Gigabyte H81M-S1) yeni Debian imajıyla açılış ve kurulum doğrulaması
- [x] BIOS/UEFI QEMU testlerini taşınabilir ve kesin sonuçlu yap
- [x] Canlı açılış kökü ve servis başarı işaretini doğrula
- [x] Kalıcı disk kurulumunu BIOS/UEFI için tutarlı hale getir
- [x] Testleri ve mevcut uygulama derlemesini doğrula
- [x] Yalnız başarılı paketin yayınlanmasını güvenceye al
- [x] Disk bölümlemeyi BIOS/UEFI için ortak GPT düzeni ve açıklanabilir hata kodlarıyla sağlamlaştır
- [x] Kurulum boyunca boş konsolu kaldır; tekrar dene/canlı masaüstü/kapat kurtarma menüsünü kur
- [x] Canlı masaüstü ve ilk açılış hazır sinyalini gerçek kiosk durumu üzerinden doğrula
- [x] Etkileşimli kurucu sözleşmesi ve hata sonrası dönüş denetimlerini CI hattına ekle
