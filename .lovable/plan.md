# Tedbirge® WebOS — Bare-Metal Açılış, Kurumsal Açılış/Kapanış Ekranı ve Masaüstü Kararlılığı

# BÖLÜM A — Donanım, sürücü ve kurumsal açılış/kapanış

## A0. Doğrulanan mevcut durum

- `image/profiles/common.list` içinde `firmware-realtek`, `firmware-misc-nonfree`, `firmware-linux-nonfree`, `firmware-iwlwifi`, `firmware-atheros`, `firmware-sof-signed` zaten var — eksik olan paket değil, bu firmware'lerin initramfs'e taşınması ve yükleme hatasının açılışı durdurmaması.
- Canlı açılış satırı `quiet loglevel=3` içeriyor ama `splash` ve systemd durum susturması yok; sistemde Plymouth kurulu değil, bu yüzden ham metin akıyor.
- `tedbirge-kur` taşınabilir `EFI/BOOT/BOOTX64.EFI` dosyasını oluşturup boyutunu denetliyor; NVRAM'siz açılış zaten hedefleniyor.

## A1. Sürücü/firmware bağımsızlığı

- Firmware paketleri initramfs'e dahil edilir; `MODULES=most` korunur ve firmware dosyaları kopyalanacak şekilde initramfs hook'u eklenir.
- `rtl8xxxu` ve benzeri Realtek/USB modülleri için modprobe seçenekleri ve udev kuralı: firmware yüklenemezse modül sessizce devre dışı kalır, açılış zinciri beklemez.
- Ağ/USB donanımı olmadan da masaüstüne ulaşıldığı, gözcü (`gozcu.sh`) ve kiosk servisinin firmware hatasına takılmadığı doğrulanır.

## A2. Kurumsal açılış/kapanış ekranı

- Plymouth ve tema paketleri profillere eklenir; açılış satırına `splash rd.systemd.show_status=false systemd.show_status=false` eklenir (`quiet loglevel=3` korunur).
- Tedbirge logosu, "Tedbirge'ye Hoş Geldiniz" metni ve gerçek ilerleme (udev, disk, servis) gösteren tema hazırlanır; sahte yüzde kullanılmaz.
- Kapanış/yeniden başlatmada aynı tema "Tedbirge Kapanıyor…" ekranını gösterir; Escape ile ayrıntılı günlüğe geçilebilir.
- GRUB menüsündeki güvenli/uyumluluk girdileri `nosplash` ile kalır, böylece sorun giderme metni görünür.

## A3. Kurulum ve yeniden başlatma doğrulaması

- `tedbirge-kur` "%100 tamamlandı" demeden önce ek olarak şunları denetler: `EFI/tedbirge/bootx64.efi` ve fallback `EFI/BOOT/BOOTX64.EFI`, initramfs içinde depolama+firmware modülleri, kurulu kökte `/sbin/init`, GRUB yapılandırması ve fstab/RESUME UUID tutarlılığı.
- Herhangi biri eksikse kurulum "tamamlandı" demez; nedeni ve düzeltme adımını Türkçe gösterir.
- CI: Workstation ve Touch profilleri için BIOS+UEFI ikinci açılış testi, USB çıkarılmış senaryoyu (NVRAM'siz fallback) da kapsar; günlükler artifact olarak yüklenir.

# BÖLÜM B — Masaüstü kararlılığı, titreme ve .tbapp

## Doğrulanan mevcut durum

- `ShellProvider` düğüm durumunun tamamını (`peers`, `discovery`, `queued`, `rttMs`) bağlama koyuyor; `WorkspacePanel` bunu okuyup `SystemBar`'a geçiriyor. Tek bir eş sinyali kabuğun kökünde state güncellediği için masaüstü ve tüm açık pencereler birlikte yeniden çiziliyor — titremenin kökü bu.
- Saat/bellek zaten paylaşımlı `telemetry-store` üzerinden geliyor ve titremiyor; sorun yalnız ağ/eş akışında.
- `.tbapp` altyapısı kısmen var: `src/apps/tbapp.ts` manifesti çözüyor, yetenek onayı alıyor, Wasm modülünü başlatıyor. Eksik olan: imza doğrulaması (alanlar `spk`/`sig` tanımlı ama kullanılmıyor), simge/HTML paket desteği, masaüstüne kısayol yerleştirme, uygulama başına izole şifreli depolama.
- VFS (`src/lib/vfs/store.ts`) klasör tabanlı; `/appdata/{app_id}` gibi ayrılmış bir alan yok.

## 1. Üst bar titreşimi — kök çözüm

- Düğüm durumu kabuk bağlamından çıkarılır; ağ akışı için ayrı bir abonelik deposu (`src/lib/shell/peer-status.ts`) kurulur. Depo `describeNode` çıktısını (metin, ton, eş sayısı, kuyruk, RTT) üretir ve **değer değişmediyse yeni anlık görüntü yayınlamaz**.
- Sinyal dalgalanmaları 1500 ms boyunca sönümlenir (trailing debounce); ilk değer anında, sonrakiler sönümlü verilir.
- Yeni `PeerStatusIndicator.tsx` bileşeni bu depoya kendisi abone olur, `React.memo` ile sarılır; `SystemBar` artık `status`/`peers`/`rttMs` prop'u almaz, göstergeyi çocuk olarak render eder.
- `WorkspacePanel` düğüm durumunu okumayı bırakır — masaüstü ve pencereler eş sinyalinden hiç etkilenmez.
- Aynı depoyu okuyan diğer yüzeyler (`ControlCenter`, `CommandCenter`, `MeshStatusDialog`) kendi seçicilerine geçirilir; sabit genişlikli `tabular-nums` alanlar korunur.

## 2. Alan adı ve kopuk bağlantı onarımı

- `src/lib/site.ts` tek kaynak kalır; kod tabanı ham `tedbirge.app` / `tedbirge.dev` / `tedbirge.ai` metinleri için taranır, hepsi bu kaynağa bağlanır.
- Kabuk içi bağlantılar `OsLink` üzerinden geçirilir: uygulama içinde açılabilen hedefler pencerede açılır, dış hedefler yeni sekmede; boş `href`, `#` ve tanımsız rota bırakılmaz.
- Çevrimdışıyken dış bağlantılar "Off-Grid: bu bağlantı ağ gerektirir" bilgisiyle gösterilir, sessiz 404 üretilmez.
- VFS dosya ilişkilendirmeleri denetlenir: her belge türü açılabildiği uygulamaya eşlenir, eşi olmayan tür için "Bu dosyayı açacak uygulama yok" kartı gösterilir.

## 3. .tbapp egemen uygulama paketi

- Şema v2: `id, name, version, icon, permissions/capabilities, exec (wasm|html), css, spk, sig`. Eski alan adları geriye dönük kabul edilir.
- İmza: manifestin imzasız gövdesi kanonik JSON olarak serileştirilip Ed25519 ile doğrulanır. İmzasız paket yalnız açıkça "geliştirici modu" onayıyla kurulur ve masaüstü simgesinde "doğrulanmamış" rozeti taşır.
- Yükleyici: masaüstüne sürükle-bırak ve Dosyalar üzerinden `.tbapp` açma; paket VFS `/apps` altına yazılır, yetenek onayı alınır, kurulduğunda masaüstünde çalışan bir kısayol simgesi belirir (`desktop-layout` konumlandırmasıyla).
- İzolasyon: her uygulama `/appdata/{app_id}` altında AES-GCM ile şifrelenmiş kendi alanına yazar; anahtar cihazda türetilir, uygulamalar birbirinin alanını okuyamaz. Kaldırma işlemi bu klasörü de siler.
- Uygulama, kabuğa yalnız yetenek vekili (`grantKernel`) üzerinden erişir; doğrudan DOM/ağ/depolama erişimi yok.

## 4. Masaüstü takımı testi ve kararlılık

- Terminal, Dosyalar, Ofis (Writer/Sheets/Slides/Notes/Organizer/PDF), Medya, Müzik, Sistem Bilgisi ve Kasa uçtan uca taranır: boş `onClick`, çalışmayan VFS okuma/yazma ve sahte veri bırakılmaz; veri yoksa dürüst "veri yok" kartı gösterilir.
- Pencere yöneticisi: küçült/büyüt/geri al, z-index sıralaması ve odak sırası tek kaynaktan yürütülür; küçültülen pencere sökülmez, arka planda çalışmaya devam eder.
- Otomatik testler: eş durumu sönümleme ve eşitlik kontrolü, `.tbapp` manifest/imza doğrulaması, `/appdata` izolasyonu ve VFS CRUD için birim testleri eklenir.

## Teknik notlar

- Yeni: `src/lib/shell/peer-status.ts`, `src/components/shell/PeerStatusIndicator.tsx`, `src/lib/apps/appdata.ts`, `src/apps/tbapp-signature.ts`.
- Güncellenecek: `ShellProvider.tsx`, `WorkspacePanel.tsx`, `SystemBar.tsx`, `ControlCenter.tsx`, `CommandCenter.tsx`, `Desktop.tsx`, `DesktopItem.tsx`, `AppsDialog.tsx`, `AppOfferHost.tsx`, `apps/tbapp.ts`, `apps/registry.ts`.
- `src/lib/vfs/store.ts` genel API'si değişmez; `/appdata` ayrı bir ad alanı olarak eklenir.
- Renkler yalnız `--tb-*` değişkenlerinden okunur, CDN bağımlılığı eklenmez.
- Kapılar: `bunx tsgo --noEmit`, `bunx vitest run`, ofis paketi ve ISO web çıktısı doğrulaması.
