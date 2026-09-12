# Kurulum Sonrası Sağlıklı Açılış ve Otomatik Kurtarma

## Amaç
Kurulumun yalnız disk ve açılış dosyaları hazır olduğunda değil, Tedbirge® WebOS masaüstü gerçekten çizilip kullanılabilir olduğunda başarılı sayılmasını sağlamak. Eski ekran kartı, hatalı çözünürlük veya Chromium hızlandırma sorunu beyaz/yarım ekran bırakmayacak.

## Uygulama
1. **Ekran ve görüntü zinciri**
   - Ekran algılamasını tek ana fiziksel çıkışa güvenli biçimde kur; hayalet/bağlantısız çıkışların sanal masaüstünü büyütmesini engelle.
   - İlk açılışta destekli çözünürlüğü seç, ekran alanını o çözünürlükle sınırla ve siyah arka planla beyaz yarım ekranı önle.
   - Chromium’u eski Intel/AMD/Nvidia donanımında güvenli çalışan bayraklarla başlat; başarısız hızlandırmada temiz profil ve yazılım çizimine otomatik dön.

2. **Gerçek masaüstü sağlık kapısı**
   - Sürecin açık olmasını “hazır” kabul etme; yerel sayfanın yüklenmesini ve masaüstü belgesinin yanıt vermesini doğrula.
   - Belirli sürede doğrulama olmazsa kiosk hizmetini güvenli görüntü kipinde yeniden başlat.
   - Birkaç deneme sonunda kullanıcıyı boş/beyaz ekranda bırakmak yerine okunabilir kurtarma ekranı ve tanı kaydı sun.

3. **Kurulum başarı ölçütü**
   - Kurulan diskte grafik hedefi, kiosk, web sunucusu, ekran betiği, yazılım çizim yolu ve gerekli dosyaları yüzde 100’den önce doğrula.
   - İlk açılış sağlık sonucu ve kullanılan görüntü kipini kalıcı kayda yaz.
   - Kurulum metninde normal ilk açılış süresini ve olağan dışı bekleme sınırını açık göster.

4. **Otomatik testler**
   - Ekran algılama, güvenli kip ve yanlış “masaüstü hazır” sinyaline karşı sözleşme testleri ekle.
   - BIOS ve UEFI kalıcı kurulum testini yalnız seri işarete değil, gerçek sayfa sağlık kontrolüne bağla.
   - Yapılandırma, kurucu, testler, TypeScript ve üretim derlemesi kapılarını çalıştır. Yeni ISO yalnız tüm kapılar geçerse yayınlanabilir.

## Teslim sınırı
Bu ortamda kaynak ve sanal bilgisayar testlerini tamamlayacağım. Fiziksel bilgisayarınızın ekran kartını uzaktan çalıştıramadığım için gerçek donanımda yüzde 100 garanti veremem; yeni ISO’yu yayınlanabilir saymak için sanal BIOS/UEFI kurulum ve ikinci açılış testlerinin yeşil olması zorunlu olacak. Mevcut diskteki eski kurulum kendiliğinden güncellenmez; doğrulanmış yeni ISO ile bir kez yeniden kurulması gerekir.
