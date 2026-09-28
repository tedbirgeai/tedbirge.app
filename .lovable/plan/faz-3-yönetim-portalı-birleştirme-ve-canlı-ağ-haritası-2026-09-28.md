# Faz 3 — Yönetim Portalı Birleştirme ve Canlı Ağ Haritası

Kapsam yalnız Faz 3. Bitince rapor verilir, Faz 4 için onay beklenir.

## Kaynakta doğrulanan mevcut durum

- Masaüstünde iki ayrı yönetim uygulaması var:
  - "Panel": `PanelApp.tsx`, 1016 satır. `src/components/site/` altındaki 12 bileşeni sekme olarak yüklüyor: `PanelOps`, `PanelAi`, `PanelMesh`, `PanelNetworkMap`, `PanelLive`, `PanelSecure`, `PanelSystem`, `PanelCommerce`, `PanelSections`, `PanelEnergy`, `EasyConsole` vb.
  - "Yönetim Portalı": `YonetimPortaliApp.tsx`.
- `AdminBusinessPlan.tsx` yalnız `AdminConsole.tsx` içinden kullanılıyor.
- `PanelEnergy` ayrıca `SistemBilgisiApp.tsx` içinde de kullanılıyor.
- Yönetim Portalı zaten üç sekmeye sahip: Ağ ve Ölçümler, Kullanıcı ve Lisans, Kayıtlar.
  - Veriler cihazdaki yerel depodan (`src/lib/portal/`) geliyor.
  - İlk açılışta örnek kayıtlar yazılıyor (`seed.ts`).
  - Grafikler recharts ile çiziliyor; ağ haritası yok.
  - Kayıtlar sekmesinde CSV dışa aktarma var, NDJSON yok.
- Canlı veri kaynakları mevcut ama portala bağlı değil:
  - Düğüm/eş listesi: `node-runtime.ts` (`knownPeerIds`, `presencePeerIds`, `getNodeSnapshot`)
  - Taşıyıcı yönlendirme: `mesh-routing.ts` (Dijkstra `shortestPath`, `failoverPath`)
  - 10 taşıyıcı tanımı: `carrier-bridge.ts`
  - Spektrum/BTK sınırları: `regulation.ts` ve `carrier-scheduler.ts`

## 1. Eski panel temizliği

- Masaüstündeki "Panel" uygulaması kaldırılır; kullanışlı parçaları portala taşınır:
  - lisans ve cihaz kotası → Kullanıcı ve Lisans
  - ağ haritası ve canlı durum → Ağ ve Ölçümler
- `PanelEnergy`, Sistem Bilgisi'nde kaldığı için korunur.
- Başka yerde kullanılmayan `Panel*` bileşenleri, `EasyConsole` ve `PanelApp.tsx` silinir.
- `AdminConsole` / `AdminBusinessPlan` şu kuralla ele alınır:
  - Masaüstünden erişilmiyorsa silinir.
  - Bir rota kullanıyorsa yalnız o rotada bırakılır.
  - Hangisi olduğu uygulama başında kesinleştirilir ve raporlanır.
- Sonrasında masaüstünde tek yönetim girişi kalır: "Yönetim Portalı".

## 2. Üç sekmeli portal

### a) Ağ ve Ölçümler
- **Üst durum barı**: aktif cihaz sayısı, ortalama gecikme ve toplam mesh verisi. Örnek biçim: "8 cihaz aktif | 164 ms RTT | 158 MB Mesh".
  - Değerler sabit yazılmaz; canlı eşlerden ve portal düğümlerinden hesaplanır.
  - Örnek kayıtlar hâlâ duruyorsa barda "örnek veri" etiketi görünür.
- **Canlı düğüm haritası (Canvas)**:
  - Düğümler kristal biçimli, bağlantılar üzerinde akan parçacık darbeleri.
  - Renk durumu: yeşil = etkin/doğrulanmış, sarı = uyarı/gecikme, kırmızı = hata/bağlantı yok.
  - Renkler `--tb-*` değişkenlerinden okunur.
  - WebGL yoksa veya kaybolursa Faz 2'deki 2D yedeği kullanılır.
  - Kareler yalnız sekme görünürken çizilir; saniyede en fazla 60 kare.
  - Hareket azaltma tercihinde animasyon durur.
- **Düğüm detay kartı** (cam efektli, tıklanınca açılır): düğüm kimliği (CID), işletim sistemi türü, bellek (hedef <50 MB, ölçülemiyorsa "ölçülmedi") ve anlık rol (röle / uç / köprü).
- Mevcut ölçüm kartları ve düğüm düzenleme tablosu altta korunur.

### b) Kullanıcı ve Lisans
- Tablo sadeleşir: ad, rol, durum, cihaz sayısı ve işlem sütunları.
- Cihaz kotası göstergesi, ücretsiz sınır 5 cihaz: "3 / 5 cihaz" ve ilerleme çubuğu. Altıncı cihazda "Abonelik gerekli" uyarısı.
- **Anahtar yönetimi**, arayüzde "Doğrulanmış düğüm anahtarları" adıyla: listeleme, yenileme ve iptal.
  - Kripto terimleri arayüzde geçmez; "E2EE" ve "Sıfır-bilgi" rozetleri kullanılır.
  - Anahtar gövdesi hiçbir zaman ekranda gösterilmez; yalnız kısa parmak izi görünür.

### c) Kayıtlar
- Canlı akış: yeni kayıtlar milisaniyeli zaman damgasıyla anında eklenir.
  - Akışı duraklatma/sürdürme düğmesi var.
  - Liste sanal kaydırmalı; en fazla 5000 satır bellekte tutulur.
- Arama, seviye filtresi ve tarih aralığı korunur.
- Dışa aktarma: mevcut CSV'ye ek olarak NDJSON. Filtrelenmiş görünüm dışa aktarılır.
- Kayıt kaynakları: portal kayıtları, çekirdek telemetrisi ve taşıyıcı zamanlayıcı olayları. Kullanıcı girdisi metni kayda yazılmaz (mevcut ilke).

## 3. Otonom durum rozeti

- Portal başlığında ve görev çubuğunda tek bir küçük rozet: "Yasal Sınırlar İçinde Otonom Çalışıyor", önünde renkli nokta.
  - Sarı: bir taşıyıcı bölge sınırı nedeniyle kısıtlandıysa.
  - Kırmızı: bir güç sınırı aşıldıysa ya da yönlendirme yolu bulunamıyorsa.
- Veri kaynakları:
  - `carrier-scheduler.ts` anlık görüntüsü (bölge, kapalı taşıyıcılar, güç kırpma, görev döngüsü)
  - `mesh-routing.ts` son yol hesabı
- Tıklanınca kısa bir özet açılır: 10 taşıyıcıdan kaçı açık, etkin bölge, son yönlendirme. Ayrıntı için `/mevzuat` bağlantısı verilir.
- Rozet saniyede en fazla bir kez güncellenir; ağır hesap arayüzde yapılmaz.

## Teknik ayrıntılar

- Yeni dosyalar:
  - `src/lib/portal/live.ts`: canlı eş, gecikme ve veri özetini tek yerde birleştiren abonelik.
  - `src/components/shell/apps/portal/MeshMap.tsx`: Canvas harita, parçacık akışı, isabet testi.
  - `NodeDetailModal.tsx`
  - `AutonomyBadge.tsx`
  - `src/lib/portal/export.ts`: CSV/NDJSON üretimi, CSV enjeksiyonuna karşı `=+-@` kaçışı.
- Bileşenler arası iletişim yalnız mevcut `src/shell/desktop-ipc.ts` üzerinden yapılır (proje kuralı).
- Yeni testler:
  - durum barı hesabı (boş/örnek/canlı)
  - rozet renk kuralları
  - CSV kaçışı ve NDJSON satır biçimi
  - kota eşiği (5/6)
  - harita isabet testi
- Doğrulama:
  - `bunx tsgo --noEmit`, `bunx vitest run`
  - Önizlemede portalın üç sekmesi Playwright ile açılır ve ekran görüntüsü alınır.
  - Silinen bileşenlere kalan referans aranır (`rg`).

## Kapsam dışı

Gerçek sunucu tarafı kullanıcı yönetimi, ödeme, P2P taşıma değişiklikleri, ağ geçidi fazları.
