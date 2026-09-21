# Tedbirge® WebOS — Derleme Kılavuzu

Yedi hedef vardır. Her hedefin betiği araç zinciri eksikse açık bir mesajla durur; sahte başarı üretmez.

| Hedef | Çıktı | Komut |
| --- | --- | --- |
| Tedbirge WebOS PWA | `dist/` | `bun run build:pwa` |
| Windows | `.exe` (NSIS) | `bun run build:desktop windows` |
| macOS | `.dmg` | `bun run build:desktop macos` |
| Linux | `.AppImage` | `bun run build:desktop linux` |
| Android | `.apk` | `bun run build:android` |
| iOS | `.ipa` | `bun run build:ios` |
| Bare-metal | `.iso` | `bun run build:iso` |

Hangi hedefin bu makinede üretilebildiğini görmek için: `bun run build:all`
Belirli hedefleri derlemek için: `bash scripts/build-all.sh --run pwa linux`

## Gerekli araçlar

- **PWA:** bun. Servis çalışanı yalnız yayınlanmış sitede kayıt olur; önizlemede devre dışıdır.
- **Masaüstü (Windows/macOS/Linux):** Rust (`rustup`) ve Tauri CLI. Yapılandırma `build/tauri.conf.json`. Linux'ta ek olarak `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`. `.dmg` yalnız macOS'ta, `.exe` yalnız Windows'ta (ya da mingw-w64 ile) üretilir.
- **Android:** Android SDK (`ANDROID_HOME`), JDK 17, bir kez `bunx cap add android`.
- **iOS:** macOS + Xcode 15+, CocoaPods, bir kez `bunx cap add ios`.
- **ISO:** Docker ya da GitHub Actions (`build-iso.yml`); `live-build` ve `xorriso` izole ortamda çalışır.

## İmza anahtarları (GitHub Actions sırları)

| Hedef | Sır |
| --- | --- |
| Android | `ANDROID_KEYSTORE`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| iOS | `APPLE_TEAM_ID` (+ sertifika ve provisioning profile) |
| Windows | Authenticode sertifikası (isteğe bağlı) |
| macOS | `APPLE_CERTIFICATE`, `APPLE_ID` (notarization, isteğe bağlı) |

Sır yoksa: Android imzasız debug paketi, iOS yalnız `.xcarchive` üretir. Bu durum betik çıktısında açıkça yazılır.

## CI

`.github/workflows/packages.yml` — etiket (`v*`) ya da elle tetikleme ile çalışır; her hedefin çıktısı Actions artefaktı olarak yüklenir. ISO iş akışı ayrıdır ve bu iş akışından etkilenmez.

## Gerçeklik köprüsü (C-ABI)

Masaüstü ve bare-metal paketleri `/run/tedbirge/tedbirge_truth.sock` soketini kullanır; başlık dosyası `src/lib/axiom/sdk/tedbirge_truth.h`. Tarayıcı ortamında istemci otomatik olarak `wss://tedbirge.dev/ws` yedeğine geçer. Sunucu yoksa arayüz "sunucu bekleniyor" yazar ve doğrulama yerel motorda sürer.
