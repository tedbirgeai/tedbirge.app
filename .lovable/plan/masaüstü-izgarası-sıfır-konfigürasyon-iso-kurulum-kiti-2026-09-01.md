# Masaüstü Izgarası + Sıfır-Konfigürasyon ISO Kurulum Kiti

## 1. Masaüstü ikon ızgarası (grid fix)

Bugün ikonlar `position: absolute` ile serbest sürüklenebilir konumlandırılıyor
(`Desktop.tsx` + `DesktopIcon.tsx`), bu da üst üste binmeye yol açıyor.

Yapılacak:
- `Desktop.tsx`: mutlak yerleşim ve `perColumn` hesabı kaldırılır; ikonlar
  dikey akışlı CSS Grid kapsayıcısına alınır
  (`grid grid-flow-col grid-rows-[repeat(auto-fill,100px)] gap-6 p-6 overflow-hidden`,
  yükseklik masaüstü yüzeyinden gelir).
- `DesktopIcon.tsx`: sürükleme/konum kaydetme (pointer capture, `setIconPos`,
  `pos` state) çıkarılır; ikon artık akışta duran bir düğme olur. Tek tık seçer,
  çift tık / mobilde tek dokunuş açar, sağ tık menüsü aynen korunur.
- Dokunma alanı: ikon kapsayıcısı en az `min-h-12 min-w-12` (48×48px).
- Etiket: `text-xs font-medium text-center truncate max-w-[84px] drop-shadow-md`.
- `Desktop`/`WorkspacePanel` içindeki artık kullanılmayan `draggable` ve
  `columnsHeight` props'ları ile `icons` konum deposu çağrıları temizlenir
  (depo modülü kalır, sadece masaüstü artık kullanmaz).

## 2. Sıfır-konfigürasyon bare-metal kurulum kiti

Şu an `/api/public/iso` tek bir `.sh` kiti veriyor ve önce yerel `dist/`
klasörünü arıyor. Yenisi:

- Kit, üretim sunucusundan (`https://tedbirge-app.lovable.app`) hazır statik
  WebOS paketini indirir; yerel `dist/` yalnızca ağ yoksa yedek yoldur.
- Paketleme öncesi gerekli araç (xorriso) yoksa betik bunu Nix/apt/dnf/pacman
  ile otomatik kurmayı dener, olmazsa taşınabilir rootfs arşivi üretir ve
  nedenini açıkça yazar.
- `.sh` çift tıkla çalışsın diye yürütme biti ve `#!/usr/bin/env bash`
  korunur; kit kendi çalışma klasörünü (`$PWD/tedbirge-os-build`) oluşturur,
  ek komut istemez, sonunda çıktı yolunu ve USB'ye yazma adımlarını yazar.
- Windows için `kur.bat`: çift tıklandığında WSL varsa aynı `.sh` kitini WSL
  içinde çalıştırır; WSL yoksa PowerShell ile paketi indirip `oscdimg`
  (Windows ADK) varsa ISO üretir, yoksa kullanıcıya tek satırlık
  `wsl --install` yönergesini gösterir. Windows'ta ISO üretimi harici bir
  araç gerektirdiği için tek tıkla ISO garantisi yalnız WSL veya ADK varken
  verilir; bu durum betikte açıkça yazılır.
- `/api/public/iso` rotası: yayında gerçek `.iso` varsa onu akıtmaya devam
  eder; yoksa artık tek `.sh` yerine `.sh` + `kur.bat` + `OKUBENI.txt`
  içeren tek bir `.zip` indirir (bağımlılıksız, elle üretilen zip akışı).
- `BareMetalIso.tsx` rehber metni yeni akışa göre güncellenir (indirilen
  dosyayı aç → çift tıkla → USB'ye yaz).

## Doğrulama

`bunx tsgo --noEmit` ve `bunx vitest run` sıfır hatayla geçirilir; masaüstü
ızgarası önizlemede masaüstü ve mobil genişlikte ekran görüntüsüyle kontrol
edilir.
