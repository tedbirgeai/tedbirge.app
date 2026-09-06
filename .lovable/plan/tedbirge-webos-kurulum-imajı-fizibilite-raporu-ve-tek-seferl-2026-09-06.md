# Tedbirge® WebOS — Kurulum İmajı Fizibilite Raporu ve Tek Seferlik Plan

Bu belge yalnız rapor ve plandır. Hiçbir kod değiştirilmedi.

## 1. Hatanın gerçek nedeni (kanıtlanmış)

Ekrandaki panik satırı: `Attempted to kill init! exitcode=0x00000100`, `Comm: switch_root`, 11,4 saniyede, Gigabyte H81M-S1.

Bu tam olarak şu anlama gelir: açılış ortamı diski buldu, kök alanı hazırladı, sonra
`/sbin/init` çalıştırılamadı ve devir işlemi 1 koduyla çıktı. Yani sorun disk, USB,
sürücü listesi veya BIOS/UEFI değil — kök sistemin **hiç oluşmamış olması**.

Neden oluşmuyor: seçtiğimiz Alpine "mkimage" yöntemi, kök sistemi imaj üretilirken
kurmaz; **her açılışta, o bilgisayarın belleğinde, sıfırdan paket kurar**. Bizim
paket listemiz 80'den fazla paket içeriyor (Chromium, Xorg, Mesa, PipeWire,
NetworkManager, Bluetooth, GRUB…). Bu kurulum RAM'e sığmadığında ya da herhangi bir
adımda yarıda kaldığında `/sbin/init` hiç oluşmaz ve çekirdek panikler.

Doğrulananlar (bu tur yapıldı):
- Listedeki paketlerin **tamamı** Alpine 3.20 deposunda mevcut → paket adı hatası yok.
- Açılış satırı, etiket, sürücü listesi, initramfs özellikleri tutarlı → bu alanlarda eksik yok.
- Yani şu ana kadarki tüm düzeltmeler doğru ama **yanlış katmanda** yapıldı; mimarinin
  kendisi bu ürün için uygun değil.

Kısacası: tek tek yama yaparak bu mimaride kalıcı çözüm elde edilemez. Her yeni
bilgisayar farklı RAM/donanımla aynı sınıra çarpar.

## 2. Diğer işletim sistemleri bunu nasıl yapıyor (özet)

| Sistem | Yöntem | Sonuç |
|---|---|---|
| Ubuntu (casper) | Kök sistem **imaj üretilirken** hazırlanır, tek sıkıştırılmış dosya (squashfs) olarak ISO'ya konur; açılışta yalnız bağlanır | Açılışta kurulum yok → panik sınıfı ortadan kalkar |
| Debian live-build | Aynı model, `filesystem.squashfs` | En geniş donanım/firmware kapsaması |
| Fedora (dracut + Anaconda) | Aynı model + olgun kurulum sihirbazı | Ağır ama tam donanımlı |
| Arch (archiso) | `airootfs.sfs` önceden hazır | Kabuk betiği tabanlı, bize en yakın zihniyet |
| ChromeOS / SteamOS | A/B iki tam sistem bölümü, salt-okunur, otomatik geri alma | Kiosk için en sağlam, ama güncelleme altyapısı gerektirir |
| **Alpine mkimage (bizim mevcut yolumuz)** | **Kök sistemi her açılışta belleğe kurar** | **Tek istisna; bizim yaşadığımız hatanın kaynağı** |

Ortak kural: ciddi ürünlerin hiçbiri açılışta paket kurmaz. Paketleme bir kez,
derleme sırasında yapılır ve test edilir.

## 3. Önerilen çözüm (tek yol, tek seferde)

**Debian live-build tabanlı, önceden pişmiş squashfs kök + kalıcı disk kurulumu.**

Neden Debian:
- Gigabyte/Intel gibi eski masaüstü donanımlarında firmware ve sürücü kapsaması en geniş olan seçenek.
- Kök sistem CI'da bir kez kurulur, test edilir, imzalanır; kullanıcı bilgisayarında hiçbir kurulum çalışmaz.
- BIOS ve UEFI açılışı, kalıcı kurulum ve GRUB tarafı olgun ve hazır.
- Mevcut arayüz, nginx yapılandırması, kiosk betiği, güç köprüsü ve `/opt/tedbirge`
  içeriğinin tamamı aynen taşınır — WebOS tarafında hiçbir şey yeniden yazılmaz.

Alpine'da kalıp squashfs'e geçmek de teknik olarak mümkün, ancak sürücü/firmware
kapsaması ve kalıcı kurulum araçları Debian kadar hazır değil; aynı emekle daha az
garanti alırız.

## 4. Yapılacaklar (sıra ile, tek pakette)

1. **İmaj derleyicisi değişimi**
   - `alpine/` altındaki mkimage profili, apkovl ve CI doğrulamaları emekliye ayrılır (silinmez, arşivlenir).
   - Yeni `image/` klasörü: Debian live-build yapılandırması (paket listeleri, açılış menüsü, hooks).
   - Kök sistem CI'da kurulur → squashfs'e sıkıştırılır → BIOS+UEFI hibrit ISO üretilir.

2. **WebOS yerleşimi (mevcut içerik taşınır)**
   - Arayüz paketi `/var/www/localhost/htdocs` yerine Debian yoluna, nginx yapılandırması aynı (COOP/COEP dahil).
   - Kiosk zinciri: otomatik oturum → X → Chromium kiosk; GPU yoksa yazılım çizimine düşüş korunur.
   - Güç köprüsü, ZRAM, ekran düzeni, günlük dosyaları ve otomatik disk bağlama betikleri aynen taşınır.

3. **Kalıcı kurulum**
   - Canlı sistemde `tedbirge-kur`: hedef disk seçimi, açık onay, GPT/EFI veya BIOS bölümleme,
     squashfs'in diske açılması, GRUB kurulumu, kurulum sonrası doğrulama.
   - Mevcut `scripts/setup-tedbirge-disk.sh` mantığı korunur, Debian araçlarına uyarlanır.

4. **Otomatik açılış testi (CI kapısı)**
   - QEMU ile: BIOS, UEFI (OVMF pflash), USB, SATA, 2 GB düşük bellek senaryoları.
   - Başarı ölçütü seri porta yazılan `TEDBIRGE_BOOT_READY` satırıdır; başka hiçbir sinyal kabul edilmez.
   - Ayrıca canlı sistemden **diske kurulum + kurulan sistemden yeniden açılış** testi otomatik koşar.
     Bugün eksik olan asıl test budur.
   - Testlerin hepsi geçmeden ISO yayınlanmaz.

5. **Yayın**
   - GitHub Releases'a ISO + SHA-256 özeti; indirme bağlantısı sitedeki kurulum kartına bağlanır.
   - Kısa Türkçe kurulum kılavuzu (USB yazma, açılış sırası, kurulum adımları).

## 5. Riskler ve dürüst beklenti

- İlk çalışan ISO'ya kadar CI'da birkaç derleme turu gerekir; bu normaldir, ancak
  artık hata sınıfı "her bilgisayarda başka türlü patlıyor" değil, "derleme çıktısı eksik" olur.
- ISO boyutu Alpine'a göre büyür (yaklaşık 1,5–2,5 GB). Kiosk ürünü için kabul edilebilir.
- Donanım testini yalnız QEMU yapar; sizin Gigabyte makinenizde ilk gerçek doğrulamayı
  siz yaparsınız. O test geçtiğinde ürün teslim edilebilir sayılır.
- Bu plan tek parça uygulanır: yarım geçiş yapılmaz, eski Alpine hattı yeni hat
  testleri geçene kadar arşivde bekler.

## 6. Karar noktası

Onayınız gerekiyor: Debian live-build'e geçiş mi, yoksa Alpine'da kalıp yalnız
"önceden pişmiş squashfs" modeline mi geçelim? Öneri Debian'dır; gerekçe donanım
kapsaması ve kurulum araçlarının olgunluğudur.
