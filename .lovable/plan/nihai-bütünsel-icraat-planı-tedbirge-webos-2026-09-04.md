# Nihai Bütünsel İcraat Planı — Tedbirge® WebOS

## Önce dürüst durum tespiti (bu turda doğrulandı)

- Depo bağlantısı: projenin `origin` uzak deposu Lovable'ın dahili depo adresidir; `tedbirgeai/tedbirge.app` doğrudan buradan push edilemez. GitHub'a aktarım, projeye GitHub bağlantısı kurulduğunda otomatik iki yönlü eşitleme ile olur. Vercel derlemesi de bu push sonrası GitHub tarafında tetiklenir — bu ortamdan Vercel'e erişim yok.
- Marka izleri: kullanıcıya görünen metinlerde temiz; kalanlar yalnızca zorunlu altyapı kancaları (`src/integrations/lovable/index.ts` — Google girişi, `src/lib/pwa.ts` — önizleme tespiti, `src/lib/error-reporting.ts` — hata köprüsü, `package.json`/`vite.config.ts` paket adları). Bunlar kaldırılırsa giriş, PWA ve hata izleme kırılır.
- "Protokol" izleri: arayüzde görünen tek yer yok; kalanlar iç tip adı (`ProtocolLayer`), sekme anahtarı (`"protokol"`), bir kod yorumu ve `regulation.ts` içindeki resmî AFAD protokol belgesi başlığı (hukuki belge adı, marka değil).
- UTF-8 bozukluğu (`TedbirgeÂ®`): tarama sonucu 0 dosya — önceki turda giderilmiş.
- `permissions: contents: write` `build-iso.yml` içinde zaten var.

## Yapılacaklar

### 1. Marka ve adlandırma kapanışı
- İç adlandırmaları hizala: `ProtocolLayer` → `OsLayer`, sekme anahtarı `protokol` → `katmanlar`, `src/lib/protocol-layers.ts` → `src/lib/os-layers.ts`, kernel yorumundaki "Protokol sürümü" → "Sürüm".
- Üst bar ve kısa ad her yerde "Tedbirge® OS", resmî ad "Tedbirge® WebOS", satıcı "Mehmet DİNÇ (Tedbirge® WebOS)" olarak son bir taramayla doğrulanır.
- Geliştirici portalı bağlantıları (`DEV_PORTAL_URL`) yeni sekme + `rel="noopener noreferrer"` ile kontrol edilir.

### 2. Alan adı / CORS uyumu
- `src/lib/site.ts` ve `src/lib/cors.ts` yayın mimarisiyle eşitlenir: `tedbirge.app`, `www.tedbirge.app`, `tedbirge.dev`, `www.tedbirge.dev` + önizleme/Vercel hostları. Vercel önizleme dağıtımları için `*.vercel.app` kuralı doğrulanır.

### 3. Kurulum betiklerinde Türkçe rehberlik
- `scripts/setup-tedbirge-disk.sh` ve `alpine/install/tedbirge-kurulum.sh` adım numaralı, "ne oluyor / ne yapmalıyım" açıklamalı iletilerle genişletilir; her hata iletisine çözüm önerisi eklenir (disk bulunamadı, yazma korumalı, önyükleyici kurulamadı).

### 4. ISO derleme hattı
- `build-iso.yml` ve `alpine/ci-build.sh` gözden geçirilir: eksik paket, betik söz dizimi (`sh -n`), sabit adlı `tedbirge-webos-x86_64.iso` yayınının hem etiketli sürümde hem `latest` ön-sürümde üretildiği doğrulanır.

### 5. Mağaza / ödeme / lisans
- Mağaza "Abonelik" sekmesi ile profil lisans durumu tek akışta birleşir: ödeme sonrası lisans ve düğüm limiti anında tazelenir (`tedbirge:subscription-changed`).
- Katalogda yinelenen etkin fiyat kalmadığı yeniden doğrulanır. Canlı (live) ödeme, katalog yayında eşitlendiği için ancak yayına alma sonrası etkinleşir; önizlemede test ortamı çalışır.

### 6. Hata izi ve Sistem Bilgisi
- Kurulum/açılış betiklerindeki `/var/log/tedbirge/` ve günlük döngüsü korunur; "Sistem Bilgisi" ekranına son kayıtları gösteren bir "Kayıtlar" sekmesi eklenir (tarayıcıda uygulama içi hata kayıtları, kurulu sistemde dosya kayıtları).

### 7. Doğrulama
- `bunx tsgo --noEmit`, `bunx vitest run`, `sh -n` betik kontrolleri ve derleme kaydı temiz olacak.

## Sınırlar (bu ortamdan yapılamayan)
- GitHub'a push, Vercel dağıtımı tetikleme, Actions çalıştırma, ISO'yu USB'ye yazma. Bunlar için projenin GitHub bağlantısını kurmanız gerekiyor; sonrasında her değişiklik otomatik olarak depoya ve Vercel'e akar.
