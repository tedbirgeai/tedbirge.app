# Tedbirge® WebOS — Kabuk, İletişim, Sistem Araçları ve Ofis Süreçlerinin Yeniden İnşası

Yüzeysel taslaklar (Markdown bölünmüş Writer, ilkel Sheets, liste tabanlı Slides/Notes/Organizer, iframe PDF, basit oynatıcılar ve applet'ler) kaldırılır; yerlerine gerçek masaüstü işletim sistemi seviyesinde uygulamalar gelir. Şifreli sanal dosya sistemi (VFS), pencere yöneticisi, çekirdek ve P2P katmanı bozulmaz.

Görsel dil: Açık Kristal / karanlık cam yüzey. Tüm renkler mevcut `--tb-*` değişkenlerinden okunur, sabit renk kodu yazılmaz. Dış ağ/CDN bağımlılığı yoktur; her şey pakete gömülüdür.

## 1. Masaüstü kabuğu ve etkileşim katmanı

- Tarayıcının kendi sağ tık menüsü kabuk genelinde kapatılır.
- Boş alana sağ tık: çok katmanlı kristal menü — Yeni Oluştur (Klasör, Writer belgesi, Sheets tablosu, Slides sunumu, Metin notu), Sırala (ada/türe/tarihe göre), Görünüm (büyük/orta simgeler, ızgaraya hizala), Duvar kâğıdı, Temayı özelleştir, Sistem ayarları, Terminal. Yeni belge doğrudan VFS'e yazılır ve ilgili uygulamada açılır.
- Boş alanda sol tuşla sürükleme: yarı saydam seçim kutusu; kesişen simgeler toplu seçilir. Ctrl/Shift ile ekleme, Esc ile temizleme.
- Simgeler serbest sürüklenir, bırakınca en yakın ızgara hücresine oturur; konumlar cihazda saklanır, "Izgaraya hizala" sıfırlar. Dokunmatik profilde uzun basma ile sürükleme; sayfalayıcı korunur.
- Dosya/klasör sağ tık: Aç, Birlikte Aç, Yeniden Adlandır, Kopyala/Yapıştır, Şifreli VFS'ye Kilitle, P2P Ağında Paylaş, Sil, Özellikler.
- Masaüstünde uygulama kısayollarının yanında VFS belgeleri de simge olarak görünür.

## 2. İletişim ve medya

- **Sohbet:** Profesyonel iletişim paneli — sohbet listesi + konuşma yüzeyi, uçtan uca şifreli anahtar rozeti, düğüm/mesh bağlantı durumu, VFS'ten dosya gönderme, sesli not, mesaj arama, teslim/okundu ve kuyruk durumu, cihaz senkron paneli. Mevcut mesajlaşma/kripto/röle altyapısı korunur, yalnız arayüz ve durum görünürlüğü yeniden yazılır.
- **Arama:** Mevcut WebRTC mesh çağrı katmanı üzerinde profesyonel arama arayüzü — sinyal kalitesi, bant genişliği ve gecikme göstergesi, sessize alma, kamera/ekran paylaşımı, katılımcı ızgarası, arama geçmişi.
- **Medya / Müzik:** VFS'teki ses ve video dosyalarını okuyan tek gelişmiş oynatıcı — çalma listeleri, kuyruk, dalga formu, görselleştirici (WebGPU varsa GPU, yoksa canvas yedeği), altyazı/tam ekran ve arka planda çalma.

## 3. Sistem ve yönetim uygulamaları

- **Dosyalar:** Solda hiyerarşik dizin ağacı, sağda ızgara/liste görünümü, üst arama çubuğu, önizleme paneli, VFS alan/kota durumu, çoklu seçim ve toplu işlemler.
- **Cihazım / Sistem Bilgisi:** Gerçek telemetri — işlemci yükü, bellek, VFS depolama, WebGPU/GPU durumu, aktif mesh düğüm sayısı, sürücü ve donanım kontrol listesi. Ölçülemeyen değer uydurulmaz, "ölçülemiyor" olarak gösterilir.
- **Ayarlar / Panel:** Tema özelleştirici (kristal/cam parlaklığı, duvar kâğıdı), ağ ve mesh yönlendirme ayarları, ekran/kiosk parametreleri, sürücü durum göstergeleri.
- **Mağaza:** İnternetsiz çalışan yerel sistem uygulaması yöneticisi — gömülü uygulamalar, yetki (capability) yönetimi, etkinleştir/kaldır.
- **Profil:** Cihazın mesh kimliği (düğüm kimliği, açık anahtar), imza/doğrulama durumu, yedek anahtar ve yerel kullanıcı tercihleri. Anahtar materyali ekranda açık gösterilmez.

## 4. Gömülü ofis takımı

- **Writer:** Markdown bölünmesi kaldırılır; gerçek A4 sayfa düzeni (kenar boşlukları, sayfa sınırı, sayfa sonu, yakınlaştırma), sekmeli şerit menü (Giriş, Ekle, Düzen, Görünüm), cetveller, tablo/görsel ekleme, başlık stilleri, otomatik kaydetme.
- **Sheets:** Harfli sütun / numaralı satır başlıklı gerçek hücre ızgarası, sütun-satır boyutlandırma, aralık seçimi, klavyeyle gezinme; formül çubuğu ve motoru (SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, aritmetik, aralık referansları, döngü koruması); alt sayfa sekmeleri.
- **Slides:** Solda slayt minyatürleri, ortada vektörel tuval (metin kutusu, şekil, görsel; sürükle, boyutlandır, katman), üstte düzen/tema ve "Sunumu Başlat" tam ekran modu (F5, ok tuşları, Esc).
- **PDF Studio:** Pakete gömülü `pdfjs-dist` motoru (worker ve fontlar paket içinden), sol sayfa minyatürleri, orta yüksek çözünürlüklü tuval, vurgulama, not, serbest çizim, metin seçimi, yazdır ve VFS'ye kaydet.
- **Notes:** Blok tabanlı zengin metin (başlık, liste, yapılacaklar, alıntı, kod, ayraç, görsel), sürüklenebilir bloklar, "/" komut menüsü, hiyerarşik klasör/etiket ağacı, sabitleme, hızlı arama.
- **Organizer:** Tam ekran takvim matrisi (aylık/haftalık/günlük) ve entegre Kanban panosu (Yapılacaklar / Devam Edenler / Tamamlananlar); kart-takvim bağlantısı.

## Teknik notlar

- `src/lib/vfs/store.ts` API'si değişmez. `src/lib/office/documents.ts` sürümlü belge şemasına taşınır (zengin Writer belgesi, çok sayfalı Sheets, nesne tabanlı Slides, blok tabanlı Notes, olay+kart Organizer); eski kayıtlar okunurken yükseltilir, veri kaybı olmaz.
- Yeni bağımlılık yalnızca `pdfjs-dist`. Diğer tüm editörler harici kütüphane olmadan React + Canvas/contentEditable ile yazılır.
- Ortak bir uygulama kabuğu (şerit/araç çubuğu, yan panel, durum çubuğu) tüm uygulamalarda tek mimari standardı sağlar.
- Simge konumları ve görünüm tercihleri cihaz yerel ayarlarında tutulur; mevcut pencere yöneticisi, dokunmatik sayfalayıcı ve kiosk davranışı korunur.
- Doğrulama: `bunx vitest run`, tür kontrolü, ESLint ve `scripts/verify-office-bundle.sh` yeni dosya yapısına göre güncellenip çalıştırılır; ISO derleme akışı bozulmaz.

## Uygulama sırası

1. Masaüstü kabuğu: sağ tık altyapısı, seçim kutusu, sürükle-bırak/ızgara, dosya menüleri
2. Belge şeması yükseltmesi + ortak uygulama kabuğu
3. Writer ve Sheets
4. Slides, Notes, Organizer, PDF Studio
5. Dosyalar, Cihazım/Sistem Bilgisi, Ayarlar/Panel, Mağaza, Profil
6. Sohbet, Arama, Medya/Müzik
7. Doğrulama kapıları ve ISO paket kontrolü

Kapsam çok geniştir; her adım kendi içinde çalışır durumda teslim edilir, hiçbir aşamada mevcut sistem bozulmaz.
