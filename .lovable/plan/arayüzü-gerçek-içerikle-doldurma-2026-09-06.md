# Arayüzü gerçek içerikle doldurma

Amaç: Anasayfada canlı haber akışı, Mağazada gerçek uygulama listesi, Sohbet/Arama'da gerçek kişilere dayalı içerik ve boşken net yönlendirme.

## 1. Anasayfa — Güncel haberler

- Masaüstünde yeni bir "Haberler" kartı: iki sekme — Gündem ve Teknoloji.
- Her sekmede en yeni 6 başlık: kaynak adı, başlık, ne kadar önce yayınlandığı.
- Başlığa tıklayınca haber, kabuğun kendi tarayıcı penceresinde açılır (yeni sekme değil).
- Kaynaklar açık haber akışlarından (RSS) alınır; istek sunucu tarafında yapılır, cihazdan doğrudan dış siteye bağlantı kurulmaz.
- Son çekilen başlıklar cihazda saklanır: internet kesildiğinde kart boş kalmaz, "çevrimdışı — en son alınan başlıklar" etiketiyle gösterilir.
- Otomatik tazeleme 15 dakikada bir; kartta elle yenileme düğmesi.
- Haber listesi ayrıca ayrı bir "Haberler" uygulaması olarak Mağazada da yer alır (aynı bileşen, pencere içinde tam liste).

## 2. Mağaza — Uygulama listesi

- Mevcut katalog gerçek; eksik olan sunum: her uygulama kartına gerçek logo/simge, kısa açıklama, kategori rozeti ve "Kurulu" durumu net gösterilir.
- Sekmelere uygulama sayısı eklenir; boş sonuçta arama önerisi.
- "Öne çıkanlar" bölümü: yerleşik iletişim ve sistem uygulamaları en üstte.
- Yeni katalog girdileri: Haberler, Hava Durumu, Takvim, Hesap Makinesi, Kamera gibi eksik günlük uygulamalar (yalnızca gerçekten açılabilenler eklenir).

## 3. Sohbet ve Arama

- Örnek/sahte kayıt eklenmez. Veriler cihazda oluşur.
- Sohbet listesi boşken: "Henüz sohbet yok" kartı + "Kişi ekle", "Numara ile başlat", "QR ile eşleş" düğmeleri.
- Arama listesi boşken: "Arama geçmişi yok" + "Tuş takımını aç", "Kişilerden ara" düğmeleri.
- Kayıtlı kişiler varsa sohbet listesi doğrudan onlardan doldurulur (ad, son mesaj, saat, okunmadı sayısı, çevrimiçi/doğrulanmış rozeti) — gerçek yerel veriden.
- Arama geçmişi gerçek arama kayıtlarından; her satırda yön (gelen/giden/cevapsız), süre ve tekrar arama düğmesi.
- Anasayfadaki bilgi kartlarına "son sohbetler" ve "cevapsız aramalar" özeti eklenir; sayı sıfırsa kart görünmez.

## Teknik notlar

- Yeni sunucu ucu: `src/routes/api/public/haberler.ts` — sabit izin listesindeki RSS/Atom adreslerini çeker, ayrıştırır, normalize eder, 10 dakika önbellekler ve yalnızca başlık/bağlantı/kaynak/tarih döner. `src/lib/cors.ts` izin listesi kullanılır.
- İstemci deposu: `src/lib/news/feed.ts` — çekme, localStorage önbelleği, `useNews()` kancası, çevrimdışı düşüş.
- Yeni bileşen: `src/components/shell/NewsCard.tsx` (masaüstü kartı) ve `src/components/shell/apps/NewsApp.tsx` (pencere uygulaması); `src/shell/installed.ts` LOCAL_APPS ve ikon eşlemesi güncellenir.
- Mağaza: `StoreApp.tsx` içinde sekme sayaçları, öne çıkanlar bölümü ve kart düzeni; katalog verisi `src/shell/web-apps.ts` / `installed.ts`.
- Sohbet/Arama boş durumları: `src/components/chat/ChatApp.tsx`, `CallsPanel.tsx`, `CallHistory.tsx`; veri `src/lib/chat/contacts.ts` ve `call-log.ts` üzerinden okunur — yeni sahte veri yazılmaz.
- Tüm renkler `--tb-*` token'larından; sabit hex yok. Metinlerde kriptografi jargonu kullanılmaz.
- Doğrulama: `bunx tsgo --noEmit`, `bunx vitest run`, `bunx eslint .` ve 390/1440 px görünümlerde haber kartı, mağaza listesi ve boş durum ekranlarının Playwright kontrolü.
