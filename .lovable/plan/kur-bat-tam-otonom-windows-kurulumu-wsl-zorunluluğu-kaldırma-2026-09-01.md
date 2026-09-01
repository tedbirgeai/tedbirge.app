# kur.bat — Tam Otonom Windows Kurulumu (WSL Zorunluluğu Kaldırma)

Mevcut `buildKitBat` (`src/routes/api/public/iso.ts`, satır 152-179) WSL yoksa
yalnızca "wsl --install" mesajı gösterip duruyor. Yeni akış, WSL olmayan
Windows makinelerde de tek çift tıkla sonuç üretecek.

## 1. Yeni kur.bat akışı

```text
Çift tık
  ├─ [1/3] WSL var mı?
  │     ├─ VAR  → mevcut davranış: .sh kiti WSL içinde çalışır,
  │     │         gerçek bootable .iso üretilir.
  │     └─ YOK  → PowerShell yoluna düş:
  │
  ├─ [2/3] PowerShell ile canlı sunucudan paket indir:
  │     1. Önce https://tedbirge-app.lovable.app/tedbirge-webos-v1.0-x86_64.iso
  │        dosyasını HEAD ile dene; yayında gerçek imaj varsa doğrudan
  │        "tedbirge-webos.iso" olarak klasöre indir.
  │     2. İmaj yayınlanmamışsa Invoke-WebRequest ile
  │        /dist-bundle.tar.gz (+ /kernel/tedbirge_kernel.wasm) indirilir ve
  │        "tedbirge-webos-paket" klasörüne açılır (tar.exe Windows 10+
  │        yerleşiktir; yoksa arşiv olduğu gibi bırakılır).
  │
  └─ [3/3] Sonuç bildirimi:
        ├─ .iso indiyse  → "Başarılı! tedbirge-webos.iso hazır, Rufus/Ventoy ile USB'ye yazdırın."
        └─ .iso yoksa    → Dürüst mesaj: "Sunucuda hazır .iso yok; Windows,
                            harici bir araç olmadan bootable .iso üretemez.
                            Paket indirildi; gerçek .iso için WSL (wsl --install)
                            veya Rufus'un ISO modu gerekir." — sahte .iso asla
                            üretilmez (mevcut ilke korunur).
```

Not: `oscdimg` (Windows ADK) önceki planda geçiyordu ancak ADK son
kullanıcıda bulunmaz; `oscdimg` varsa ek yol olarak kullanılır, yoksa sessizce
atlanır.

## 2. Pencere kapanma koruması

- Her son dalına (`son` etiketi ve tüm hata çıkışları) `pause` eklenir.
- Hata durumlarında (ağ yok, indirme başarısız) da önce Türkçe hata mesajı,
  sonra `pause` çalışır; pencere hiçbir senaryoda kendiliğinden kapanmaz.

## 3. İnsan dostu mesajlar

- Tüm `echo` satırları net Türkçe ve `[1/3] / [2/3] / [3/3]` adım numaralı
  olur; teknik terim (curl, mirror, exit code) kullanıcıya gösterilmez.
- Başlık: `Tedbirge(R) WebOS - Kurulum`, `chcp 65001` ile Türkçe karakter
  doğru görünür.

## 4. Dokunulacak dosyalar

- `src/routes/api/public/iso.ts` → `buildKitBat` yeniden yazılır
  (`buildKitSh`, `buildReadme` ve ZIP üretimi aynen kalır; OKUBENI.txt'teki
  Windows bölümüne tek cümle eklenir: "WSL yoksa paket PowerShell ile indirilir").

## 5. Doğrulama

- `bunx tsgo --noEmit` ve `bunx vitest run` sıfır hata.
- `/api/public/iso` çağrılıp ZIP içindeki `kur.bat` metni gözle kontrol edilir
  (pause satırları, PowerShell bloğu, Türkçe mesajlar).
