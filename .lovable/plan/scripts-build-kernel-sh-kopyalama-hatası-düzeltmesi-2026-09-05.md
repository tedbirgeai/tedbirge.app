# scripts/build-kernel.sh Kopyalama Hatası Düzeltmesi

## Sorun

GitHub Actions'ta "Rust Wasm çekirdeğini derle" adımında `cp` şu hatayı veriyor:

```text
CP: Hedef '../../public/kernel/tedbirge_kernel.wasm': Bir dizin değildir
```

Bu, hedef yolda `tedbirge_kernel.wasm` adında bir dizin oluşmuş ya da `cp` hedef olarak dosya adı yerine dizin adı almış olabileceğini gösteriyor.

## Yapılacaklar

`scripts/build-kernel.sh` içinde aşağıdaki değişiklikler yapılacak:

1. `mkdir -p` yalnızca klasör yollarına uygulanacak:
   - `mkdir -p "$ROOT/public/kernel"`
   - `mkdir -p "$ROOT/build-iso/kernel"`

2. Kopyalama öncesi hedef yollarda yanlışlıkla oluşturulmuş dizin veya bozuk dosya varsa temizlenecek:
   - `rm -rf "$ROOT/public/kernel/tedbirge_kernel.wasm"`
   - `rm -rf "$ROOT/build-iso/kernel/tedbirge_kernel.wasm"`

3. Wasm dosyası doğrudan hedef klasörlere kopyalanacak:
   - `cp "$WASM" "$ROOT/public/kernel/tedbirge_kernel.wasm"`
   - ISO modunda: `cp "$WASM" "$ROOT/build-iso/kernel/tedbirge_kernel.wasm"`

4. Kopyalama sonrası dosya varlığı ve boyutu kontrol edilecek; boş çıkışta hata verilecek.

5. Betik sözdizimi `bash -n scripts/build-kernel.sh` ile doğrulanacak.

## Sınır

- Gerçek GitHub Actions çalıştırması ve Release'e ISO yüklenmesi bu ortamda yapılamaz; yalnızca betik düzeltmesi ve yerel sözdizim kontrolü sağlanır.
- `dist/client`, `dist/server`, `vercel.json` ve `portal/` çıktılarına dokunulmaz.
