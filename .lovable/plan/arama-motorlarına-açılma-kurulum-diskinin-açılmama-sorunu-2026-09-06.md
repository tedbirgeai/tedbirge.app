# Arama motorlarına açılma + kurulum diskinin açılmama sorunu

## Bu turda doğrulanan durum

- `public/robots.txt` şu an tüm arama motorlarını engelliyor (`Disallow: /`).
- Sayfa başlık bilgilerinde (`src/routes/__root.tsx`) `robots` ve `googlebot` için "indeksleme yok" etiketleri var. Bu projede `index.html` dosyası yok; başlık bilgileri rota dosyalarından üretiliyor.
- `vercel.json` her sayfaya sunucu düzeyinde "indeksleme yok" başlığı ekliyor. Bu başlık kalırsa etiketleri değiştirmek tek başına işe yaramaz.
- Geliştirici portalı (`portal/index.html`) ayrı bir sayfa; onda engelleme yok, sadece adres bilgisi var.
- Kurulum diski tarafında önemli bir bulgu: `alpine/boot/syslinux.cfg` ve `alpine/boot/grub.cfg` dosyaları imaja **kopyalanıyor ama hiçbir yerde kurulmuyor**. Açılış menüsünü Alpine'in kendi üretici betiği yazıyor, dolayısıyla bizim yazdığımız açılış satırları diske hiç ulaşmıyor. Şu an geçerli olan açılış satırı yalnızca profil dosyasındaki (`alpine/mkimg.tedbirge.sh`) `kernel_cmdline` değeri.

Not: İsteğinizdeki `boot=live root=live:LABEL=...` yazımı Fedora/Ubuntu tarzı açılış sistemlerine aittir; Alpine tabanlı imajımızda karşılığı yoktur ve eklenirse yok sayılır. Aynı sonucu veren Alpine karşılıkları kullanılacak.

Açılış hatasının kesin nedeni henüz kanıtlanmadı (imaj bu ortamda derlenemiyor). Bu yüzden plan hem düzeltmeleri hem de **derleme hattına otomatik açılış testi** eklemeyi içeriyor; böylece bir sonraki denemede sonuç tahminle değil ölçümle görülecek.

## Bölüm 1 — Arama motorlarına açılma

1. `public/robots.txt`: tüm botlara izin veren içerik.
2. `src/routes/__root.tsx`: engelleme etiketleri kaldırılıp `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` yazılacak.
3. `vercel.json`: sunucu düzeyindeki engelleme başlığı kaldırılacak (kalırsa diğer iki adım etkisiz olur).
4. Ana sayfa ve içerik sayfalarının başlık/açıklama bilgileri kontrol edilip eksikler tamamlanacak; her sayfa kendi adresini gösteren kanonik bağlantı alacak.
5. Yayınlanan adresteki sayfaları listeleyen bir site haritası eklenecek ve `robots.txt` içinden gösterilecek.

Bu değişiklikler canlı adreste ancak yeni bir yayınlama sonrası görünür.

## Bölüm 2 — Kurulum diskinin açılmaması

1. **Açılış menüsü gerçekten uygulanacak**: derleme betiği (`alpine/ci-build.sh`) Alpine'in ürettiği menü dosyalarını bizim `alpine/boot/` altındaki satırlarımızla eşitleyecek; ya da tersine, `alpine/boot/` dosyaları kaldırılıp tek doğruluk kaynağı profil dosyasındaki açılış satırı olacak. İkinci yol seçilecek — iki ayrı kaynak bu hatanın kökeni.
2. **Etiket tutarlılığı**: imaj etiketi `TEDBIRGE_WEBOS` tek yerde tanımlanacak ve açılış satırına `alpine_dev=LABEL=TEDBIRGE_WEBOS` olarak yazılacak; menü, etiket ve imaj adı birbirinden ayrı düşemeyecek.
3. **USB'nin geç tanınması**: açılış satırına bekleme parametreleri (`waitusb=10`, `rootwait`) eklenecek; yavaş USB bellekler yüzünden hemen pes edilmeyecek.
4. **Sürücü ve dosya sistemi desteği**: başlangıç imajı özelliklerine `usb`, `scsi`, `cdrom`, `squashfs`, `ext4`, `vfat`, `overlay` karşılıkları eksiksiz eklenecek (`usb_storage`, `uas`, `xhci/ehci/ohci`, `sd_mod`, `iso9660`).
5. **Doğrulama (en önemli adım)**: derleme hattına, üretilen imajı QEMU içinde açan ve masaüstü ekranına ulaşıp ulaşmadığını ekran görüntüsü/kayıt ile denetleyen bir test adımı eklenecek. Açılış kurtarma kabuğuna düşerse iş kırmızı olacak ve imaj yayınlanmayacak. Böylece "yayınlandı ama açılmıyor" durumu bir daha yaşanmayacak.
6. Yazma rehberi metni, doğrulanmış yöntemi (Rufus DD kalıbı) tek seçenek olarak sadeleştirecek şekilde güncellenecek.

## Depoya gönderim

Değişiklikleri doğrudan GitHub deposuna gönderme yetkim yok; buradaki değişiklikleri tamamladıktan sonra siz "Yayınla"/GitHub eşitlemesini başlattığınızda derleme hattı kendiliğinden çalışır ve yeni imajı üretir.

## Kapsam dışı

Fiziksel USB'ye yazma ve kendi bilgisayarınızda kurulum denemesi.
