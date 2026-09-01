# Tedbirge® WebOS — Tek Kabuk (SPA) Bütünleştirme

Amaç: sistem bir web sitesi gibi değil, tek bir masaüstü kabuğu gibi davransın. Tüm içerik `/` altındaki pencerelerden açılır; yalnızca yasal zorunluluk taşıyan URL'ler ince sayfa olarak kalır.

## 1. Rota temizliği

Silinecek rotalar (içerikleri OS uygulamalarına taşınır veya tamamen kaldırılır):

`afet-kamu, api-dokumantasyon, app, dashboard, demo, dokumanlar, en, enerji, fiyatlandirma, giris, guvenlik, hakkimizda, hibrit-model, iletisim, izinler, kablosuz-sarj, kapsama, karsilastirma, katil, kayit, kur, kurumsal, mevzuat, pilot-panosu, protokol, rehber.index, rehber.$slug, saha, sertifikasyon, system, tasiyicilar, turkiye-mevzuat, urun, uyumluluk` ve `_authenticated/` altındaki `panel, yonetim, saha-raporu, teklif.$id` (+ `_authenticated/route.tsx` kapısı).

Korunacak rotalar:

- `/` — Tedbirge OS masaüstü (tek giriş noktası)
- `/chat`, `/sohbet` (yönlendirme), `/cevrimdisi` — mevcut kabuk/PWA yedeği
- Yasal ince sayfalar: `/gizlilik`, `/kosullar`, `/iade`, `/yasal`, `/ihracat-uyum` — aynı içerik bileşenini hem sayfa hem OS penceresi kullanır (ödeme/mağaza uyumluluğu için URL'ler kalır)
- `src/routes/api/**` — sunucu uçları (webhook, geçit, ISO, telemetri) aynen kalır

Silinen sayfalara giden tüm `Link`/`navigate` referansları aynı adımda pencere açma çağrısına dönüştürülür; ölü bağlantı bırakılmaz.

## 2. Yeni birleşik OS uygulamaları

Sayfa gövdeleri `src/components/shell/apps/` altına taşınır ve uygulama kaydına (`src/shell/installed.ts` + pencere yöneticisi) eklenir:

- `AyarlarApp.tsx` — Sistem, gizlilik, güvenlik, izinler, tema/görünüm, hesap & oturum (eski `/giris`, `/kayit`, `/izinler`, `/guvenlik`, `/gizlilik`)
- `SistemBilgisiApp.tsx` — Kurumsal, sürüm, lisans, enerji, mevzuat/uyum, dokümanlar, taşıyıcılar (eski `/kurumsal`, `/enerji`, `/mevzuat`, `/dokumanlar`, `/tasiyicilar`, `/sertifikasyon`, `/yasal` metinleri)
- `MagazaApp.tsx` — mevcut `StoreApp` üzerine fiyatlandırma/paket katmanı (eski `/fiyatlandirma`, `/urun`, `/karsilastirma`)
- `PanelApp.tsx` — müşteri paneli, yönetim ve saha raporu sekmeleri; yetkiye göre içerik (eski `_authenticated/*`, `/pilot-panosu`, `/saha`, `/kapsama`)

Uzun pazarlama metinleri (afet-kamu, hibrit-model, karşılaştırma vb.) korunmaz; özleri ilgili uygulama sekmelerine sığdırılır.

## 3. Arka plan servis katmanı

`BackgroundServicesProvider` (`src/shell/BackgroundServices.tsx`) eklenir ve `__root` içinde bir kez monte edilir:

- Düğüm çalışma zamanı, WebRTC eşleşme dinleyicileri, P2P mesaj kuyruğu, Daelog/telemetri döngüsü ve ağ modu takibi sayfa bileşenlerinden çıkarılıp buraya alınır
- Görsel çıktı üretmez; pencere açık/kapalı fark etmeksizin çalışır, durumu mevcut store'lara yazar
- `CallHost` ve bildirim köprüsü bu sağlayıcının altında toplanır

## 4. ISO 9241 / Nielsen tek tip pencere standardı

Tüm yeni uygulamalar mevcut `WindowShell` sözleşmesine bağlanır:

- Sol üstte 48px "← Ana Ekran / Kapat" hedefi (mobil ve masaüstü ortak)
- Başlıkta cihaz tipine göre dinamik ad (`useDeviceScopeLabel`)
- Üst barda tek akıllı indirme/kurulum butonu (PWA yoksa ISO)
- Gövde: `flex-1 overflow-y-auto pb-24`, güvenli alan boşlukları, 48px dokunma hedefleri

## Teknik notlar

- Rota silme sonrası `src/routeTree.gen.ts` otomatik yeniden üretilir; elle düzenlenmez
- Yasal ince sayfalar içeriklerini `src/content/legal/*` bileşenlerinden okur; tek kaynak, iki yüzey
- `sitemap`/`robots` ve `src/lib/site.ts` bağlantı listeleri kalan rotalara göre sadeleştirilir
- Kapanışta `bunx tsgo --noEmit` ve `bunx vitest run` sıfır hata ile çalıştırılır; silinen sayfalara ait testler güncellenir

## Çıktı

Silinen rotaların listesi, yeni birleşik modüller ve iki doğrulama komutunun temiz çıktısı raporlanır.
