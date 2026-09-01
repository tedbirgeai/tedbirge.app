# Tedbirge® WebOS — Bütüncül Overhaul, Ticarileştirme ve Denetim

Tek turda uygulanacak; sonunda Türkçe "Sistem Geliştirme ve İyileştirme Fırsatları" raporu sunulacak.

## 1. Üst bar yönlendirme mantığı (mükerrerlik temizliği)

Mevcut durum: çark ikonu `launch("computer")` çağırıyor (Ayarlar yerine Bilgisayarım açılıyor), profil ikonu artık var olmayan `/system` rotasına bağlı (404), bildirim butonu yok.

- Çark → `settings` (Ayarlar uygulaması).
- Profil → yeni **Profil & Hesap** uygulaması (aşağıda).
- Bilgisayarım → yalnız sistem özeti/donanım telemetrisi (mevcut sekmelerden hesap/abonelik içeriği çıkar).
- Arama → mevcut Spotlight (korunur).
- Bildirimler → yeni zil ikonu + bildirim paneli: sistem olayları, bağlantı kesilmesi/geri dönüş, dosya aktarımı, lisans/ödeme sonuçları. Okundu işaretleme ve "bildirim yok" boş durumu.

## 2. Profil & Hesap uygulaması (yeni)

Tek pencerede: kullanıcı/düğüm kimliği, oturum (giriş/çıkış), mevcut paket (Ücretsiz · Pro · Kurumsal), lisans anahtarı ve durumu, düğüm kotası (kullanılan/limit çubuğu), fatura/abonelik kısayolları. Ayarlar > Hesap sekmesi bu uygulamaya yönlendirir (tek kaynak).

## 3. Ticarileştirme ve lisans (test ortamı tam canlı)

- `PanelCommerce` tamamen `--tb-*` token'larına taşınır (şu an `border-border`, `bg-card` gibi eski site sınıfları var).
- Fiyat kartları: Community (5 düğüm ücretsiz), Pro, Enterprise; aylık/yıllık geçişi, düğüm adedi seçimi, hesaplanan tutar.
- **Yükselt** → Paddle overlay checkout (`usePaddleCheckout`, `customData.userId` ile), test token'ı ile gerçek akış.
- **Planı Yönet / Fatura Geçmişi** → `createPortalSession` müşteri portalı (yeni sekme).
- Kota sayaçları `licenses` + `devices` tablolarından canlı okunur; aşımda `PaywallModal` tetiklenir.
- Yüklenme / başarı / hata durumları her butonda görünür (Nielsen sistem durumu). Ödeme test modunda `PaymentTestModeBanner` görünür.

## 4. Uygulama tertibi (stub avı)

- **PanelApp**: tüm sekmelerdeki (Kalibrasyon, Yönetim, Ops, Mesh, Secure, Live, AI, Commerce) işlevsiz butonlar canlı server fn / HAL telemetrisine bağlanır; sahte veri yerine şeffaf "veri yok" kartı.
- **Ayarlar**: tema (crystal/soft/night + yazı ölçeği), ses, ekran, ağ modu, uygulama izinleri sekmeleri çalışır hâle getirilir.
- **Dosyalar**: VFS gezinme, yükleme, silme, yeniden adlandırma, önizleme uçtan uca bağlanır.
- **Mağaza**: kurulum akışı + lisans/satın alma rozetleri (ücretsiz / plan gerektirir / kurulu) gerçek state ile.
- **Sohbet, Medya, Müzik, Sistem Bilgisi, Aktarım, Röle, Ağ**: boş handler ve 404 üreten alt fonksiyon bırakılmaz.

## 5. Evrensel ISO 9241 / Nielsen geçişi

- Tüm etkileşimli hedefler `min-h-12 min-w-12` (48px) tabanına çekilir: TopBar, Taskbar, sekme şeritleri, modal butonları, fiyat kartları.
- `Desktop.tsx` dikey CSS Grid düzeni aynen korunur.
- Kalan eski renk sınıfları (`border-border`, `bg-card`, `text-muted-foreground`) `--tb-*` token'larına çevrilir.
- Her sekmede Yükleniyor / Boş / Hata üç durumu görünür.

## 6. Temizlik ve QA

- Atıl import, kullanılmayan değişken ve mock veri temizliği.
- Oturum kontrolü tek tipleştirilir: korumalı server fn'ler yalnızca bileşenden (`useServerFn` + oturum kontrolü) çağrılır, public loader'dan çağrılmaz — 401 kaynağı kapatılır.
- `bunx tsgo --noEmit` sıfır hata, `bunx vitest run` %100 geçiş.

## 7. Kapanış raporu

Performans darboğazları, izin/güvenlik boşlukları, WebGPU ve P2P mesh senkronizasyon açıkları, ödeme akışı iyileştirmeleri ve önerilen yeni modüller başlıklarıyla Türkçe özet.

## Teknik notlar

- Yeni: `ProfileApp.tsx`, `NotificationsPanel.tsx`, bildirim store'u (`src/lib/shell/notifications.ts`), `installed.ts` kataloğuna `profile` girdisi.
- Güncellenecek: `SystemBar.tsx`, `WorkspacePanel.tsx`, `AyarlarApp.tsx`, `ComputerApp.tsx`, `PanelApp.tsx`, `PanelCommerce.tsx`, `StoreApp.tsx`, `FilesApp.tsx`, `usePaddleCheckout.ts`.
- Ödeme: mevcut `paddle-catalog.ts` kimlikleri kullanılır; eksik ürün/fiyat varsa test ortamında oluşturulur, yayınlamada canlıya senkron olur.
- Şema değişikliği gerekmiyor; `licenses`, `subscriptions`, `devices`, `api_usage_events` tabloları yeterli.
