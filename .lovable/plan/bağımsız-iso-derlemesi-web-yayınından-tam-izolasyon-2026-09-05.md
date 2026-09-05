# Bağımsız ISO Derlemesi — Web Yayınından Tam İzolasyon

Amaç: kurulum imajının kendi derleme hattı ve kendi çıktı klasörü olsun; canlı site (tedbirge.app) ve geliştirici portalı (tedbirge.dev) yapılandırmalarına hiç dokunulmasın.

## Mevcut durum (kontrol edildi)

- ISO hattı bugün web ile aynı komutu (`vite build`) ve aynı klasörü (`dist/client`) kullanıyor; `alpine/ci-build.sh` paketlemeyi oradan yapıyor. Yani ISO ile yayın çıktısı iç içe.
- Çekirdek betiği (`scripts/build-kernel.sh`) Wasm dosyasını yalnızca `public/kernel/` altına yazıyor; ISO'ya özel bir hedefi yok.
- Paylaşılan yayın sayfasında (v1.0.0-baremetal) yalnızca kaynak kodu dosyaları var, `.iso` dosyası yok — imaj henüz hiç üretilmemiş.

## Yapılacaklar

### 1. Ayrı çıktı klasörü
Yeni `build-iso/` kök klasörü: içinde `web/` (imaja gömülecek arayüz), `kernel/` (Wasm çekirdek) ve `iso/` (nihai imaj + SHA256SUMS). `dist/`, `dist/client`, `dist/server`, `vercel.json` ve `portal/` hiç değişmez.

### 2. Ayrı derleme komutu
`package.json`'a `build:iso` eklenir: çekirdeği derler, arayüzü ISO'ya özel çıktı klasörüne üretir, sonuçları `build-iso/` altına yerleştirir. Yayın komutu `build` aynen kalır ve davranışı değişmez.

`vite.config.ts` yalnızca yeni bir ortam anahtarı (`TEDBIRGE_ISO=1`) ile ISO çıktı dizinini seçecek şekilde genişletilir; Vercel ve normal derleme yolları byte düzeyinde aynı davranışta bırakılır.

### 3. Çekirdek betiği
`scripts/build-kernel.sh` Wasm çıktısını hem `public/kernel/` hem de (ISO modunda) `build-iso/kernel/` altına yazar; kopyalama öncesi klasörleri oluşturur ve boş/eksik dosyada hata verir.

### 4. Alpine paketleyici
`alpine/ci-build.sh` arayüz kaynağı olarak önce `build-iso/web`, yoksa eski `dist/client` yolunu kullanır; imajı `build-iso/iso/` altına yazar. Sabit isim `tedbirge-webos-x86_64.iso` ve `SHA256SUMS` korunur.

### 5. Workflow
`.github/workflows/build-iso.yml` artık `bun run build:iso` çalıştırır; doğrulama adımları `build-iso/web/index.html`, `build-iso/web/kernel/tedbirge_kernel.wasm` ve imaj boyutu (>100 MB) üzerinden yapılır. Yayınlama adımları `build-iso/iso/*` dosyalarını `latest` ve sürüm etiketine yükler.

### 6. Doğrulama
Bu ortamda çalıştırılacak: çekirdek Wasm derlemesi, ISO modunda arayüz derlemesi, `build-iso/` içeriğinin eksiksizliği, ve normal `build` çıktısının (dist/client, dist/server, nitro tanımları) hiç etkilenmediğinin karşılaştırmalı kontrolü. Tip kontrolü ve testler de koşulur.

Sınır: gerçek `.iso` dosyası ayrıcalıklı Docker gerektirir ve yalnızca GitHub Actions'ta üretilebilir; burada üretilmiş gibi raporlanmayacak. Yayın sayfasında imaj görünene kadar indirme uç noktası "hazır değil" yanıtını vermeye devam eder.

## Teknik notlar

- İzolasyon anahtarı: `TEDBIRGE_ISO=1` → nitro `output.dir=build-iso/web-out`, `publicDir=build-iso/web`; ön-render `/` açık kalır (imaj statik açılış sayfasına muhtaç).
- `.gitignore`'a `build-iso/` eklenir.
- Vercel derlemesinde `VERCEL` değişkeni ISO anahtarını devre dışı bırakır; iki mod asla aynı anda etkin olamaz.
