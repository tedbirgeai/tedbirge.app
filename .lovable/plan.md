# Faz 6+ nihai üretim ve kritik hata düzeltme planı

## Hedef
Tedbirge® WebOS masaüstünü üretim kalitesinde daha kararlı hale getirmek: gerçekçi ikon dili, çakışmayan pencere yerleşimi, tek seferde açılan masaüstü yaşam döngüsü ve AXIOM çekirdek yeniden başlatma davranışı.

## Doğrulanmış mevcut durum
- Son kayıtlı derleme durumu temiz: `build OK`.
- Önizlemeden gelen kayıtlı çalışma zamanı hatası görünmüyor.
- Uygulama ikonları için ortak `AppIconSurface` var; masaüstü, Dock, görev çubuğu ve başlatıcıda kısmen kullanılıyor.
- `DesktopIcon`, uygulama özellikleri penceresi ve mağaza kartlarında hâlâ doğrudan eski `AppIcon` kullanımı var.
- Harici web ikonları artık ağdan favicon çekmiyor; yerel SVG çiziliyor. Bazı marka SVG’lerinde sabit marka renkleri var.
- Pencere mağazasında mevcut bir cascade başlangıcı ve `zTop` odak mantığı var; ancak yeni pencere yerleşimi boş alan aramıyor, ekran sınırlarına/dock alanına göre güçlü şekilde sıkıştırılmıyor.
- AXIOM penceresinde worker başlatma, hata kartı, yerel motor fallback’i ve “Servisi yeniden başlat” düğmesi mevcut; yeniden başlatma şu anda tekrar worker kurmayı deniyor.
- AXIOM alt imzası `AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs` olarak ekranda basılıyor.

## 1. İkon standardını üretim seviyesine çıkarma
- Tüm uygulama simgeleri için tek kaynaklı bir ikon katmanı oluşturulacak veya mevcut katman genişletilecek.
- TikTok, YouTube, Google, X, LinkedIn, GitHub, Spotify, WhatsApp gibi harici hedeflerde CDN/favikon yok; yerel, keskin, yüksek çözünürlüklü SVG marka işaretleri kullanılacak.
- Yerleşik WebOS uygulamaları için basit Lucide ikon yerine premium glassmorphic sistem ikonları hazırlanacak:
  - AXIOM
  - Connect Sohbet
  - Connect HD Arama
  - Müzik
  - Medya
  - Dosyalar
  - Yönetim Portalı
  - Panel
  - Ayarlar
  - Bilgisayarım
  - Terminal
  - Office: Writer, Sheets, Slides, PDF Studio, Notes, Organizer
- `DesktopIcon`, `AppContextMenu`, `StoreApp`, Dock, görev çubuğu, başlatıcı ve pencere değiştirici aynı ikon yüzeyinden beslenecek.
- İkon görsellerinde uzak kaynak kullanılmayacak; marka dışı renkler `--tb-*` tema değişkenlerinden okunacak.

## 2. Pencere yöneticisi ve üst üste binme düzeltmesi
- Pencere mağazasında deterministik bir yerleşim algoritması kurulacak:
  - Önce uygun boş alan aranacak.
  - Boş alan yoksa kontrollü cascade uygulanacak.
  - Pencere yeni açıldığında bir öncekinin tam üstüne binmeyecek.
  - Pencereler görünür masaüstü alanı, üst bar ve yüzen dock güvenli alanı içinde kalacak.
- Odak yönetimi sertleştirilecek:
  - Açılan, tıklanan, geri getirilen ve kenara yapıştırılan pencere her zaman en öne alınacak.
  - `z-index` değerleri uzun kullanımda şişerse güvenli şekilde normalize edilecek.
  - Küçültülmüş pencere görünmez kalacak, fakat yanlışlıkla etkileşim veya odak almayacak.
- Pencere taşıma/boyutlandırma sonunda konumlar sınırlar içinde düzeltilecek.
- Grid snapping mevcut davranışı korunacak, yalnız çakışma ve sınır güvenliği güçlendirilecek.

## 3. Masaüstü açılış döngüsü ve flicker düzeltmesi
- Masaüstü başlangıcındaki “bekle, kapan, ikinci defa açıl” davranışı için açılış zinciri incelenecek.
- Yerel ayarlar ve masaüstü yerleşimi ilk abonelikte sonradan ekranı sarsmayacak şekilde tek geçişli hydrate edilecek.
- Depolama okuma hataları sessiz çökme veya ikinci yükleme döngüsü üretmeyecek.
- Masaüstü ilk çiziminde kararlı varsayılan veri kullanılacak; kayıtlı veri geldiyse kontrollü ve tek kez uygulanacak.
- Shell açılış servisleri, masaüstü görünümünü gereksiz yeniden kurmayacak şekilde korunacak.

## 4. AXIOM çekirdek daemon, fallback ve yeniden başlatma
- AXIOM worker yolu Vite uyumlu `new Worker(new URL(..., import.meta.url), { type: "module" })` düzeninde netleştirilecek.
- Worker başlatılamazsa kullanıcı bekletilmeyecek; yerel motor anında canlı moda alınacak.
- “Servisi yeniden başlat” düğmesi şu davranışa sabitlenecek:
  - mevcut worker kapatılır,
  - bekleyen işler temizlenir,
  - hata ve busy/verifying durumları sıfırlanır,
  - yerel motor hemen hazır hale gelir,
  - ardından worker yeniden kurulursa arka planda devreye alınır.
- AXIOM hata kartı teknik sebebi gösterecek ama veri sızdırmayacak.
- AXIOM alt imzası sabit kalacak.

## 5. Performans ve görsel kararlılık
- 120 FPS hedefli WebGL/Canvas çizim döngüsü korunacak.
- Pencere sürükleme sırasında React state güncellemesi minimumda tutulacak; mevcut GPU katmanı yaklaşımı bozulmayacak.
- Mobil/tablet/desktop/1K–4K yerleşimlerinde ikon ve pencere çakışması test edilecek.
- Tailwind ve CSS düzeninde `--tb-*` tema sistemi korunacak; yeni renk token dışına taşmayacak.

## 6. Test ve doğrulama
- Odak/z-index/cascade için pencere yöneticisi testleri eklenecek veya güncellenecek.
- Masaüstü yerleşim hydrate davranışı için regresyon testi eklenecek.
- AXIOM fallback/restart için worker başarısızlığı senaryosu test edilecek.
- Görsel önizlemede şu akışlar kontrol edilecek:
  - masaüstü ilk açılışta tek seferde kararlı görünüyor,
  - birden çok uygulama açılınca pencereler üst üste yığılmıyor,
  - aktif pencere en önde kalıyor,
  - AXIOM hata/restart akışı yerel motora düşüyor,
  - ikonlar masaüstü, Dock, mağaza, panel ve pencere başlığında tutarlı görünüyor.
- Son kapılar: TypeScript, Vitest, lint, build ve security kontrolü.

## Kapsam dışı / dürüst sınırlar
- Üçüncü tarafların telifli logo dosyaları CDN’den veya dış kaynaktan indirilmeyecek; ikonlar yerel SVG olarak projeye gömülü kalacak.
- Fiziksel USB/ISO boot testi bu ortamda yapılamaz; bu görev masaüstü WebOS önizlemesi ve paketlenebilir kod kapılarını kapsar.
