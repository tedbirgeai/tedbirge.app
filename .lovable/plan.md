# Sekme Kimliği: Tedbirge® WebOS — tedbirge.app

Amaç: tarayıcı sekmesinde uzun pazarlama cümleleri yerine tek, tutarlı bir marka kimliği görünsün.

## Ne değişecek

1. Ana sayfa sekme başlığı
   - Şu anki `Tedbirge Protocol — İnternet Kesilse de Çalışan Ağ` kaldırılır.
   - Yerine: `Tedbirge® WebOS — tedbirge.app`

2. Tüm alt sayfalar (48 rota)
   - Format: `<Kısa sayfa adı> — tedbirge.app`
   - Örnekler: `Hesabım — tedbirge.app`, `Sohbet — tedbirge.app`, `Fiyatlandırma — tedbirge.app`, `Rehber — tedbirge.app`, `İade Politikası — tedbirge.app`
   - Dinamik rehber sayfası: `<Yazı başlığı> — tedbirge.app`
   - Uzun açıklayıcı cümleler başlıktan çıkar; arama motoru için gereken uzun metin `description` alanında kalır (SEO kaybı olmaz).

3. Sosyal ve arama meta eşitlemesi
   - Kök rota `og:title` / `twitter:title`: `Tedbirge® WebOS — tedbirge.app`
   - Her alt sayfada `og:title` sekme başlığıyla aynı hale getirilir.

4. Manifest (`public/manifest.webmanifest`)
   - `name`: `Tedbirge® WebOS`
   - `short_name`: `Tedbirge`
   - Açıklama kısaltılıp WebOS kimliğine uyumlanır; ikonlar/kısayollar aynı kalır.

5. Favicon kontrolü
   - `/favicon.png` mevcut Tedbirge markası; kök rotadaki icon bağlantıları (`favicon.png`, `icon-192`, `apple-touch-icon`) doğrulanır, 32px'te net görünmüyorsa mevcut logodan keskin bir kare sürüm üretilir.
   - Eski `favicon.ico` artığı varsa temizlenir.

## Teknik notlar

- Başlıklar rota bazlı `head()` içindeki `meta` dizisinde tanımlı; bu proje TanStack Start olduğu için `index.html` yoktur, karşılığı `src/routes/__root.tsx` + her rota dosyasıdır.
- Kanonik URL'ler, `description` metinleri, JSON-LD ve sayfa içerikleri değiştirilmez.
- Sonrasında derleme + tip denetimi çalıştırılır, birkaç rota tarayıcıda doğrulanır.
