# ISO Akışının Gerçekçi Mimariye Taşınması

Amaç: Windows'ta tek başına bootable Linux ISO üretilemediği gerçeğini kabul edip
kullanıcıyı çalışmayan betik döngüsünden çıkarmak. Hazır imaj varsa doğrudan indirilir,
yoksa dürüst iki seçenek sunulur.

## 1. Yapılandırılabilir uzak ISO adresi

- Yeni tekil kaynak: `src/lib/iso-release.ts`
  - `ISO_DOWNLOAD_URL = import.meta.env.VITE_ISO_DOWNLOAD_URL ?? ""` (GitHub Release / CDN)
  - `hasRemoteIso()` yardımcı fonksiyonu.
- `.env.example` içine `VITE_ISO_DOWNLOAD_URL=` satırı ve açıklama eklenir.
- Sunucu tarafı (`src/routes/api/public/iso.ts`):
  - `process.env.VITE_ISO_DOWNLOAD_URL` tanımlıysa istek 302 ile o adrese yönlendirilir.
  - Tanımlı değilse eskiden olduğu gibi yayın kökündeki `tedbirge-webos-v1.0-x86_64.iso`
    aranır; o da yoksa artık ZIP kiti otomatik dayatılmaz (aşağıya bakınız).
- `kur-indir.ps1` üretimi: `$Origin/...iso` yerine yapılandırılmış uzak adres kullanılır;
  adres yoksa betiğe hiç ISO indirme adımı yazılmaz, doğrudan paket indirme + rehber gösterilir.

## 2. Dürüst arayüz (fallback)

`src/components/shell/BareMetalIso.tsx` yeniden düzenlenir:

- Hazır ISO adresi **tanımlıysa**: buton doğrudan indirmeyi başlatır, mevcut USB yazdırma
  rehberi kartı açılır (Rufus / Ventoy / Etcher adımları korunur).
- Hazır ISO **yoksa**: buton indirme başlatmaz; şeffaf bir kart açılır:
  - Üstte tek cümlelik dürüst durum: "Hazır bare-metal imaj henüz yayında değil."
  - a) **Uygulamayı Cihaza Yükle (PWA)** — `promptInstall()` çağırır; mobil/tablet/PC'de
    anında çalışır. Desteklenmiyorsa iOS "Paylaş → Ana Ekrana Ekle" yönergesi gösterilir.
  - b) **Yerel ISO Derleme Rehberi** — geliştiriciler için: `wsl --install -d Ubuntu`,
    yeniden başlat, kurulum kitini indir (`/api/public/iso`), `bash` ile çalıştır.
    Kit indirme bağlantısı bu bölümün içinde kalır; varsayılan akış olmaktan çıkar.
- `startIsoDownload()` davranışı: uzak imaj yoksa sessiz indirme yerine bu karta yönlendirir.
  `InstallSystemButton`, `InstallAppButton`, `InstallAppCta` çağrıları PWA kurulumu
  başarısız olduğunda bu dürüst kartı açacak şekilde güncellenir (sahte indirme yok).

## 3. Standartlar ve doğrulama

- Tüm renkler `--tb-*` token'larından; dokunma hedefleri en az 48px (`min-h-12`).
- Kriptografi/jargon yok, mesajlar sade Türkçe.
- `bunx tsgo --noEmit` ve `bunx vitest run` sıfır hatayla çalıştırılır.

## Teknik notlar

- Değişen dosyalar: `src/lib/iso-release.ts` (yeni), `src/components/shell/BareMetalIso.tsx`,
  `src/components/shell/InstallSystemButton.tsx`, `src/components/chat/InstallAppButton.tsx`,
  `src/components/site/InstallAppCta.tsx`, `src/routes/api/public/iso.ts`, `.env.example`.
- Rust/kernel, pencere yöneticisi, VFS ve PWA önbellek katmanlarına dokunulmaz.
- `VITE_ISO_DOWNLOAD_URL` üretim ortamında tanımlandığı an, kod değişikliği olmadan
  gerçek imaj indirme akışı devreye girer.
