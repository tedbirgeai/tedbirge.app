# Tedbirge® WebOS — Web Görünümü, Pencere Kapatma, Kişiselleştirme ve Kontrol Merkezi

Dört başlık tek turda uygulanır; sonunda tip denetimi ve tarayıcı doğrulaması yapılır.

## 1. Engellenen siteler için Tedbirge Web Görünümü

Bugün harici siteler `GenericAppContainer` ile çok aşamalı denenir (eşdeğer adres → Geçit → doğrudan); tüm aşamalar tükenince sade bir "yanıt vermiyor" ekranı çıkar.

Yapılacak:
- Yeni `TedbirgeWebView.tsx`: her web penceresine üst gezinme çubuğu (geri/yenile, adres alanı, "Harici sekmede aç"). Gövde `GenericAppContainer`'ı sarar.
- Tüm aşamalar başarısız olduğunda "İçerik Yerel Modda Çalışıyor" kartı: hedefin adı, neden gömülemediğinin sade açıklaması, yerel arama kutusu (Geçit üzerinden çalışan hafif arama sonucu) ve harici sekme düğmesi.
- Google gibi `embed: "popup"` hedeflerde ham iframe hiç denenmez; doğrudan yerel gezgin + Geçit araması gösterilir.
- `AppSurface` web uygulamalarını artık `TedbirgeWebView` ile açar.

## 2. Pencere kapatma ve tıklama hassasiyeti

- `WindowFrame` başlık çubuğu düğmelerinde `onPointerDown`/`onClick` olayları `stopPropagation` ile sürükleme mantığından ayrılır (şu an başlık çubuğunun pointer yakalaması X'in tıklamasını yiyebiliyor).
- Buton grubuna yüksek z-index ve `touch-action: manipulation`; dokunma hedefi 32px'e sabitlenir.
- Kenar boyutlandırma tutamakları başlık çubuğu alanının altında kalacak şekilde sıralanır.
- Küçültme animasyonu sırasında kapatma tıklaması kaybolmaz (zamanlayıcı temizliği).

## 3. Duvar kâğıdı kütüphanesi ve sağ tık menüsü

- Yeni `src/lib/ui/wallpaper.ts`: duvar kâğıdı kimliği + tema eşlemesi, `localStorage` kalıcılığı, SSR güvenli okuma.
- Kütüphane: Okyanus (yunuslar), Doğa (dağ/orman), Kristal Açık, Gece Cam, Siberpunk Neon. Görseller üretilip `src/assets` altına konur; her biri mevcut `crystal/soft/night` temasıyla eşlenir.
- Yeni `WallpaperSettingsApp.tsx` (Mağaza/masaüstü menüsünden açılır pencere): önizlemeli seçim + tema seçici; seçim anında uygulanır ve kalıcıdır.
- `Desktop.tsx` boş alana sağ tık: "Duvar Kâğıdını Değiştir", "Yeni Klasör", "Yenile" seçenekleri olan bağlam menüsü (ESC/dışa tık ile kapanır). "Yeni Klasör" mevcut VFS deposunda klasör kaydı oluşturur.

## 4. Kontrol Merkezi ve bildirimler

- Yeni `ControlCenter.tsx`: `SystemBar`'daki durum alanına tıklayınca açılan panel — ses (sistem sesleri açık/kapalı), parlaklık (yüzey filtresi), ağ durumu (düğüm/gecikme), tema seçimi, kullanıcı profili kısayolu.
- Bildirimler: kök rotada zaten `sonner` mount edilmiş; sistem olayları (dosya kaydedildi, eş bağlandı, tema/duvar kâğıdı değişti, pencere hatası) için tek bir `src/lib/shell/notify.ts` yardımcısı üzerinden tutarlı kartlar yayınlanır.

## Teknik notlar

- Renkler yalnız `--tb-*` değişkenlerinden; sabit hex yok.
- Parlaklık ve duvar kâğıdı CSS değişkeni olarak `.tbos-wallpaper` üzerinde uygulanır, React yeniden çizimi yok.
- Doğrulama: `bunx tsgo --noEmit` 0 hata; Playwright ile Google ve TikTok pencerelerinin beyaz ekran vermediği ve X düğmesinin pencereyi anında kapattığı teyit edilir.
