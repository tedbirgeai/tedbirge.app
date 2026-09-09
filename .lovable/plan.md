# Tedbirge® WebOS — Masaüstü Kabuğu ve Ofis Süreçlerinin Yeniden İnşası

Mevcut yüzeysel ofis taslakları (Markdown bölünmüş Writer, ilkel Sheets tablosu, liste tabanlı Slides/Notes/Organizer, iframe PDF) kaldırılır. Yerlerine gerçek masaüstü seviyesinde uygulamalar gelir. Şifreli sanal dosya sistemi (VFS), pencere yöneticisi ve çekirdek katmanına dokunulmaz; tüm belgeler bugünkü kayıt/okuma kapısını kullanmaya devam eder.

Görsel dil: Açık Kristal / karanlık cam yüzey. Tüm renkler mevcut `--tb-*` değişkenlerinden okunur, sabit renk kodu yazılmaz.

## 1. Masaüstü kabuğu (OS seviyesi etkileşim)

- Tarayıcının kendi sağ tık menüsü kabuk genelinde tamamen kapatılır.
- Boş alana sağ tık: çok katmanlı (alt menülü) kristal menü — Yeni Oluştur (Klasör, Writer belgesi, Sheets tablosu, Slides sunumu, Metin notu), Sırala (ada/türe/tarihe göre), Görünüm (büyük/orta simgeler, ızgaraya hizala), Duvar kâğıdı, Temayı özelleştir, Sistem ayarları, Terminal.
- Yeni oluşturulan belge doğrudan VFS'e yazılır ve ilgili uygulamada açılır.
- Sol tuşla boş alanda sürükleme: yarı saydam seçim kutusu (rubber-band), kesişen simgeler toplu seçilir; Ctrl/Shift ile ekleme, Esc ile temizleme.
- Simgeler serbest sürüklenir, bırakıldığında en yakın ızgara hücresine oturur (grid snapping); konumlar cihazda saklanır, "Izgaraya hizala" ile sıfırlanır. Dokunmatik profilde sürükleme uzun basma ile başlar, sayfalayıcı bozulmaz.
- Dosya/klasör simgesine sağ tık: Aç, Birlikte Aç (uygun uygulamalar), Yeniden Adlandır, Kopyala/Yapıştır, Şifreli VFS'ye Kilitle, P2P Ağında Paylaş, Sil, Özellikler.
- Masaüstünde uygulama kısayollarının yanında VFS belgeleri de simge olarak görünür.

## 2. Tedbirge Writer

- Markdown yazım/önizleme bölünmesi kaldırılır; tek WYSIWYG yüzey.
- Gerçek A4 sayfa görünümü: sayfa gövdesi, kenar boşlukları, sayfa sınırı ve otomatik sayfa sonu göstergesi, yakınlaştırma.
- Sekmeli kurumsal şerit menü: Giriş (yazı tipi, punto, kalın/italik/altı çizili, renk, hizalama, liste, başlık stilleri), Ekle (tablo, görsel, sayfa sonu, çizgi), Düzen (kenar boşlukları, cetvel), Görünüm (yakınlaştırma, cetvel aç/kapa).
- Yatay/dikey cetvel, kelime/sayfa sayacı, otomatik kaydetme.

## 3. Tedbirge Sheets

- Harfli sütun ve numaralı satır başlıklı gerçek hücre ızgarası; sütun genişliği/satır yüksekliği ayarlanabilir, seçim aralığı ve klavyeyle gezinme (ok tuşları, Tab, Enter, Ctrl+ok).
- Üstte formül çubuğu: hücre adresi + içerik girişi. Formül motoru genişletilir: SUM, AVERAGE/AVG, MIN, MAX, COUNT, IF, ROUND ve aritmetik ifadeler, aralık ve hücre referansları, döngüsel referans koruması.
- Altta sayfa sekmeleri (Sheet1, Sheet2 …): ekleme, yeniden adlandırma, silme.
- Belge biçimi çok sayfalı yapıya geçer; eski tek sayfalı kayıtlar açılırken otomatik dönüştürülür.

## 4. Tedbirge Slides

- Sol tarafta slayt küçük resim paneli (sırala, çoğalt, sil), ortada etkileşimli slayt tuvali.
- Tuvale metin kutusu, şekil (dikdörtgen, elips, çizgi, ok) ve görsel eklenir; nesneler sürüklenir, boyutlandırılır, katman sırası değişir.
- Üst araç çubuğunda düzen şablonları, tema rengi ve "Sunumu Başlat" (tam ekran kiosk, F5; ok tuşları/Esc ile kontrol).

## 5. Tedbirge PDF Studio

- Gerçek PDF işleme motoru uygulama paketine gömülür (çevrimdışı çalışır, dış ağdan hiçbir kaynak çekilmez).
- Sol panelde sayfa önizlemeleri, ortada yüksek çözünürlüklü sayfa tuvali; yakınlaştırma, sayfa geçişi, metin seçimi.
- Araç çubuğu: Vurgula, Not ekle, Serbest çizim, Metin seç, Yazdır, VFS'ye kaydet. Açıklamalar belge yanında VFS'te saklanır.

## 6. Tedbirge Notes

- Blok tabanlı zengin metin mimarisi: başlık, paragraf, madde/numaralı liste, yapılacaklar kutusu, alıntı, kod, ayraç, görsel bloğu. Bloklar sürüklenerek yeniden sıralanır, "/" komut menüsü ile blok eklenir.
- Sol tarafta hiyerarşik klasör ve etiket ağacı, sabitlenen notlar, hızlı arama (başlık + içerik).

## 7. Tedbirge Organizer

- Tam ekran takvim matrisi: Aylık, Haftalık, Günlük görünümler; olay oluşturma, sürükleyerek taşıma, hatırlatma alanı.
- Entegre Kanban panosu: Yapılacaklar / Devam Edenler / Tamamlananlar; kartlar sütunlar arasında sürüklenir, karta tarih verildiğinde takvimde görünür.

## Teknik notlar

- Yeni bağımlılık yalnızca PDF işleme motoru (`pdfjs-dist`) olacak; worker ve font kaynakları paketin içinden servis edilir, CDN kullanılmaz. Diğer tüm editörler harici kütüphane olmadan React + Canvas/contentEditable ile yazılır.
- `src/lib/vfs/store.ts` API'si değişmez. `src/lib/office/documents.ts` belge biçimleri (Writer zengin belge, çok sayfalı Sheets, nesne tabanlı Slides, blok tabanlı Notes, olay+kart Organizer) için sürümlü şemaya taşınır; eski kayıtlar okunurken yükseltilir, veri kaybı olmaz.
- Masaüstü simge konumları ve görünüm tercihleri cihaz yerel ayarlarında tutulur; çok sayfalı dokunmatik masaüstü ve mevcut pencere yöneticisi davranışı korunur.
- Doğrulama: `bunx vitest run`, tür kontrolü, ESLint ve mevcut ofis paketi doğrulama kapısı (`scripts/verify-office-bundle.sh`) yeni dosya adlarına göre güncellenip çalıştırılır; ISO derleme akışı bozulmadan kalır.

## Uygulama sırası

1. Masaüstü kabuğu: sağ tık altyapısı, seçim kutusu, sürükle-bırak/ızgara, dosya menüleri
2. Belge şeması yükseltmesi + ortak ofis pencere çerçevesi (şerit menü altyapısı)
3. Writer ve Sheets
4. Slides ve Notes
5. Organizer ve PDF Studio
6. Doğrulama kapıları ve ISO paket kontrolü

Toplam kapsam büyüktür; her adım kendi içinde çalışır durumda teslim edilir, hiçbir aşamada mevcut sistem bozulmaz.
