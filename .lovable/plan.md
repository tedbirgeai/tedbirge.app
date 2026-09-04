# Yayına Geçiş, Ödeme Akışı ve Üretim Hata İzi

Beş maddeyi ikiye ayırmak gerekiyor: **sizin elinizde olanlar** (depo bağlama, imaj derletme, USB'ye yazma) ve **kodda benim yapacaklarım** (ödeme akışı, lisans durumu, hata izi, indirme doğrulaması).

## Sizin yapmanız gerekenler (ben yapamam)

1. **Depo bağlama ve yayın**: Sohbet alanındaki + menüsünden GitHub bağlanır, ardından Yayınla düğmesi kullanılır. Kod deponuza gittiğinde Vercel derlemesi kendiliğinden tetiklenir. tedbirge.app / tedbirge.dev alan adlarının canlıya geçişi bu adımdan sonra doğrulanır.
2. **ISO derlemesi**: Derleme hattı depoda hazır; ilk çalıştırma ancak kod GitHub'a gittikten sonra başlar (Actions izni "yazma" olmalı). İmaj Releases altında `tedbirge-webos-x86_64.iso` adıyla yayınlanır.
3. **USB'ye yazma ve açılış**: Rufus ile yazma ve bilgisayarı USB'den başlatma tamamen sizin bilgisayarınızda yapılır. Açılış menüsündeki "Canlı Kiosk" seçeneği zaten hazır.

Bunlar tamamlandığında indirme akışını ben doğrularım: durum ucu imajı bulup bulmadığını, boyut ve doğrulama özetini bildirir.

## Kodda yapılacaklar

### 1. Ödeme kataloğundaki çakışma (doğrulandı, öncelikli)

Ödeme sağlayıcısında aynı ada sahip **ikişer aktif fiyat** var: Pro aylık hem 12 € hem 29 €, Pro yıllık 120 € ve 290 €, Enterprise aylık 8 € ve 49 €, yıllık 80 € ve 500 €. Uygulama ilk dönen kaydı kullandığı için müşteri yanlış tutarı görebilir. Eski (yüksek) fiyatlar arşivlenecek, güncel dört fiyat tek aktif kayıt olarak bırakılacak; fiyat çözücü birden çok aktif kayıt bulursa sessizce ilkini seçmek yerine hata verecek.

### 2. Mağaza sekmesine satın alma akışı

Bugün ödeme yalnızca Profil ekranında var; Mağaza uygulamasında hiç satın alma yok. Mağaza'ya "Abonelik" bölümü eklenecek:
- Community / Pro / Enterprise kartları, düğüm adedi seçimi, aylık–yıllık geçişi
- Ödeme penceresi Profil ekranıyla aynı akışı kullanır (tek kod yolu)
- Oturum yoksa önce giriş yönlendirmesi

### 3. Lisans durumunun güncel kalması

- Ödeme sonrası dönüşte lisans/abonelik verisi yeniden okunur, kullanıcı sayfayı yenilemeden yeni paketi görür
- Mağaza, Profil ve düğüm sınırı aynı tek kaynaktan beslenir; ödeme tamamlanınca düğüm tavanı anında yükselir
- Sağlayıcıdan gelen bildirimler (yenileme, iptal, ödeme başarısız) zaten işleniyor; iptal/başarısız durumunda arayüzde açık Türkçe uyarı gösterilecek

### 4. Üretim hata izi

Canlıda oluşan hatalar için iki kanal:
- **Kayıt dosyası**: kurulum sırasında `/var/log/tedbirge/` klasörü ve günlük döngüsü otomatik oluşturulur; kabuk ve tarayıcı hataları buraya yazılır, "Sistem Bilgisi" ekranından son kayıtlar görülebilir.
- **Hata bildirimi**: ciddi hatalar yönetim ekranında toplanır. E-posta ile bildirim isteniyorsa, gönderim için doğrulanmış bir e-posta alan adı gerekir; bu maddeyi onaylarsanız e-posta kurulumunu ayrı bir adımda yaparım.

## Teknik notlar

- Fiyat arşivleme sağlayıcı API'si üzerinden yapılır; test ortamında yapılan düzeltme yayına geçişte canlıya taşınır.
- Kurulum betiği (`scripts/setup-tedbirge-disk.sh`) ve imaj yükü, kayıt klasörü + döngü yapılandırmasını içerecek şekilde genişletilir.
- Teslimden önce tip kontrolü ve mevcut test paketi çalıştırılır.

## Karar gereken tek nokta

Hata bildirimi için e-posta kanalı da kurulsun mu, yoksa şimdilik kayıt dosyası ve yönetim ekranı yeterli mi?
