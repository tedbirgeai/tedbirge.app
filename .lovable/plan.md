# Tam Bağımsızlık, Arama Motoru Gizleme ve Kurulum Rehberi Redizaynı

## 1. Marka temizliği ve tek kimlik

- Kullanıcının gördüğü tüm başlık, alt bilgi, telif ve sahiplik metinleri yalnızca **Tedbirge® WEBOS** olur; telif satırı "© Tedbirge® WEBOS · Mehmet DİNÇ" biçiminde tek biçime getirilir.
- Eski `tedbirge-app.lovable.app` adresi kodun hiçbir yerinde kalmaz; tüm adresler `src/lib/site.ts` üzerinden `https://tedbirge.app` olarak üretilir.
- Konsol çıktıları ve geliştirici notlarındaki üçüncü taraf platform adları kaldırılır.
- Uygulama listesindeki **Google arama kısayolu** kaldırılır; giriş ekranındaki **"Google ile devam et"** düğmesi kaldırılır (telefon/TOTP ve e-posta girişi kalır).
- Yazı tipleri artık dışarıdan yüklenmez: harici yazı tipi bağlantıları kaldırılır, aynı görünüm cihaz içi/yerel yazı tipi zinciriyle korunur.
- Site simgeleri (favicon) harici bir servis yerine yerel harf/marka rozetinden üretilir.

Bilinçli olarak kalanlar (kaldırılırsa sistem çalışmaz): platformun kendi ürettiği altyapı dosyaları, paket bağımlılıkları, bağlantı kurma (STUN) sunucuları ve mobil bildirim iletimi. Bunlar kullanıcıya görünmez, arayüzde adları geçmez.

## 2. Arama motorlarından tam gizleme

- `public/robots.txt` tüm robotlara kapatılır (`User-agent: *` / `Disallow: /`), site haritası bildirimi verilmez.
- Kök sayfa yapılandırmasına sitenin tamamı için `noindex, nofollow, noarchive, nosnippet, noimageindex` kuralı eklenir.
- Sunucu yanıtlarına `X-Robots-Tag: noindex, nofollow` başlığı eklenir (Vercel yapılandırması).
- Paylaşım önizleme etiketleri sade kalır; arama motoru doğrulama etiketi bulunmaz.

## 3. Kurulum rehberi penceresi (modal) redizaynı

- Başlık: **"Tedbirge OS Kurulum Rehberi"**.
- Sağ üstte belirgin **X** kapatma düğmesi; **ESC** tuşu ve karartılmış alana tıklama pencereyi kapatır (Nielsen #3).
- Kırpılma düzeltmesi: pencere üstten sabit değil, ekranda dikey ortalanır; başlık çubuğu yapışkan (sticky), yalnızca içerik kaydırılır. Böylece **1. madde** her ekran boyutunda tam görünür.
- Estetik: koyu mod/cam efekti (glassmorphism) ile uyumlu, bulanık arka planlı bütünleşik başlık çubuğu; tüm renkler mevcut `--tb-*` değişkenlerinden okunur, sabit renk kullanılmaz.
- Açılışta odak pencereye taşınır, kapanınca geri döner; odak pencere içinde kalır. Dokunma hedefleri 48px.

## Teknik notlar

- Dokunulacak başlıca dosyalar: `src/components/shell/BareMetalIso.tsx` (modal kabuğu + rehber), `src/routes/__root.tsx` (robots meta, yazı tipi bağlantıları), `public/robots.txt`, `vercel.json` (X-Robots-Tag), `src/styles.css` (yerel yazı tipi zinciri), `src/shell/web-apps.ts`, `src/components/shell/apps/AuthPanel.tsx`, `src/components/shell/BrandIcon.tsx`, alt bilgi/telif bileşenleri.
- Değişmeyecek: Rust-Wasm çekirdek, pencere yöneticisi, veri katmanı, ödeme ve ISO derleme hattı.
- Sonunda tip denetimi, testler ve derleme çalıştırılır; ana ekran ve kurulum penceresi tarayıcıda doğrulanır.
