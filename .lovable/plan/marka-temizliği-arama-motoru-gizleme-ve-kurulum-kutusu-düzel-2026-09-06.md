# Marka Temizliği, Arama Motoru Gizleme ve Kurulum Kutusu Düzeltmesi

## 1. Tek marka kimliği

- Arayüzde, sayfa/sekme başlıklarında ve kod yorumlarında "Lovable" adı geçmez; sistem adı her yerde yalnızca **Tedbirge® WEBOS**.
- `tedbirge-app.lovable.app` adresi hiçbir yerde kalmaz; tüm adresler tek kaynaktan (`src/lib/site.ts`) `https://tedbirge.app` olarak üretilir.
- Bilinçli olarak kalanlar: platformun kendi ürettiği altyapı dosyaları ve paket bağımlılıkları (önizleme, giriş ve hata bildirimi bunlar olmadan çalışmaz). Bunların adı kullanıcıya hiçbir ekranda görünmez.

## 2. Arama motorlarından gizleme

- Kök sayfa yapılandırmasına site geneli `noindex, nofollow` kuralı eklenir ve korunur.
- `public/robots.txt` tüm robotlara kapatılır (`Disallow: /`), site haritası bildirimi verilmez.
- Sunucu yanıtına `X-Robots-Tag: noindex, nofollow` başlığı eklenir.

## 3. Kurulum bilgilendirme kutusu

- Sağ üst köşede belirgin **X (Kapat)** düğmesi; ESC tuşu ve karartılmış alana tıklama da kapatır.
- Kırpılma düzeltmesi: kutu ekranda dikey ortalanır, başlık çubuğu sabit kalır ve yalnızca içerik kaydırılır — **1. madde** her ekran boyutunda tam görünür.
- Renkler mevcut tema değişkenlerinden okunur; başka görsel değişiklik yapılmaz.

## Teknik notlar

- Dokunulacak dosyalar: `src/routes/__root.tsx` (robots meta), `public/robots.txt`, `vercel.json` (başlık), `src/components/shell/BareMetalIso.tsx` (kutu düzeni ve kapatma davranışı) ve marka/adres izi taşıyan metin dosyaları.
- Değişmeyecek: çekirdek, pencere yöneticisi, veri katmanı, ödeme ve ISO derleme hattı.
- Sonunda tip denetimi, testler ve derleme çalıştırılır; kutu tarayıcıda doğrulanır.
