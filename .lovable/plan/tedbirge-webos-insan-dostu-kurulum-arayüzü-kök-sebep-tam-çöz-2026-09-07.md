# Tedbirge® WebOS — İnsan Dostu Kurulum Arayüzü (Kök Sebep + Tam Çözüm)

## 1. Ne oldu? (fotoğraflardan kesinleşen kök sebep)

Son ekranda onay sorusuna **"evet"** (küçük harf) yazılmış. Kurucu yalnızca büyük
harfli **EVET** kabul ediyor; başka her cevapta "Kurulum iptal edildi" deyip
programdan çıkıyor. Çıkıştan sonra o ekranda başka hiçbir şey çalışmadığı için
ekran boşalıyor ve **sol üstte imleç yanıp sönüyor**. Yani disk silinmedi,
bozulmadı — kurulum hiç başlamadı. Bu tasarım hatasıdır, kullanıcı hatası değil.

Aynı akıştaki diğer kök sebepler:

- **Sessiz çıkış:** iptal veya hata durumunda ekran boş kalıyor; ne mesaj, ne menü,
  ne "tekrar dene" seçeneği var.
- **Bozuk karakter:** `Tedbirge®` metni açılış menüsünde ve konsolda `TedbirgeR`,
  `Tedbirge_«`, `■` gibi görünüyor. Sebep: açılış menüsü (isolinux) ve konsol yazı
  tipi ® işaretini gösteremiyor.
- **Bilgilendirme yok:** adımlar numarasız, ilerleme çubuğu yok, "şu an ne oluyor,
  ne kadar sürecek" bilgisi yok; yazılar hızla akıp gidiyor.
- **Klavye/dil ayarı sorulmuyor**, kurulum öncesi özet ekranı yok.

## 2. Yapılacak: Debian/Ubuntu tarzı gerçek kurulum sihirbazı

Kurucu, metin akıtan bir betik olmaktan çıkıp **pencereli (mavi ekran) sihirbaza**
dönüşecek — Debian kurulumundaki gibi. Adımlar:

```text
1/7  Hoş geldiniz            → ne yapılacağı, süre tahmini, İleri/İptal
2/7  Klavye ve saat dilimi   → Türkçe Q / İngilizce, İstanbul
3/7  Disk seçimi             → liste kutusu (ok tuşlarıyla seçim, yazmak yok)
4/7  Silme onayı             → Evet/Hayır düğmeleri (yazı yazmak yok)
5/7  Kurulum özeti           → disk, bölümler, takas, açılış kipi; son onay
6/7  Kurulum                 → yüzdeli ilerleme çubuğu + "şu an: ..." satırı
7/7  Bitti                   → Yeniden başlat / Canlı moda dön
```

Kritik davranış kuralları:

- **Hiçbir yerde büyük harfli kelime yazma zorunluluğu kalmaz.** Onay artık
  Evet/Hayır düğmesiyle verilir; "evet/EVET/e" ayrımı tümden ortadan kalkar.
- **İptal veya hata = boş ekran değil.** Her iptal kullanıcıyı ana menüye
  döndürür; her hata, sebebi + çözüm önerisi + kayıt dosyası yolunu gösteren bir
  pencerede **kullanıcı tuşa basana kadar bekler**.
- **Ekran asla boş kalmaz:** kurulum programı kapanırsa otomatik olarak ana menü
  yeniden açılır (servis `Restart=always`), böylece yanıp sönen imleç durumu
  fiziksel olarak imkânsız hâle gelir.
- **İlerleme gerçek:** sistem kopyalama adımı `unsquashfs` yüzde çıktısından
  beslenen gerçek yüzdeyle gösterilir; açılış dosyaları ve menü üretimi de ayrı
  adımlar olarak yüzdeye yansır. Her adımın altında sade Türkçe açıklama olur
  ("Sistem dosyaları diske kopyalanıyor — yaklaşık 4 dakika").
- **Ayrıntı isteyene:** F2 ile canlı kurulum kaydı (log) penceresi açılır; kayıt
  ayrıca `/var/log/tedbirge/kurulum.log` dosyasına yazılmaya devam eder.

## 3. Marka yazımı ve bozuk karakter düzeltmesi

- Açılış menüsü ve metin konsolu gibi ® gösteremeyen yerlerde marka **`Tedbirge(R) WebOS`**
  olarak yazılır (bozuk `«`/`■` karakterleri biter).
- Grafik arayüzde (WebOS masaüstü, site) **Tedbirge® WebOS** aynen kalır.
- Kurulum konsolu UTF-8 ve okunaklı bir konsol yazı tipiyle başlatılır; Türkçe
  karakterler (ç, ğ, ı, ö, ş, ü) doğru görünür ve kurulum metinleri artık
  "acilis/basarisiz" değil düzgün Türkçe yazılır.

## 4. Otomatik kurulum ve testler bozulmaz

- Gözetimsiz kurulum (`tedbirge.autoinstall=1`) pencere açmadan, eskisi gibi
  metin kipinde çalışmaya devam eder; CI testleri ve `TEDBIRGE_INSTALL_OK` /
  `TEDBIRGE_INSTALL_FAIL` sinyalleri aynen korunur.
- Disk bölümleme, takas/derin uyku, GRUB ve doğrulama mantığı **değişmez**;
  yalnız üstüne arayüz katmanı geçer.

## 5. Teknik notlar

- `image/profiles/common.list`: `whiptail` (newt), `console-setup`, `kbd`,
  `keyboard-configuration` paketleri eklenir.
- `image/install/tedbirge-kur`: iki kipe ayrılır — `--metin` (mevcut akış, CI ve
  otomatik kurulum) ve varsayılan pencereli sihirbaz. Sorular `whiptail --menu`,
  `--yesno`, `--gauge` ile sorulur; `hata()` fonksiyonu `--msgbox` ile bekler ve
  ana menüye döner. Çıkış kodları korunur.
- `image/config/includes.chroot/etc/systemd/system/tedbirge-installer.service`:
  `Restart=always`, `TTYReset`, `Environment=NCURSES_NO_UTF8_ACS=1`, konsol
  yazı tipi yüklemesi (`setupcon`/`setfont`) ExecStartPre olarak eklenir.
- `image/config/bootloaders/syslinux_common/live.cfg.in` ve
  `bootloaders/grub-pc/grub.cfg`: menü etiketleri `Tedbirge(R) WebOS` olur;
  ayrıca "Canlı Başlat / Diske Kur / Güvenli grafik" açıklamaları netleştirilir.
- `scripts/check-image-config.sh`: ® karakterinin açılış menülerinde
  bulunmadığını ve sihirbaz paketlerinin listede olduğunu doğrulayan yeni
  denetimler eklenir.
- CI kurulum testi (`scripts/test-install-qemu.sh`) metin kipini kullandığından
  değişiklik gerektirmez; yalnızca `--metin` bayrağı eklenir.

## 6. Sizin için sonuç

Yeni imajı USB'ye yazıp açtığınızda karşınıza numaralı, ok tuşlarıyla
ilerleyen, Evet/Hayır soran, yüzdeli ilerleme gösteren ve hata olursa ekranda
bekleyip sebebini açıklayan bir kurulum programı çıkar. Yanıp sönen boş ekran
ve "EVET yazın" tuzağı ortadan kalkar.
