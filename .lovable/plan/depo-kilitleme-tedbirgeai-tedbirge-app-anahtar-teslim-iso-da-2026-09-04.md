# Depo Kilitleme (tedbirgeai/tedbirge.app) + Anahtar Teslim ISO Dağıtımı

Tüm depo, alan adı ve indirme yolları tek doğruluk kaynağına bağlanır: **tedbirgeai/tedbirge.app** ve **https://tedbirge.app**.

## 1. Eski depo izlerinin temizliği

`aetheris` adı yalnızca iki yerde kaldı; ikisi de yeni depoya sabitlenir:
- `src/lib/iso-release.ts` — varsayılan depo `tedbirgeai/tedbirge.app`
- `src/routes/api/public/iso.ts` — sunucu tarafı varsayılan depo aynı değere çekilir

Depo adı tek yerde tanımlanır (`iso-release.ts`), API rotası aynı değeri okur; ileride ikinci bir yerde elle güncelleme gerekmez.

## 2. CI/CD: otomatik ISO derleme (.github/workflows/build-iso.yml)

- Tetik: `main` push, `v*` etiketi/sürüm, elle çalıştırma (mevcut yapı korunur).
- Eklenecek adım: **Rust Wasm çekirdeği CI'da derlenir** (`rustup target add wasm32-unknown-unknown` + mevcut `scripts/build-kernel.sh`), çıktı `public/kernel/` altına yazılır ve web paketi ondan sonra derlenir. Böylece imaj içindeki çekirdek her zaman güncel kaynaktan üretilir; depoya elle konmuş ikili dosyaya bağımlılık kalmaz.
- Alpine konteynerinde (`alpine/ci-build.sh`) nginx + Chromium kiosk + WebOS paketi ile `tedbirge-webos-<sürüm>-x86_64.iso` üretilir.
- Çıktı adı sabitlenir: sürümsüz `tedbirge-webos-x86_64.iso` kopyası da Release'e eklenir, böylece indirme bağlantısı sabit kalır.
- Yayın hedefi: aynı depodaki GitHub Releases (etiketli sürüm) ve `latest` ön-sürümü. 100 MB altındaki veya üretilememiş imaj yayınlanmaz.
- Geliştiricinin yerel makinesinde Docker/WSL gerekmez; `scripts/build-iso.sh` yalnızca isteğe bağlı geliştirici aracı olarak kalır ve dosya başında bu şekilde etiketlenir.

## 3. GRUB menüsü ve Türkçe disk yükleyici

- `alpine/boot/grub.cfg` ve `syslinux.cfg` iki girişe sadeleştirilir (kurtarma konsolu üçüncü giriş olarak kalır):
  1) Tedbirge® WebOS (Canlı — Live Kiosk)
  2) Tedbirge® WebOS (Diske Kur — Otomatik Kurulum)
- Yeni `scripts/setup-tedbirge-disk.sh`: hedef diski otomatik seçer (tek disk varsa doğrudan, birden fazlaysa Türkçe liste), EFI (FAT32) + ext4 bölümlemesi yapar, WebOS dosya sistemini ve nginx/kiosk yapılandırmasını diske yazar, GRUB'u kurar ve **"Kurulum tamamlandı, USB'yi çıkarıp bilgisayarı yeniden başlatın."** uyarısı verir. Silme öncesi açık Türkçe onay istenir; onay yoksa canlı moda döner.
- Mevcut `alpine/install/tedbirge-kurulum.sh` bu betiği çağıran ince sarmalayıcıya indirgenir; betik ISO içine kopyalanır (`alpine/ci-build.sh` payload adımına eklenir).

## 4. Markalama ve alan adı

- `src/lib/site.ts` varsayılanı `https://tedbirge.app` olur (`VITE_SITE_URL` yine geçersiz kılabilir).
- Tüm rotalarda canonical, `og:url`, `og:site_name` ("Tedbirge® WebOS"), `twitter:card`/`twitter:title` alanları bu adrese göre üretilir (`siteUrl()` üzerinden, elle yazılmış adresler kaldırılır).
- `public/manifest.webmanifest`: `id`, `start_url`, `scope` aynı kalır (göreli), ad/açıklama `tedbirge.app` markasıyla eşitlenir.
- Geliştirici dokümantasyonu ve SDK çıkışları: `src/lib/site.ts` içine `DEV_PORTAL_URL = https://tedbirge.dev` eklenir; "SDK / Geliştirici portalı" bağlantıları oraya gider. Site içi doküman sayfası (`/dokumanlar`) korunur ve dahili gezinme için kullanılmaya devam eder.

Not: `tedbirge.app` ve `tedbirge.dev` henüz Lovable projesine bağlı değil. Adresler koda işlenir ama site yalnızca alan adları Proje Ayarları > Alan Adları bölümünden bağlandıktan sonra bu adreslerden yayına girer.

## 5. Doğrudan ISO indirme

- `/api/public/iso` sırası: `VITE_ISO_DOWNLOAD_URL` → `tedbirgeai/tedbirge.app` Releases API'sinde en güncel `.iso` → yoksa 503 ve "imaj hazırlanıyor" mesajı (sahte dosya üretilmez).
- `src/components/shell/BareMetalIso.tsx` ve masaüstündeki tüm "İndir" düğmeleri tek rotayı kullanır; sürüm, boyut ve SHA-256 gösterilir, hazır değilse Türkçe bilgilendirme çıkar.
- `ISO.md` yeni depo adresi ve tek akış (indir → Rufus/BalenaEtcher ile USB → başlat) ile güncellenir.

## Teknik notlar

- ISO bu ortamda derlenmez; ilk gerçek imaj kod `tedbirgeai/tedbirge.app` deposuna gidince GitHub Actions'ta üretilir (Actions izni `contents: write` açık olmalı).
- Uygulama kodu, Wasm çekirdeği, VFS ve pencere yöneticisi mantığı değişmez; iş dağıtım, marka ve yapılandırma katmanındadır.
- Teslimden önce `bunx tsgo --noEmit` ve mevcut test paketi çalıştırılır.
