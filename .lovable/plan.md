# kur.bat — Sahte WSL Çökmesi ve Yanıltıcı "Tamamlandı" Mesajının Düzeltilmesi

Sorun: `kur-indir.ps1` yalnızca `wsl.exe` komutunun varlığına bakıyor. WSL bileşeni
açık ama içinde dağıtım (Ubuntu/Debian) kurulu değilse `wsl -e bash` çağrısı
`execvpe(bash) failed` ile çöküyor; buna rağmen betik "[3/3] İşlem tamamlandı"
yazıp .iso üretilmiş izlenimi veriyor.

## 1. Sıkı bash/WSL testi

`kur-indir.ps1` içinde WSL tespiti tek bir gerçek denemeye dayanır:

```text
wsl.exe -e bash -c "echo TBOK"   →  çıktı "TBOK" mu?
   ├─ EVET → WSL kullanılabilir, .iso derleme yolu denenir
   └─ HAYIR / hata / boş çıktı → WSL YOK kabul edilir,
                                  sessizce saf PowerShell indirme yoluna geçilir
```

- Çağrı `try/catch` içinde, `$ErrorActionPreference='SilentlyContinue'` ve
  `2>$null` ile sarılır; `execvpe` hatası kullanıcıya ham hâliyle gösterilmez.
- `$LASTEXITCODE` de kontrol edilir.

## 2. Gerçek .iso doğrulaması

- WSL yolu çalıştıktan sonra `tedbirge-os-build` klasöründe `*.iso` aranır
  (`Test-Path` + `Length -gt 1MB`).
- Dosya varsa: tam yol ve MB cinsinden boyut yazılır → "Başarılı".
- Dosya yoksa dürüst mesaj: "Sunucuda hazır .iso bulunamadı ve bu sistemde Linux
  (WSL/bash) ortamı olmadığı için ISO derlenemedi." + `wsl --install` yönergesi.
- Hiçbir dalda .iso doğrulanmadan başarı mesajı basılmaz.

## 3. Ağ hatalarının anlaşılır sunumu

- `dist-bundle.tar.gz` ve çekirdek indirmeleri ayrı `try/catch` bloklarına alınır.
- Hata türüne göre Türkçe mesaj: bağlantı yok / sunucuya ulaşılamadı / dosya
  bulunamadı. Sessiz geçiş yok; indirilen dosya boyutu doğrulanır (0 bayt ise hata).
- İndirme başarısızsa adım sonucunda "paket indirilemedi" açıkça belirtilir.

## 4. Linux/macOS kiti

`buildKitSh` içinde de son adım eklenir: `.iso` veya rootfs arşivi gerçekten
oluştuysa "TAMAM", oluşmadıysa nedeni yazan hata mesajı ve `exit 1`.

## Teknik

- Dokunulan dosya: `src/routes/api/public/iso.ts` (`buildKitPs1`, `buildKitSh`).
  `buildKitBat` (`cmd /k`) ve ZIP akışı aynen kalır.
- UI değişmez; mevcut 48px dokunma hedefleri ve rehber metinleri korunur.
- Doğrulama: `bunx tsgo --noEmit` ve `bunx vitest run` sıfır hata; `/api/public/iso`
  ZIP'i indirilip `kur-indir.ps1` metni gözle kontrol edilir.
