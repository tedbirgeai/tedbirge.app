# www.tedbirge.app 404 Onarımı

## Doğrulanan durum

- Uygulama sunucu taraflı çalışır (TanStack Start + Nitro). Derleme sonucu `dist/client`, `dist/server` ve `dist/nitro.json` üretir; `dist` kökünde `index.html` **yoktur**.
- Yayın ayarında çerçeve "Vite", çıktı klasörü "dist" seçili. Bu ayar `dist` klasörünü düz statik site sanıp kökte `index.html` arar, bulamaz ve **404: NOT_FOUND** verir. Hata bu uyuşmazlıktan kaynaklanıyor.
- `vercel.json` şu an `framework: null` diyor, ancak yayın panelindeki proje ayarı bunu eziyor.
- SPA yönlendirme kuralı bu projeye **eklenmeyecek**: uygulama istemci-tarafı tek dosya değil, sunucuda render ediliyor. Kural eklenirse tüm sayfalar boş kabuk döner ve API uçları bozulur.
- tedbirge.dev portalına hiç dokunulmayacak; `portal/` klasörü ve yapılandırması aynı kalacak.

## Yapılacaklar

### 1. Yayın çıktısını sabitleme (kod tarafı)

- `vite.config.ts` içinde sunucu çıktısı ön ayarı, ortam değişkenine bağlı tahminden çıkarılıp yayın ortamında kesin olarak Vercel hedefine sabitlenir; Lovable içindeki derleme davranışı değişmez.
- `vercel.json` sadeleştirilir: çerçeve seçilmez, çıktı klasörü verilmez, yönlendirme kuralı eklenmez. Böylece yayın, derlemenin ürettiği sunucu çıktısını olduğu gibi kullanır.
- Derleme yerel olarak yayın ortamı taklit edilerek çalıştırılır ve `.vercel/output` (sunucu + statik dosyalar + yönlendirme haritası) üretildiği doğrulanır.

### 2. Yayın panelinde yapılacak tek ayar (sizin adımınız)

Vercel > tedbirge-app > Settings > Build & Deployment:

- Framework Preset: **Other**
- Output Directory: **boş** (Override kapalı)
- Build Command: `npm run build`, Install Command: `npm install`

Bu ayar değişmeden kod tarafı düzeltmesi tek başına 404'ü kaldırmaz; "Vite + dist" seçimi yayın çıktısını yanlış yorumlamaya devam eder.

### 3. Doğrulama

- Tip denetimi, testler ve üretim derlemesi hatasız geçer.
- Derleme çıktısında hem statik dosyalar hem sunucu girişi bulunur; ana sayfa ön-render dosyası (`dist/client/index.html`) korunur.
- Yeni yayından sonra `www.tedbirge.app`, `tedbirge.app` ve bir alt sayfa (ör. `/gizlilik`) açılarak kontrol edilir.

## Bu ortamdan yapılamayan

Depoya commit/push ve Vercel derlemesini tetikleme bu ortamdan yetkilendirilemiyor. Kod değişikliği hazır olduğunda yayınla akışıyla depoya gider; yukarıdaki panel ayarını sizin yapmanız gerekir.
