# Tedbirge® WebOS — Kalan Uygulamaların Mühürlenmesi

Çekirdek (Rust-Wasm), IndexedDB ve pencere yöneticisi olduğu gibi korunur. Aşağıda yalnızca hâlâ eksik olan işler var; önceki turda tamamlananlar tekrar edilmez.

## Zaten tamam (kontrol edildi)

- VFS klasör alanı (`Belgeler`, `Görseller`, `Medya`, `İndirilenler`), yeniden adlandır/taşı/sil, tür süzgeci.
- Dosyalar: dizin ağacı, arama, önizleme paneli.
- Aktarım: bağımsız pencere, üç sekme, canlı hız, duraklat/iptal, `installed.ts` kaydı.
- Medya ve Müzik: VFS kütüphanesine bağlı.
- Mağaza: kategori sekmeleri ve arama.

## Yapılacak işler

### 1. Görünüm (`WallpaperSettingsApp.tsx`)
Tek ekran yerine üç sekme: Duvar Kâğıdı Galerisi, Tema Paletleri, Yazı Tipi Boyutu. Yazı tipi ölçeği yeni bir `--tb-font-scale` değişkenine yazılır (Küçük / Normal / Büyük / Çok Büyük), cihazda kalıcı saklanır ve tüm pencerelere anında yansır.

### 2. Sohbet (`ChatApp.tsx`)
Üç bölümlü üst sekme şeridi: Aktif Sohbetler, Eş Bulma, Güvenlik (E2EE / doğrulanmış düğüm rozetleri). Mevcut mesajlaşma akışı bozulmaz, yalnızca sarmalanır.
Çevrimdışı kuyruk: ağ kesikken gönderilen mesajlar yerel kuyruğa yazılır, bağlantı dönünce sırayla iletilir; balonda "bekliyor" rozeti gösterilir.
Sürüklenen VFS dosyası sohbet balonunda önizleme/indirme kartı olarak görünür.

### 3. Bilgisayarım (`ComputerApp.tsx`)
Beş sekme baştan sona taranır: sabit/maktu sayı bırakılmaz. Uptime ve bellek canlı örneklenir, depolama `navigator.storage.estimate()` ile tazelenir, kalıcı depolama izni, önbellek temizleme, dışa/içe aktarma çalışır durumda olur. Ağ sekmesinde 4 mod + eş listesi + canlı aktarım sayacı; Uygulamalar sekmesinde 7 uygulamanın durumu, VFS izi ve sıfırlama; Ayarlar sekmesinde tema, gece filtresi, ses kazancı ve yeni yazı tipi ölçeği.

### 4. Web Kabuğu ve Off-Grid (`TedbirgeWebView.tsx`)
Adres çubuğu yalnızca hedef alan adını gösterir (geçit yolu gizli). "Geçit" ve "Tedbirge Web Kabuğu · domain" rozetleri bağlanır. Tam Gizlilik modunda iframe tamamen kapatılır, yerine izolasyon bilgi kartı gelir.

### 5. Hijyen
Ölü buton bırakılmaz; henüz tamamlanmamış eylemler Tedbirge OS bildirim kartı verir. `ESC` aktif pencereyi kapatır, `Ctrl+Space` Spotlight açar; ikisi de tek yerde tanımlanır.

## Teknik notlar

- Yeni: `src/lib/vfs/preview.ts` (tür bazlı önizleme çözümleyici), `src/lib/ui/font-scale.ts`, sohbet için çevrimdışı kuyruk modülü (`src/lib/chat/outbox.ts`).
- Güncellenecek: `WallpaperSettingsApp`, `ChatApp`, `ComputerApp`, `TedbirgeWebView`, `styles.css` (`--tb-font-scale`).
- Tüm renkler `--tb-*` değişkenlerinden okunur; sabit hex taranıp temizlenir.
- Doğrulama: `bunx tsgo --noEmit` sıfır hata, hex renk taraması, çevrimdışı açılışta masaüstü + "Off-Grid Modu Aktif" rozeti kontrolü.
