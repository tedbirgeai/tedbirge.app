# Tedbirge® WebOS — Anahtar Teslim Kurulum Otomasyonu

## Hedef

USB’den “Diske Kur” seçildiği andan ilk masaüstü açılışına kadar hiçbir aşamada boş ekran, yalnız yanıp sönen imleç, görünmeyen soru veya teknik hata duvarı bırakmayan; BIOS ve UEFI bilgisayarlarda güvenli, izlenebilir ve tekrar denenebilir bir kurulum akışı oluşturmak.

## Doğrulanan mevcut durum

- Pencereli kurucu ve gerçek ilerleme göstergesi mevcut; klavye/disk menülerinin ekrana çizilmesi düzeltilmiş durumda.
- Fotoğraftaki yeni durma noktası disk bölümleme aşaması. Mevcut betik `parted` hatasının ayrıntısını yalnız kayıt dosyasına gönderip kullanıcıya sadece “Bölümleme başarısız” diyor; kesin alt neden fotoğraftan görülemiyor.
- BIOS kurulumu halen `msdos` bölüm tablosu kullanıyor. UEFI kurulumu GPT kullanırken iki yol farklılaşıyor; büyük disklerde daha sağlam ortak düzen kurulmamış.
- Kurucu çıkınca servis `kurulum-sonrasi.sh` çalıştırıp kök komut satırına geçiyor. Buradaki elle masaüstü açma yolu kullanıcı fotoğrafında Xsession hatasına düşmüş; bu, profesyonel geri dönüş akışı değil.
- Mevcut QEMU hattı gözetimsiz BIOS/UEFI kurulumunu ve yeniden açılışı deniyor; pencereli sihirbaz, bölümleme hata ekranı, tekrar deneme ve canlı masaüstü görünürlüğünü test etmiyor.

## Uygulama planı

### 1. Disk hazırlamayı dayanıklı ve açıklanabilir yap

- Onaydan sonra hedef diski yeniden doğrula; salt-okunur durum, bağlı bölümler, etkin takas, aygıt boyutu ve çekirdek görünürlüğü için ön kontrol ekle.
- Her bağlı alt bölümü kontrollü kapat; başarısız olan ayırmayı yok sayma. Hangi bölümün kullanımda kaldığını kullanıcıya açıkça göster.
- Eski GPT/MBR ve dosya sistemi imzalarını güvenli sırayla temizle; çekirdeğe bölüm tablosunu yeniden okut ve her adımdan sonra sonucu doğrula.
- BIOS ve UEFI kurulumlarını GPT üzerinde birleştir:
  - UEFI: EFI + sistem + isteğe bağlı takas.
  - BIOS: küçük `bios_grub` + sistem + isteğe bağlı takas.
- Bölümleme komutlarını tek uzun çağrı yerine ayrı, denetlenebilir adımlara ayır. Hata halinde gerçek neden, disk adı ve önerilen çözüm pencerede gösterilsin; teknik çıktı kayıtta kalsın.
- Disk yazma koruması, bağlantı kopması, bozuk sektör/I/O hatası ve yeniden numaralanma için güvenli duruş sağla; yanlış diske devam edilmesin.

### 2. Boş imleci tamamen kaldır

- Kurucuyu “çalıştır ve kapan” modeli yerine kalıcı bir kurulum oturumu altında çalıştır.
- Her uzun işlemde kullanıcıya sabit pencere içinde şu bilgileri göster:
  - mevcut adım,
  - gerçek yüzde veya hareket göstergesi,
  - “Kurulum devam ediyor, bilgisayarı kapatmayın” metni,
  - geçen süre,
  - son doğrulanan işlem.
- Bölüm tablosunun yeniden okunması, disk senkronizasyonu, sistem kopyası, açılış dosyası üretimi ve yeniden başlatma beklemelerinde ekran hiçbir zaman çıplak konsola düşmesin.
- İptal ve düzeltilebilir hatalarda “Tekrar dene / Başka disk seç / Bilgisayarı kapat” menüsü göster; kullanıcıdan komut yazması istenmesin.
- Beklenmeyen kapanmada servis aynı menüyü yeniden açsın; yalnız başarılı kurulum sonrası yeniden başlatma/kapatma bu döngüyü sonlandırsın.

### 3. Canlı masaüstü ve ilk açılışı sağlamlaştır

- Xsession’a veya `/root/.xsession` dosyasına bağlı elle yazılan komutu kaldır.
- “Canlı sisteme dön” seçeneğini doğrudan doğrulanmış kiosk hizmeti üzerinden başlat; başarısızsa sade hata ekranı ve tekrar deneme seçeneği sun.
- Kiosk başlamadan önce web arayüzü, görüntü sunucusu, tarayıcı ve gerekli dosyaları kontrol et; başarısız bileşenin adını kullanıcıya göster.
- Kurulan diskte ilk açılışta masaüstünün gerçekten açıldığını belirten ayrı bir hazır sinyali üret; yalnız web sunucusunun çalışması başarı sayılmasın.
- Başarılı kurulum ekranında güvenli sıra: yeniden başlatmayı seç → “Kapatılıyor” ilerleme ekranı → ekran kapandığında USB’yi çıkarma yönlendirmesi.

### 4. Kayıt ve kurtarma deneyimini tamamla

- Kurulum kaydını hem canlı ortamda hem hedef diskte koru.
- Hata penceresine kısa hata kodu ekle; aynı kod kayıttaki ayrıntılı komut çıktısıyla eşleşsin.
- F2 “Ayrıntılar” görünümü ekle; normal kullanıcı teknik satırları görmek zorunda kalmasın.
- Hata sırasında log hedef diske yazılamıyorsa USB/canlı ortam kopyası korunmaya devam etsin.
- “Bölümleme başarısız” gibi genel mesajların yerine duruma özgü Türkçe açıklamalar kullan.

### 5. Gerçek kullanıcı akışını otomatik test et

- Betik sözdizimi ve imaj yapılandırma kontrollerini genişlet.
- Geçici sanal disklerde bölümleme test matrisi çalıştır: BIOS/UEFI, boş disk, eski GPT, eski MBR, bağlı bölüm, takas izi, 8 GB sınırı, 20 GB ve 2 TB sınıfı disk.
- Pseudo-TTY üzerinden pencereli kurucuyu tuşlarla ilerlet; karşılama, klavye, disk, onay, özet, ilerleme, hata ve başarı ekranlarının gerçekten çizildiğini doğrula.
- Hata enjeksiyonu ile bölümleme ve masaüstü başlatma arızalarında boş konsol yerine kurtarma menüsünün çıktığını doğrula.
- QEMU’da hem Workstation hem Touch sürümü için:
  - BIOS canlı açılış,
  - UEFI canlı açılış,
  - pencereli kurulum görünürlüğü,
  - gözetimsiz kalıcı kurulum,
  - yalnız diskten yeniden açılış,
  - web arayüzü + kiosk/masaüstü hazır sinyali,
  - kapanış ve yeniden başlatma
  senaryolarını yayın ön koşulu yap.
- Test günlüklerini ve ekran görüntülerini CI çıktısına ekle; herhangi bir kritik senaryo geçmezse ISO yayınlanmasın.

### 6. Teslim ve doğrulama

- Önce Workstation ve Touch ISO’larını aynı güvenlik kurallarıyla üret.
- SHA-256, sürüm/edition kimliği, EFI/BIOS açılış dosyaları ve kurucu bağımlılıklarını doğrula.
- Otomatik testlerin tamamı yeşil olmadan `latest` indirme dosyasını değiştirme.
- Son aşamada kullanıcının gerçek SATA diskiyle şu kabul adımlarını uygula: disk seçimi → bölümleme → kopyalama → açılış kurulumu → yeniden başlatma → USB olmadan masaüstü.

## Kabul ölçütleri

- Hiçbir geçişte 2 saniyeden uzun açıklamasız boş ekran/yanıp sönen imleç görünmez.
- Kullanıcı kurulum boyunca komut veya özel onay kelimesi yazmaz; yalnız menü ve düğmeler kullanır.
- Bölümleme başarısızlığının gerçek nedeni ekranda ve kayıtta bulunur; kullanıcı güvenle tekrar deneyebilir.
- Kurucu iptal/hata sonrası komut satırına veya Xsession hatasına düşmez.
- BIOS ve UEFI kalıcı kurulumları sanal testlerde tamamlanır ve USB çıkarılmış halde masaüstü açılır.
- Her iki ISO yalnız tüm zorunlu testler geçtikten sonra yayınlanır.

## Sınır

Otomasyon, yazılımsal ve sanal donanım senaryolarını eksiksiz doğrulayabilir; fiziksel diskin kablo, güç veya mekanik arızasına yüzde yüz garanti veremez. Böyle bir durumda hedef, veriyi riske atmadan durmak ve kullanıcıya kesin, uygulanabilir hata açıklaması göstermektir.
