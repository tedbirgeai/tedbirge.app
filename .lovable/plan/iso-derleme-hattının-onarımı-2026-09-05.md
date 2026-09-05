# ISO Derleme Hattının Onarımı

## Bu turda doğrulanan durum

- `scripts/build-kernel.sh` içindeki kopyalama satırı bozuk: `cp "$WASM" \ \` satır devamında fazladan ters bölü var ve hedef dizin (`../../public/kernel`) önceden oluşturulmuyor.
- `bun run build` çıktısı kök `dist/` altına **doğrudan** `index.html` koymuyor. Üretilen düzen: `dist/client/` (statik dosyalar, `assets/`, `kernel/`, `sw.js`), `dist/server/`, `dist/nitro.json`. `dist/client/index.html` de yok, çünkü uygulama sunucu tarafında render ediliyor.
- `alpine/ci-build.sh` ise `"$WORK/dist/index.html"` arıyor ve `tar` ile `"$WORK/dist"` klasörünü paketliyor — bu yüzden hata veriyor.
- ISO içindeki nginx yapılandırması statik dosya sunuyor ve bilinmeyen yolları `/index.html` dosyasına düşürüyor; yani ISO'nun çalışması için statik bir açılış `index.html` şart.

Bu nedenle "çıktıyı kök `dist/` klasörüne al" isteği birebir uygulanamaz: sunucu tarafı render eden çıktı ile statik çıktı aynı klasörde tek `index.html` üretmez. Aşağıdaki çözüm aynı sonucu doğru yoldan verir — ISO için gerçek bir `index.html` üretilir, canlı sitedeki sunucu render bozulmaz.

## Yapılacaklar

### 1. Çekirdek betiği (`scripts/build-kernel.sh`)

- Kopyalamadan önce hedef dizin `mkdir -p` ile garanti edilir.
- Bozuk `cp` satırı tek satırda, tırnaklı ve ters bölüsüz yazılır.
- Wasm dosyası hem depo kökündeki `public/kernel/` hem de derleme çıktısında kullanılan yola tutarlı biçimde kopyalanır; kopya sonrası boyut kontrolü yapılır (boş dosya sessizce geçmez).

### 2. Açılış sayfasının üretilmesi (`vite.config.ts`)

- TanStack Start'ın ön-render (prerender) özelliği açılır ve `/` yolu statik olarak üretilir. Sonuç: `dist/client/index.html`.
- Sunucu tarafı render, API uçları ve mevcut Nitro/Vercel yapılandırması olduğu gibi kalır; yalnızca ISO'nun ihtiyaç duyduğu statik açılış dosyası eklenir.
- Ön-render sırasında tarayıcıya özel kodun çalışmadığı doğrulanır; sorun çıkarsa ilgili parça hidrasyon sonrasına alınır.

### 3. ISO betiği (`alpine/ci-build.sh`)

- Web paketi kaynağı `dist/client` olarak alınır (geriye dönük uyum için `dist/index.html` varsa o da kabul edilir).
- Kontrol mesajı gerçek yolu gösterir; eksikse hangi komutun çalıştırılacağını söyler.
- Ek doğrulama: `kernel/tedbirge_kernel.wasm` paketin içinde mi — yoksa hata verip durur, çünkü çekirdeksiz ISO yayınlanmamalı.
- `tar` paketlemesi yeni kaynak dizinden yapılır.

### 4. İş akışı (`.github/workflows/build-iso.yml`)

- Çekirdek adımından sonra `public/kernel/tedbirge_kernel.wasm` boyut kontrolü korunur.
- Web derlemesinden sonra `dist/client/index.html` ve `dist/client/kernel/tedbirge_kernel.wasm` varlığı doğrulanır; eksikse iş adım adım anlaşılır hata ile durur.
- Docker adımına geçmeden önce paketlenecek dizin loglanır, böylece ileride aynı hata teşhis edilebilir olur.

### 5. Doğrulama

- `bash scripts/build-kernel.sh` (cargo varsa) veya en azından betiğin sözdizimi kontrolü.
- `bun run build` sonrası `dist/client/index.html` gerçekten oluşuyor mu, içinde uygulama kabuğu var mı.
- `alpine/ci-build.sh` giriş kontrolünün yerelde dosya varlığına göre doğru sonuç verdiği kontrolü (ISO'nun tamamı yerelde derlenmez; o adım GitHub Actions'ta çalışır).
- Tip denetimi, testler ve üretim derlemesi hatasız geçer.

## Kapsam dışı

Gerçek ISO'nun bu ortamda derlenmesi, GitHub'a gönderim ve Actions çalıştırma. Bunlar depo bağlandıktan sonra sizin tarafınızda tetiklenir.
