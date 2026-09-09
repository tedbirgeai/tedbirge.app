# Tedbirge® WebOS — Egemen İşletim Sistemi Şartnamesi ve Donanım Otomasyonu

Bu belge yalnızca onay içindir. Hiçbir dosya değiştirilmedi, kod yazılmadı.

---

## 1. Önceki stratejinin geçersiz sayılması

Reddedilen ve bundan sonra kullanılmayacak konumlandırmalar:

- "mesajlaşma overlay'i"
- "afet haberleşme uygulaması"
- "RaaS / dayanıklılık hizmeti yazılımı"
- "Freemium veya abonelikli bulut hizmeti"

Yeni tanım: Tedbirge® WebOS, kendi kendine yeten, tek bir imajdan kurulan bağımsız bir işletim sistemidir. İletişim, sistemin bir uygulaması değil, çekirdek hizmetlerinden biridir.

---

## 2. Nikson Öz-Yeterlilik Doktrini — vizyon, misyon, değerler, hedefler

### Vizyon (2030)
Dünyanın herhangi bir noktasında, dış bulut, küresel telekom veya üçüncü taraf bir tarayıcı olmadan tam çalışan; kullanıcının verisinin cihazından hiç çıkmadığı egemen bir bilişim ortamı.

### Misyon
Bir bilgisayara tek imaj kurulduğunda; masaüstü, ofis araçları, iletişim ve cihazlar arası eşitleme dahil her şeyin internetsiz çalıştığı, dışarıya hiçbir zorunlu bağımlılığı olmayan bir sistem sunmak.

### Temel değerler
1. **Öz-yeterlilik** — Çalışması için hiçbir dış hizmete ihtiyaç duymaz.
2. **Mutlak veri egemenliği** — Veri üretildiği cihazın mülkiyetindedir; varsayılan dışa akış sıfırdır.
3. **Kırılganlık karşıtlığı** — Merkezî altyapı çökse dahi sistem kesintisiz çalışır.
4. **Görünür dürüstlük** — Ölçülmemiş hiçbir performans veya süreklilik iddiası yapılmaz.
5. **Anahtar teslim sadelik** — Son kullanıcı komut satırı görmez, terim öğrenmek zorunda kalmaz.

### Stratejik hedefler
| Dönem | Hedef |
| --- | --- |
| 0–3 ay | Fotoğraflardaki donanım hatalarının kapatılması; sıfır soru soran kurulum; iki profilin (Workstation / Touch) fiziksel makinede doğrulanması |
| 3–9 ay | Gömülü ofis takımının (Writer, Sheets, Slides, PDF Studio, Notes, Organizer) çevrimdışı sürümü |
| 9–18 ay | Sistem düzeyinde P2P eşitleme hizmeti; iki cihaz arasında internetsiz dosya/veri eşitleme |
| 18–36 ay | Kurum içi filo yönetimi, imzalı güncelleme kanalı, bağımsız donanım uyum listesi |

---

## 3. Çekirdek mimari — dört sütun

```text
+---------------------------------------------------------------+
|  IV. Gömülü Ofis Süreçleri (Writer/Sheets/Slides/PDF/Notes)    |
|      ISO içine gömülü, internetsiz, yönetilen sistem süreçleri |
+---------------------------------------------------------------+
|  II. WebGPU Pencere Bileşicisi                                 |
|      pencere, sürükleme, Z-sırası, klavye/fare/dokunma         |
+---------------------------------------------------------------+
|  III. Sistem P2P Eşitleme Hizmeti (arka plan daemon)           |
+---------------------------------------------------------------+
|  I. Rust-Wasm Çekirdek + Şifreli Sanal Dosya Sistemi (VFS)     |
|     görev sıralayıcı · bellek izolasyonu · süreçler arası ileti|
+---------------------------------------------------------------+
|  Donanım katmanı (HAL): ekran · girdi · depolama · ağ · güç    |
+---------------------------------------------------------------+
```

Kural: mevcut çalışan çekirdek, VFS, pencere yöneticisi ve kabuk bozulmaz; her sütun mevcut kodun üzerine eklenerek olgunlaştırılır.

---

## 4. Saha hatalarının ISO seviyesinde çözümü

Fotoğraflarda dört ayrı arıza var; dördü de imaj yapılandırmasında çözülür.

| Belirti | Kök neden | Çözüm |
| --- | --- | --- |
| `Fatal - failed to load firmware`, `rtl8xxxu probe failed -11` | Realtek USB Wi-Fi yazılımı imajda yok | `firmware-realtek`, `firmware-misc-nonfree` ve ilgili non-free-firmware alanı zorunlu; hook ile dosya varlığı derleme sırasında doğrulanır |
| `Cannot enable`, `device descriptor read/64, error -110` | USB portu güç/kesme yönetiminde takılıyor | Önyükleme parametrelerine `usbcore.autosuspend=-1`; kurtarma girdisinde ek `pci=nomsi` |
| Ekranın `ыыыы` karakterleriyle dolması | Ekran kartı modu ayarı erken çöküyor | Önyükleyiciye ikinci menü girdisi: `nomodeset video=vesafb:mode` güvenli görüntü yolu |
| Beyaz ekran / çeyrek pencere donması | Tarayıcı tabanlı kabuk GPU sürücüsünde çöküyor | Kiosk başlatıcısına `--kiosk --start-fullscreen --disable-gpu-sandbox --use-gl=egl`; ilk denemede çökme olursa yazılımsal çizime düşen ikinci deneme |

Önyükleme menüsü üç seçenekle sunulur: **Normal**, **Güvenli görüntü (nomodeset)**, **Uyumluluk (nomodeset + pci=nomsi + autosuspend kapalı)**. Varsayılan seçim 5 saniye sonra Normal.

---

## 5. Sıfır dokunuşlu kurulum akışı

```text
USB'den açılış
   |
   v
[1] Donanım taraması (disk, ekran, ağ) — ekranda canlı liste
   |
   v
[2] Tek soru: hedef disk seçimi  ->  "Bu diskteki her şey silinecek" onayı
   |
   v
[3] Sessiz bölümleme (GPT: ESP + sistem + RAM'e göre takas)
       her adım ilerleme penceresinde: adım adı · yüzde · geçen süre
   |
   v
[4] Sistem kopyalama (gerçek dosya sayacı, hiç boş ekran yok)
   |
   v
[5] Sürücü/firmware yerleştirme + açılış yapılandırması
   |
   v
[6] "Kurulum tamamlandı — USB'yi çıkarın" ekranı, geri sayım
   |
   v
[7] Yeniden başlatma  ->  doğrudan Tedbirge® WebOS masaüstü
```

Zorunlu kurallar:
- Kullanıcı hiçbir aşamada komut yazmaz; yalnız menü ve Evet/Hayır kullanır.
- 2 saniyeden uzun açıklamasız boş ekran veya yalnız yanıp sönen imleç bulunmaz.
- Her hata kendi kodu ve Türkçe açıklamasıyla pencerede görünür; "Tekrar dene / Başka disk / Kapat" menüsü sunulur.
- İptal veya hata sonrası sistem canlı masaüstüne döner, komut satırına düşmez.

---

## 6. Doğrulama kapıları (yayın öncesi zorunlu)

1. Paket ve firmware listesi derleme başlamadan doğrulanır.
2. Sanal makinede BIOS ve UEFI açılışı, üç önyükleme girdisi ayrı ayrı test edilir.
3. Kurulum uçtan uca gözetimsiz çalıştırılır; USB çıkarılmış hâlde masaüstü açılışı doğrulanır.
4. Klavye ve fare kurulumun her ekranında test edilir.
5. Tüm kapılar yeşil olmadan indirilebilir sürüm güncellenmez.

Sınır: Sanal testler yazılım tarafını kanıtlar; kablo, güç veya mekanik disk arızasına garanti verilemez. Böyle bir durumda hedef, veriyi riske atmadan durup net hata göstermektir.

---

## 7. Uygulama sırası (onay sonrası)

1. ISO donanım onarımları (bölüm 4) — en yüksek öncelik, tek turda.
2. Sıfır dokunuşlu kurulum akışı (bölüm 5).
3. Sanal doğrulama kapıları (bölüm 6) ve fiziksel makine kabulü.
4. Gömülü ofis süreçleri.
5. Sistem düzeyinde P2P eşitleme hizmeti.

Onayınız olmadan hiçbir kod yazılmayacaktır.
