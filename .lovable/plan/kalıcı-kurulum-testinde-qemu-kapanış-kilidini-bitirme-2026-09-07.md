# Kalıcı kurulum testinde QEMU kapanış kilidini bitirme

Kurulum artık gerçekten başarılı: kayıtlarda hem `TEDBIRGE_INSTALL_OK` hem `TEDBIRGE_BOOT_READY` görünüyor. Tek başarısızlık nedeni, test aracının sanal makineyi kapatırken 30 saniye içinde yanıt alamayıp koşuyu "başarısız (kod 4)" saymasi. Yani ürün sağlam, ölçüm aracı hatalı.

## Yapılacaklar

1. Sanal makine başlatma parametreleri
   - Her iki aşamada da `-no-reboot` yanına `-action shutdown=poweroff` eklenir; konuk sistem kapandığında emülatör kendiliğinden sıfır koduyla sonlanır.

2. Kapanış bekleme mantığı (asıl düzeltme)
   - Bekleme süresi 30 saniyeden 60 saniyeye çıkarılır.
   - Başarı bayrağı (`TEDBIRGE_INSTALL_OK` / `TEDBIRGE_BOOT_READY`) kayda düşmüşse ve emülatör 60 saniyede kapanmamışsa, süreç zorla sonlandırılır ve aşama BAŞARILI sayılır.
   - Bayrak yoksa eski davranış korunur: kilitlenme gerçek hata olarak raporlanır ve imaj yayınlanmaz.
   - Zorla sonlandırma sonrası bilgi amaçlı uyarı satırı yazılır (sessizce yutulmaz).

3. Konuk taraf kapanışı
   - Kurulum sonunda `poweroff -f` zaten çağrılıyor; ek olarak öncesinde `systemctl poweroff -i --no-block` denenip başarısızsa `poweroff -f`/`halt -f` zincirine düşülür, böylece ACPI S5 aşamasında asılı kalma ihtimali kapanır.

4. Doğrulama
   - Betik sözdizimi kontrolü ve imaj yapılandırma denetimi çalıştırılır.
   - Değişiklik yayınlandığında CI hattı yeniden tetiklenir; iki sürüm (workstation, touch) için BIOS ve UEFI zincirinin tamamının geçmesi beklenir.

## Teknik ayrıntı

Dosyalar: `scripts/test-install-qemu.sh` (parametreler + `qemu_temiz_kapat` ve `kurulum_senaryosu` içindeki dönüş kodu değerlendirmesi), `image/install/tedbirge-kur` (kapanış zinciri).
`QEMU_STOP_TIMEOUT` varsayılanı 60 olur. `qemu_temiz_kapat` yeni bir "bayrak görüldü mü" argümanı alır; görülmüşse `kill -9` sonrası 0 döner, görülmemişse 1 döner ve senaryo başarısız olur.
