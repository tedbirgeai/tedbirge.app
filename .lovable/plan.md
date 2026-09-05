# Yayın Düzeltmesi ve tedbirge.dev Kaynak Aktarımı

## Bu turda doğrulanan durum

- Bu proje bir SPA değil: kök dizinde `index.html` yok, uygulama sunucu tarafında da render eden TanStack Start ile çalışıyor. Bu yüzden istenen `vercel.json` içindeki `"/(.*)" -> /index.html` yönlendirmesi **eklenirse site tamamen boş ekrana düşer** — çünkü sunulacak bir `index.html` dosyası yoktur.
- Kök dizinde `vercel.json` yok; `vite.config.ts` içinde `base` ayarı yok (varsayılan `/` zaten geçerli, üretimde varlık yolları köke göre üretiliyor).
- `package.json` betikleri mevcut: `dev`, `build`, `preview` (istenen üçlü karşılanıyor; `dev` komutu `vite dev`).
- Bu depoda `tedbirge.dev` geliştirici portalına ait ayrı bir kaynak ağacı yok; `src/lib/site.ts` yalnızca `https://tedbirge.dev` adresine bağlantı veriyor. Yani "portal kaynak kodunu push et" denilen kod bu projede mevcut değil.
- Depo uzak adresi (`origin`) Lovable'ın dahili deposu; buradan `tedbirgeai/*` GitHub depolarına push yapılamıyor.

## Yapılacaklar

### 1. tedbirge.app yayın uyumu (doğru yöntemle)

- SPA yönlendirmesi **eklenmeyecek**; onun yerine sunucu tarafı render eden çıktının Vercel'de doğru çalışması sağlanacak: derleme çıktısı ve sunucu girişi (`src/server.ts`) hedefe uygun şekilde yapılandırılacak, gerekiyorsa `vite.config.ts` içindeki dağıtım hedefi Vercel'e ayarlanacak.
- Varlık yolları için `base: "/"` açıkça yazılacak (davranışı değiştirmez, niyeti sabitler).
- Yayın öncesi kontrol: tip denetimi, testler ve üretim derlemesi temiz geçecek.

### 2. Açılışta çökme taraması

- Ana giriş noktaları ve açılışta çalışan servisler (arka plan servisleri, çekirdek/WASM yükleyici, WebRTC ve depolama erişimleri) taranıp yakalanmamış hata ve eksik ortam değişkeni durumları güvenli yedeklere bağlanacak; hiçbiri ilk render'ı düşürmeyecek.
- Üretim derlemesi alınıp yerel olarak çalıştırılarak gerçek bir açılış denemesi yapılacak, hata kaydı okunacak.

### 3. tedbirge.dev portalı

Bu projede portal kaynağı olmadığı için iki seçenek var; hangisini istediğinizi belirtmeniz gerekiyor:

- **A)** Portalı bu proje içinde yeni bir alt klasör olarak sıfırdan üretmek (SDK rehberi, mimari, Wasm çekirdek dokümanları) ve kendi `package.json` / `vite.config.ts` / `index.html` dosyalarıyla Vercel'e uygun hale getirmek.
- **B)** Portal başka bir Lovable projesinde ise, o projeyi kendi GitHub bağlantısı üzerinden `tedbirgeai/tedbirge.dev` deposuna bağlamak.

## Bu ortamdan yapılamayanlar (dürüst sınır)

- GitHub'a push, depo bağlama, Vercel derlemesi tetikleme. Bu adımlar sizin hesabınızla GitHub bağlantısı kurulduktan sonra otomatik iki yönlü eşitleme ile gerçekleşir. Kod tarafındaki tüm hazırlığı ben yapabilirim; push düğmesine basmak sizde.
