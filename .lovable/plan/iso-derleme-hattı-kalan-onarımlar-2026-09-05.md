# ISO Derleme Hattı — Kalan Onarımlar

Bu turda dosyalar okundu. Durum: 1., 2. ve 3. maddelerin büyük bölümü zaten uygulanmış durumda (çekirdek betiğinde `mkdir -p` + tırnaklı `cp` + boşluk kontrolü var; `vite.config.ts` içinde ön-render açık ve `dist/client/index.html` üretiliyor; `alpine/ci-build.sh` önce `dist/client`, yedek olarak `dist` bakıyor, çekirdek Wasm'ını doğruluyor ve `tar` işlemini seçilen kaynaktan yapıyor). Geriye şu farklar kalıyor:

## Yapılacaklar

### 1. `scripts/build-kernel.sh`
- Kopyalamadan önce üç hedef dizini birlikte garanti et: `mkdir -p public/kernel ../public/kernel ../../public/kernel` (mevcut mutlak yol garantisi korunur).
- Kopya sonrası kontrolü `test -s` biçimiyle de yaz, mesaj Türkçe kalır.

### 2. `.github/workflows/build-iso.yml`
- Rust Wasm adımına, betik çağrısından önce hedef dizin oluşturma satırını ekle.
- Web derlemesi doğrulamasına `test -s dist/client/index.html` ekle (mevcut açıklayıcı hata mesajları korunur).
- ISO doğrulama adımında kendi kendine kopyalamayı önle:
  ```text
  TARGET=build/iso/tedbirge-webos-x86_64.iso
  if [ "$ISO" != "$TARGET" ]; then cp "$ISO" "$TARGET"; fi
  ```
- `latest` ön-sürüm yayın adımına dosyaların üzerine yazma seçeneğini ekle. Not: `softprops/action-gh-release@v2` bu girdiyi `overwrite_files: true` adıyla kabul eder; `overwrite: true` geçersiz girdi olur. Doğru olan ad kullanılacak.

### 3. Doğrulama
- `bash -n scripts/build-kernel.sh`, `sh -n alpine/ci-build.sh`, workflow YAML ayrıştırma.
- `bun run build` sonrası `dist/client/index.html` ve `dist/client/kernel/tedbirge_kernel.wasm` varlık kontrolü.
- Tip denetimi ve testler.

## Kapsam dışı
`tedbirgeai/tedbirge.app` deposuna commit/push ve GitHub Actions çalıştırma bu ortamdan yapılamaz; değişiklikler hazır olur, gönderimi siz tetiklersiniz.
