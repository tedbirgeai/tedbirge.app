# Tedbirge® WebOS — Anahtar Teslim Grafik Kurulum Otomasyonu

## Kesin teşhis

Fotoğraflar, kurulumun disk veya kablo arızası nedeniyle değil, **kopyalama komutundaki uyumsuz seçenek nedeniyle** durduğunu gösteriyor:

- Kurucu `%14` biçimlendirme adımını tamamlıyor ve sistem kopyasına geçiyor.
- Ardından `unsquashfs` yardım ekranı açılıyor; bu, kullanılan Debian Bookworm sürümünün `-percentage` seçeneğini tanımadığının açık kanıtı.
- Kopyalama hiç başlamadan komut hata koduyla çıkıyor; kurucu bunu yanlış biçimde “disk/kablo arızası” olarak `KUR-001` mesajına dönüştürüyor.
- “Kurulum kaydı” penceresinde aracın kullanım metninin görünmesi de aynı teşhisi doğruluyor.
- Mevcut pencereli metin kurucusu klavyeyle kullanılabilir; **fareyi tüm aşamalarda güvenilir biçimde desteklemez**. Bu nedenle yalnız mevcut ekranı yamamak, istenen klavye+fare ve profesyonel deneyimi karşılamaz.

## Hedef

USB’den “Diske Kur” seçildiği andan, USB çıkarılıp kurulan sistemin gerçek masaüstü açılana kadar:

- boş ekran veya yalnız yanıp sönen imleç göstermeyen,
- klavye, fare ve dokunma ile çalışan,
- gerçek ilerleme ve geçen süre bilgisi veren,
- hata nedenini doğru sınıflandıran,
- BIOS ve UEFI’de güvenli çalışan,
- tamamlanmadan başarı bildirmeyen,
- otomatik testlerin tamamı geçmeden yayınlanmayan

grafik kurulum sistemi oluşturmak.

## Uygulama planı

### 1. Kopyalama hatasını kökten düzelt

- Desteklenmeyen `unsquashfs -percentage` çağrısını kaldır.
- Kopyalamayı Debian Bookworm ile uyumlu komutla çalıştır.
- İlerlemeyi aracın metnine bağlı kırılgan bir seçenekten değil, şu iki bağımsız kaynaktan hesapla:
  - hedef diske yazılan bayt/sektör sayısı,
  - açılan dosya ve dizin sayısı.
- Başlamadan önce squashfs bütünlüğünü salt-okunur doğrula; bozuk USB/imaj ile diski silmeye başlama.
- Kopyalama hata sınıflarını ayır:
  - kaynak imaj bozuk/okunamıyor,
  - hedef disk yazma hatası,
  - disk bağlantısı kayboldu,
  - hedefte yer yok,
  - araç/komut uyumsuzluğu.
- Kullanıcıya yalnız doğrulanmış nedeni göster; her kopyalama hatasını “disk/kablo arızası” diye etiketleme.

### 2. Metin penceresi yerine gerçek grafik kurucu

Mevcut güvenli disk/GRUB/initramfs motoru korunacak; yalnız kullanıcı katmanı grafik hale getirilecek.

Grafik akış:

```text
1. Hoş geldiniz
2. Dil, klavye ve saat dilimi
3. Disk seçimi
4. Disk silme onayı
5. Kurulum özeti
6. Kurulum ve gerçek ilerleme
7. Doğrulama
8. Tamamlandı / yeniden başlat
```

- Canlı sistem X + Chromium/kiosk üzerinde yerel grafik kurucuyu açar.
- Tüm düğmeler fare, dokunma, Tab/Shift+Tab, ok tuşları, Enter ve Esc ile kullanılabilir.
- Disk seçimi model, kapasite ve bağlantı türünü gösterir; USB kaynak disk hiçbir zaman seçilemez.
- Kritik disk silme adımı çift onaylıdır; kullanıcı özel kelime yazmaz.
- Grafik kurucu açılamazsa otomatik olarak mevcut pencereli metin kurucusuna düşer; boş konsol oluşmaz.
- Gözetimsiz CI kurulumu ayrı metin arayüzü olmadan aynı kurulum motorunu kullanmaya devam eder.

### 3. Boş imleç algısını tamamen kaldır

Her uzun adımda ekran sürekli şu bilgileri gösterecek:

- “Kurulum devam ediyor — bilgisayarı kapatmayın” durumu,
- geçerli adım ve toplam adım,
- gerçek ilerleme yüzdesi,
- geçen süre,
- son tamamlanan işlem,
- animasyonlu faaliyet göstergesi,
- gerekirse “Bu adım diskin hızına göre birkaç dakika sürebilir” açıklaması.

Kurucu, grafik arayüz geçici olarak kapanırsa servis tarafından otomatik yeniden açılır. Komut satırı, çıplak TTY veya yalnız yanıp sönen imleç kullanıcıya gösterilmez.

### 4. Kurulum motorunu arayüzden ayır ve koru

- Disk hazırlama, dosya kopyalama, GRUB, initramfs, doğrulama ve kapanış işlemlerini tek bir kurulum motorunda tut.
- Grafik arayüz ve gözetimsiz CI aynı motoru çağırır; böylece iki farklı kurulum davranışı oluşmaz.
- Motor, yapılandırılmış durum olayları üretir: adım, yüzde, açıklama, hata kodu, düzeltme önerisi.
- Kullanıcı arayüzü ayrıcalıklı komut çalıştırmaz; yalnız kontrollü yerel kurulum kanalına bağlanır.
- Hedef disk kimliği her yıkıcı adım öncesinde yeniden doğrulanır.

### 5. Klavye, fare ve dokunma kabul testleri

Yayın öncesi otomatik etkileşim testi:

- Grafik kurucu gerçekten açılıyor mu?
- Fare ile her düğme, disk satırı, geri/ileri ve onay işlemi yapılabiliyor mu?
- Klavye ile Tab, Shift+Tab, oklar, Enter ve Esc tüm adımlarda çalışıyor mu?
- Türkçe Q, Türkçe F ve İngilizce düzen seçilip kurulan sisteme doğru yazılıyor mu?
- Touch sürümünde dokunma hedefleri yeterli büyüklükte ve kullanılabilir mi?
- Fare/klavye çıkarılıp yeniden takıldığında giriş geri geliyor mu?
- USB HID, PS/2 emülasyonu ve virtio giriş senaryoları çalışıyor mu?
- Grafik kurucu çökerse kullanıcı kurtarma ekranına dönüyor mu?

Workstation ve Touch ISO’larında giriş testi ayrı ayrı çalıştırılacak.

### 6. Kurulum senaryolarını genişlet

Her iki ISO profili için zorunlu matris:

- BIOS + UEFI,
- SATA/AHCI + NVMe + USB hedef disk,
- boş disk + eski MBR + eski GPT,
- 8 GB alt sınır + 20 GB + 2 TB sınıfı disk,
- sağlam squashfs + bozuk squashfs hata enjeksiyonu,
- hedef disk yazma hatası ve bağlantı kaybı,
- düşük bellek,
- klavye/fare yeniden bağlama,
- grafik kurucu görünürlüğü,
- kurulum sonrası USB’siz açılış,
- gerçek WebOS masaüstü hazır işareti,
- yeniden başlatma ve güvenli kapanış.

Her kritik senaryoda ekran görüntüsü, seri kayıt ve kurulum kaydı CI çıktısına eklenecek.

### 7. Başarı ve hata deneyimi

- Başarılı kurulum yalnız dosyalar, çekirdek, initramfs, GRUB/EFI, disk UUID’leri ve gerçek masaüstü açılışı doğrulandıktan sonra gösterilir.
- Tamamlanma ekranı: “Kurulum başarıyla tamamlandı → Yeniden başlat → Ekran karardığında USB’yi çıkar.”
- Hata ekranı teknik kullanım metni göstermez; kısa Türkçe neden, hata kodu ve güvenli seçenekler sunar:
  - Yeniden dene,
  - Başka disk seç,
  - Ayrıntıları göster,
  - Canlı masaüstüne dön,
  - Güvenli kapat.
- Ayrıntılı kayıt canlı ortamda ve hedef diskte korunur.

### 8. Yayın güvenlik kapısı

- Yapılandırma ve kabuk kontrolleri.
- Kopyalama komutunun kurulu `unsquashfs` sürümüyle uyumluluk testi.
- Grafik kurucu için gerçek fare/klavye otomasyonu ve ekran görüntüsü.
- BIOS/UEFI kalıcı kurulum ve USB’siz yeniden açılış.
- Workstation ve Touch matrisinin tamamı yeşil değilse ISO yayımlanmaz ve `latest` değiştirilmez.
- Eski hatalı ISO, yeni aday bütün zorunlu testleri geçmeden indirme kanalında değiştirilmez.

## Kabul ölçütleri

- Fotoğraftaki `unsquashfs` yardım ekranı hiçbir koşulda görünmez.
- Sağlam ISO ve diskte sistem kopyalama gerçekten başlar, ilerler ve tamamlanır.
- Hiçbir aşamada iki saniyeden uzun açıklamasız boş ekran/yanıp sönen imleç kalmaz.
- Kurulum fare, klavye ve Touch sürümünde dokunmayla baştan sona tamamlanabilir.
- Kullanıcı komut veya özel onay kelimesi yazmaz.
- Disk/kablo hatası yalnız gerçek disk I/O veya bağlantı kanıtı varsa gösterilir.
- BIOS ve UEFI kurulumu tamamlanır; USB çıkarıldıktan sonra gerçek WebOS masaüstü açılır.
- Otomatik kurulum, kurtarma akışı ve mevcut canlı masaüstü bozulmaz.
- Workstation ve Touch ISO’ları tüm zorunlu testler geçmeden yayımlanmaz.

## Fiziksel sınır

Yazılım; imaj uyumsuzluğu, kurucu hatası, disk seçimi, giriş aygıtları, açılış ve hata kurtarma akışlarını otomatik doğrulayabilir. Fiziksel diskin mekanik arızası, güç veya data kablosu arızası yazılımla sıfırlanamaz; bu durumda sistem yanlış teşhis vermeden, veri güvenliğini koruyarak durur ve kullanıcıya kesin çözüm adımlarını gösterir.
