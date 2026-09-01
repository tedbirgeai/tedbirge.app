# Üst Bar Sağ Köşe Düzeni ve Kurulum Popup'ının Kaldırılması

## 1. Üst çubuk sağ köşe güvenli alanı

`src/styles.css` içindeki `.tbos-sysbar` kuralı, tarayıcı/PWA pencere kontrolleri için sağda güvenli boşluk bırakacak şekilde genişletilir:

- `padding-right: max(env(safe-area-inset-right), env(titlebar-area-x, 0px))` mantığıyla bir `--tbos-sysbar-pad-right` değişkeni tanımlanır.
- `display-mode: window-controls-overlay` ve `display-mode: standalone` medya sorgularında sağ boşluk artırılır (pencere düğmeleri ~140px), böylece sistem ikonları asla kapanma/küçültme düğmelerinin altında kalmaz.
- Çubuğa `-webkit-app-region: drag`, ikon grubuna `no-drag` verilerek PWA'da başlık çubuğu sürüklemesi ikon tıklamasını yutmaz.

## 2. İkon grubunun tıklanabilirliği ve dar ekran davranışı

`src/components/shell/SystemBar.tsx`:

- Sağdaki buton grubu `relative z-[90] shrink-0 pointer-events-auto` olur; her buton `shrink-0` alır.
- Saat yalnız `md` ve üstünde görünür; dar ekranda ikon grubu yatay taşmadan sığar.
- Dokunmatik hedefler dar ekranda 36px'e çıkarılır (`h-9 w-9 sm:h-7 sm:w-7`), metinli düğmeler dar ekranda ikona iner.

## 3. Kurulum talimat popup'ının silinmesi

`src/components/shell/InstallSystemButton.tsx`:

- Yönerge modal katmanı (`help` state, iOS/Chrome adım listesi) tamamen kaldırılır.
- Tıklamada doğrudan `promptInstall()` çağrılır. Yerel kurulum penceresi yoksa (iOS Safari, kurulum olayı gelmemiş) hiçbir baloncuk açılmaz; bunun yerine anında `/api/public/iso` indirmesi tetiklenir.

Aynı sadeleştirme, gereksiz ikinci bir katman olmaması için `src/components/chat/InstallAppButton.tsx` ve `src/components/site/InstallAppCta.tsx` dosyalarında da uygulanır (talimat modali kaldırılır, doğrudan kurulum/ISO aksiyonu).

`src/components/shell/BareMetalIso.tsx` içindeki `useIsoDownload` mantığı ortak kullanılabilir kalır; ISO rehber kartı yalnız açık ISO düğmesine basıldığında değil, hiç gösterilmeyecek şekilde ayrı bir sessiz indirme yardımcı fonksiyonuna (`startIsoDownload`) ayrılır.

## Teknik notlar

Değişecek dosyalar:
- `src/styles.css`
- `src/components/shell/SystemBar.tsx`
- `src/components/shell/InstallSystemButton.tsx`
- `src/components/shell/BareMetalIso.tsx`
- `src/components/chat/InstallAppButton.tsx`
- `src/components/site/InstallAppCta.tsx`

Doğrulama: `bunx vitest run` (66 test) ve tip denetimi temiz çıkacak; sağ üst köşe dar ekran ve PWA modunda görsel olarak kontrol edilecek.
