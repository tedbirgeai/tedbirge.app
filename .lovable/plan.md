# Sistem Yönetim Portalı — tamamen cihazda çalışan yönetim modülü

Mevcut Tedbirge® WebOS masaüstü kabuğu, pencere yöneticisi, tema ve mağaza akışı olduğu gibi korunur. Üzerine, hiçbir bulut bağlantısı kullanmayan, verisini yalnızca cihazda tutan yeni bir **Sistem Yönetim Portalı** uygulaması eklenir. Portal masaüstünde ve Dock'ta kendi simgesiyle açılır, kendi penceresinde tam ekran çalışır.

"Daelog" adı hiçbir yerde kullanılmaz.

## Ne göreceksiniz

Portal üç bölümden oluşur ve ilk açılışta gerçekçi örnek verilerle dolu gelir:

1. **Ağ Düğümleri ve Canlı Ölçümler**
   - Üstte dört canlı ölçüm kartı: etkin düğüm sayısı, ortalama işlemci yükü, bellek kullanımı, bağlantı kalitesi.
   - Zaman içindeki değişimi gösteren iki grafik (yük/bellek eğrisi ve bağlantı kalitesi).
   - Düğüm listesi: durum rozeti, gecikme, son görülme; düğüm ekleme, düzenleme, silme.

2. **Kullanıcı ve Lisans Yönetimi**
   - Arama, role/duruma göre filtre, sütun sıralama ve sayfalama içeren tablo.
   - Ekle/Düzenle penceresi (ad, e-posta, rol, lisans paketi, durum) ve canlı form doğrulaması.
   - Silme için onay penceresi; her işlem sonrası kısa bildirim.

3. **Sistem Günlük Kayıtları**
   - Serbest arama, seviye (bilgi/uyarı/hata) ve tarih aralığı filtresi.
   - Kayıtları CSV ve JSON olarak indirme.
   - Portalda yapılan her ekleme/düzenleme/silme otomatik olarak günlüğe yazılır.

Ayrıca: yükleniyor iskeletleri, veri yoksa yönlendirici boş durum ekranları, hata yakalama, klavyeyle tam gezinme, mobil/tablet/masaüstü uyumu ve mevcut açık/koyu tema desteği.

## Veri ve kalıcılık

- Tüm veriler tarayıcıda saklanır: liste verileri IndexedDB'de, tercih/görünüm ayarları yerel depolamada.
- İlk açılışta zengin bir başlangıç veri seti yazılır; sonraki açılışlarda kullanıcının kendi verisi gelir.
- "Varsayılana dön" düğmesi ile portal verisi sıfırlanabilir.
- Portal hiçbir sunucuya istek atmaz; internet olmadan da tam çalışır.

## Teknik notlar

- Yeni dosyalar: `src/lib/portal/` (tipler, IndexedDB deposu, tohum veri, günlük yazıcı, Zustand mağazası) ve `src/components/shell/apps/YonetimPortaliApp.tsx` + alt bileşenler (`portal/` klasörü: MetricsPanel, NodesPanel, UsersPanel, LogsPanel, ortak tablo/boş durum/iskelet bileşenleri).
- Kayıt noktaları: `src/shell/web-apps.ts` (katalog girdisi), `src/shell/installed.ts` varsayılan kurulu listesi, `src/components/shell/app-icons.tsx` (Lucide simgesi), pencere açma yönlendirmesi.
- Kullanılacak paketler: mevcut recharts, react-hook-form, zod, sonner, lucide-react; ek olarak `zustand`, `framer-motion`, `idb` kurulur.
- Görsel dil: mevcut `--tb-*` tema değişkenleri üzerinden kristal/cam yüzeyler (sabit renk kodu yazılmaz), `backdrop-blur` ile cam paneller.
- Mevcut bulut tabanlı hesap, abonelik ve ödeme akışlarına dokunulmaz; portal onlardan tamamen bağımsızdır.
- Teslimden önce tip denetimi, testler ve derleme çalıştırılır; ardından yayına alınabilir.

## Kapsam dışı

- Mevcut oturum/abonelik altyapısının sökülmesi (istenirse ayrı bir iş olarak yapılır).
- GitHub'a gönderim ve harici ISO derlemesi bu iş kapsamında değildir.
