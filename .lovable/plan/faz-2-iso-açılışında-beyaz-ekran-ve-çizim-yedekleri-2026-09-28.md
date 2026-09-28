# Faz 2 — ISO Açılışında Beyaz Ekran ve Çizim Yedekleri

Kapsam yalnız Faz 2. Uygulama bitince rapor verilir ve Faz 3 için onay beklenir.

## Kaynakta doğrulanan kök nedenler

1. **Sağlık denetimi yanlış "sağlıklı" diyebiliyor.** `kiosk.sh` içindeki `sayfa_sagligi()`, 9222 portundaki `/json/list` listesinde 127.0.0.1 adresli bir sayfa görünce başarı sayıyor. GPU kilitlenip ekran beyaz kaldığında da sayfa bu listede yer alıyor. Denetim sayfanın gerçekten çizildiğini ölçmüyor, bu yüzden 2. kademeye hiç geçilmiyor.
2. **2. kademe Mesa llvmpipe'ı kullanmıyor.** `YAZILIM` bayrakları `--disable-gpu` içeriyor. Bu bayrak Chromium'u kendi içindeki SwiftShader çizicisine yönlendiriyor. Bu yüzden `LIBGL_ALWAYS_SOFTWARE=1` fiilen etkisiz ve llvmpipe kademesi aslında yok.
3. **Tarayıcı erken ölümü geç fark ediliyor.** `baslat()` tarayıcının çalıştığını yalnız 2 saniye sonra bir kez kontrol ediyor. Sonradan çöken tarayıcı sağlık döngüsü boyunca (40–60 sn) beklenmeye devam ediyor.
4. **Ekran düzeninde sıra ve hayalet ekran sorunu.** `ekran-duzeni.sh` önce tüm çıkışları kapatıyor (ana ekran dahil), sonra ana ekranı açıyor. Bazı sürücülerde bu ara boşluk siyah/beyaz ekranda donmaya yol açıyor. Ayrıca kip bildiren ama EDID'i olmayan hayalet çıkış (QEMU `Virtual-*` dışındaki sahte çıkışlar) ana ekran seçilebiliyor.
5. **Canvas yedeği yanlış dosyada.** Uygulamanın gerçekte kullandığı çizici `src/lib/axiom/canvas/renderer.ts`. İstekte adı geçen `src/canvas/renderer.ts` (ve `geometry_matrix.ts`, `i18n_matrix.ts`) hiçbir yerden kullanılmıyor. Ayrıca:
   - Bu yetim dosyanın WebGL yolu yalnız ekranı temizliyor, içerik çizmiyor.
   - `resize` her çağrıda ölçeği üst üste biniyor.
   - Sabit hex renk kullanıyor.
   - Canlı çizicide `webglcontextlost` dinleyicisi yok. Çalışma sırasında GPU bağlamı kaybolursa tuval donuyor ve 2D'ye geçilmiyor.

## Yapılacaklar

### A. Gerçek çizim sinyali (kiosk sağlık denetimi)
- Masaüstü kabuğu, ilk içerik kareyi çizdikten sonra (iki `requestAnimationFrame` sonrası) `document.title` sonuna `· TB_READY` işareti ekler. Bu işlem yalnız kiosk kipinde yapılır (`?kiosk=1` veya özel User-Agent eki).
- `sayfa_sagligi()` `/json/list` çıktısındaki `title` alanında bu işareti arar. İşaret olmadan başarı sayılmaz; `chrome-error` ve `about:blank` reddi korunur.
- Döngü her turda tarayıcı sürecinin yaşayıp yaşamadığını (`kill -0`) kontrol eder. Süreç ölmüşse beklemeden bir sonraki kademeye geçer.

### B. Gerçek 3 kademe
```text
Kademe 1  donanım  : --use-gl=egl (mevcut bayraklar), /dev/dri/renderD128 varsa
Kademe 2  llvmpipe : --use-gl=egl + LIBGL_ALWAYS_SOFTWARE=1 + GALLIUM_DRIVER=llvmpipe
                     (--disable-gpu KALDIRILIR; ivme yazılımla Mesa'da yapılır)
Kademe 2b swiftshader: --disable-gpu --disable-gpu-compositing (llvmpipe paketi yoksa)
Kademe 3  kurtarma : mevcut kurtarma sayfası, en güvenli bayraklarla
```
- Kademeler arasında süreç `kill -9` ile durdurulur ve profil temizlenir (mevcut). Ayrıca GPU önbelleği (`GPUCache`, `ShaderCache`) silinir.
- Seçilen kip `/run/tedbirge-goruntu-kipi` dosyasına yazılır ve açılış günlüğüne işlenir (mevcut). Değer artık `llvmpipe` veya `swiftshader` olabilir.
- `gozcu.sh` mevcut `/run/tedbirge-yazilim-cizim` bayrağı ile uyumlu kalır. Tekrar denemede 1. kademe atlanır.

### C. Ekran düzeni (`ekran-duzeni.sh`)
- Ana ekran seçim sırası:
  1. EDID'i olan bağlı çıkış (`xrandr --prop` içinde `EDID` bloğu)
  2. Yoksa QEMU/sanal çıkış
  3. Yoksa ilk kipli çıkış
- Önce ana ekran kendi kipine alınır, sonra diğer çıkışlar kapatılır (ters sıra). Böylece ekransız ara an oluşmaz.
- `xrandr --fb` yalnız ana kip ayarı başarılıysa çağrılır.

### D. Canvas 2D yedeği (`src/lib/axiom/canvas/renderer.ts`)
- `webglcontextlost` gelince döngü durur, WebGL tuvali gizlenir ve aynı veriyle 2D çizime anında geçilir. Mod etiketi "2D (yazılım)" olur. `webglcontextrestored` sonrası GPU'ya dönülmez; oturum 2D'de kararlı kalır.
- WebGL başlatma veya shader derleme hatası `try/catch` ile 2D'ye düşer (mevcut başlatma yolu netleştirilir).
- `resize` ölçeği `setTransform` ile sıfırdan kurar; üst üste binme olmaz.
- Renkler `--tb-*` değişkenlerinden okunur.
- Kullanılmayan `src/canvas/` klasörü silinir; tek kaynak `src/lib/axiom/canvas/`. Buna bağlı `axiom-core.test.ts` importu korunur.

### E. QEMU kabul testi
- `scripts/test-install-qemu.sh` seri port çıktısında `TEDBIRGE_DESKTOP_HEALTHY` ile birlikte yeni `goruntu-kipi=` satırını da raporlar.
- Yazılım kademesini zorlamak için `-vga std` ile ikinci bir koşum eklenir (GPU yok → llvmpipe beklenir).
- Bu ortamda QEMU ve ISO derlemesi çalıştırılamazsa bu açıkça raporlanır; test GitHub Actions ISO iş akışında koşar.

## Doğrulama
- `bunx tsgo --noEmit`, `bunx vitest run`
- Yeni testler: context-lost → 2D geçişi, resize ölçek sabitliği, kiosk kipinde başlık işareti.
- `shellcheck` / `sh -n` ile betik sözdizimi. `scripts/check-image-config.sh`.
- Sahte `xrandr --query` örnekleriyle `ekran-duzeni.sh` seçim testi (hayalet çıkış, QEMU `Virtual-1`, çift monitör).

## Kapsam dışı
Fiziksel donanımda test (kullanıcıda yapılır), yeni sürücü/firmware paketleri, Gateway ve P2P fazları.
