# Tedbirge® WebOS — Duyarlı Mobil & Masaüstü Arayüz

Amaç: aynı kabuğun telefonda parmakla, bilgisayarda fare/klavyeyle kusursuz çalışması; Koyu Kristal (cam) görünümün varsayılan olması ve Nielsen'in 10 kullanılabilirlik ilkesinin arayüzde karşılığının bulunması.

## 1. Ekran düzeni ve ızgara

- Telefonda uygulama simgeleri kesin 4 sütun; her sayfa 4×4 = 16 simge (mevcut sayfalayıcı bu kurala sabitlenir, sayfa noktaları korunur).
- Geniş ekranda ızgara otomatik 6–8 sütuna açılır (ekran genişliğine göre).
- Tüm dokunma hedefleri en az 48×48 px, simgeler arası boşluk en az 12 px.
- Ana ekranda büyük cam kart üzerinde Tarih + Gün + Saat widget'ı; telefonda üstte tam genişlik, masaüstünde sağ üstte mevcut kartların başında.

## 2. Alt çubuk (Dock)

- Altta sabit, yarı saydam cam şerit; her iki ekran boyutunda aynı yapı.
- Sol altta her zaman görünen Anasayfa düğmesi: tek dokunuşla tüm açık pencereleri küçültür; ikinci dokunuş geri getirir (geri alınabilir).
- Anasayfa yanında 3 sabit slot; varsayılan: Sohbet, Arama, WhatsApp.
- Slotlar hem parmakla sürükle-bırak hem fareyle taşınarak değiştirilebilir; seçim cihazda kalıcı saklanır.
- Sağda mevcut açık pencere göstergeleri ve Mağaza düğmesi kalır.

## 3. Üst durum çubuğu

- Sabit üst şerit: canlı saat, pil yüzdesi (destekleyen cihazlarda), mesh ağ durumu, disk okuma/yazma göstergesi, arama ikonu, bildirimler.
- Telefonda yukarıdan aşağı çekme ile Hızlı Ayarlar paneli açılır (ağ modu, odak, parlaklık, ses, tema).
- Masaüstünde bildirim merkezi sağ üstten açılır; mevcut Kontrol Merkezi bu panelle birleşir.

## 4. Nielsen ilkeleri karşılıkları

1. Durum görünürlüğü: üst çubuktaki canlı göstergeler + işlemlerde ilerleme/geri bildirim.
2. Gerçek dünya uyumu: tanıdık sistem ikonları, aşağı çekme jesti, Türkçe sade dil.
3. Kullanıcı kontrolü: Anasayfa düğmesi, kapatma sonrası "Geri al" bildirimi, global Ctrl+Z.
4. Tutarlılık: tek tipografi ölçeği, tek ikon seti, tüm renkler `--tb-*` token'larından.
5. Hata önleme: silme/sıfırlama gibi geri dönüşsüz işlemlerde onay penceresi ve güvenli boşluklar.
6. Tanıma: Dock'ta sürekli görünen Anasayfa + 3 uygulama, son kullanılanlar.
7. Esneklik: masaüstünde Ctrl/Cmd + K komut paleti (mevcut Ctrl+Boşluk kısayolu korunur), özelleştirilebilir Dock.
8. Estetik: Koyu Kristal varsayılan tema — bulanık yarı saydam yüzeyler, yüksek kontrastlı açık tipografi, sade yerleşim.
9. Hata çözümü: ağ kopması veya depolama hatasında jargonsuz, çözüm öneren uyarı kartı.
10. Yardım: ilk açılışta 3 adımlı kısa tanıtım (jestler + kısayollar), üst barda arama ikonu; rehber Ayarlar'dan tekrar açılabilir.

## Teknik notlar

- Varsayılan tema `night` (Koyu Kristal) olur; Açık Kristal seçenek olarak kalır. Kayıtlı "varsayılan Açık Kristal" kuralı güncellenir.
- Yeni dosyalar: `src/components/shell/StatusBar` genişletmesi yerine `SystemBar.tsx` düzenlenir; `src/components/shell/QuickSettings.tsx`, `src/components/shell/ClockWidget.tsx`, `src/components/shell/Onboarding.tsx`, `src/shell/dock-slots.ts` (3 slot + kalıcılık), `src/lib/shell/undo.ts` (geri alma yığını).
- Düzenlenecek: `Dock.tsx` (anasayfa düğmesi, slotlar, sürükle-bırak), `Desktop.tsx` / `DesktopPager.tsx` (4 sütun / 6–8 sütun), `DesktopWidgets.tsx` (saat kartı), `WorkspacePanel.tsx` (Ctrl/Cmd+K, Ctrl+Z, ilk açılış rehberi), `styles.css` (cam token'ları, dokunma hedefi yardımcıları), `src/lib/ui/wallpaper.ts` (varsayılan tema).
- Pil için `navigator.getBattery`, disk için mevcut VFS kullanım ölçümü; desteklenmeyen cihazda gösterge sessizce gizlenir.
- Doğrulama: `bunx tsgo --noEmit` sıfır hata, `bunx vitest run` yeşil, Playwright ile 390 px ve 1440 px görünümlerde ızgara sütun sayısı, Dock sürükleme, hızlı ayarlar ve komut paleti kontrolü.
