# Mobil Navigasyon, Görüntülü Görüşme Yerleşimi ve Dinamik Cihaz Adı

Üç konu tek turda ele alınır. Kapsam arayüz ve sunum katmanı; şifreleme, kimlik ve mesaj taşıma mantığı değişmez.

## 1. Mobil navigasyon ve ana ekrana dönüş

Bugün mobilde açılan uygulama `MobileAppShell` içinde tam ekran gösteriliyor; yalnız sağ üstte bir kapatma düğmesi ve başlıktan aşağı kaydırma var. Yapılacaklar:

- Mobil başlık barının **soluna belirgin bir "←" (Ana ekran) düğmesi** eklenir (48px dokunma hedefi, `aria-label="Ana ekrana dön"`). Basınca pencere kapanır ve masaüstüne dönülür.
- Sağdaki **X düğmesi korunur**; her ikisi de `sticky`/`shrink-0` başlıkta her zaman görünür kalır, güvenli alan (`env(safe-area-inset-top)`) payı verilir.
- **Dock davranışı:** mobilde zaten açık ve önde olan uygulamanın simgesine tekrar dokunulunca pencere kapanır (masaüstüne dönüş). Masaüstünde mevcut odaklama davranışı aynen kalır.
- **Donanım geri tuşu:** pencere açıldığında tarayıcı geçmişine bir katman itilir; Android geri tuşu / kenar jesti uygulamayı kapatır, siteden çıkarmaz.
- Mobil kabuk arka planına (başlık üstü boşluk) dokunma da kapatır.

## 2. Görüntülü görüşme: akış ve mobil yerleşim

- **Uzak video bağlanması:** `Messenger.tsx` içinde uzak akış yalnız `activePeer` seçiliyken okunuyor. Etkin çağrıda eş seçili değilse motorun bildirdiği ilk canlı akışa otomatik bağlanılır; `srcObject` atandıktan sonra `play()` denenip iOS'un otomatik oynatma reddi sessizce yutulmaz, "Dokunarak başlat" örtüsü gösterilir.
- Uzak `<video>` `muted={false}` olarak açık kalır ve `object-contain` ile kırpılmadan gösterilir; akış geldiğinde durum metni ("bağlanıyor…") kaybolur.
- Akış sürüm sayacı (`streamVersion`) yanında **eş bağlantı durumu değişimlerinde de yeniden bağlama** yapılır, böylece yeniden pazarlık (renegotiation) sonrası kutu boş kalmaz.
- **Mobil yerleşim:** çağrı sahnesindeki sabit `max-h-[70vh]` sınırı mobilde kaldırılır; çağrı alanı + katılımcı listesi `flex-1 overflow-y-auto` kapsayıcıya alınır ve alt dock için `pb-24` (+ `env(safe-area-inset-bottom)`) payı verilir. Kutular mobilde tek sütun, ≥sm'de iki sütun.
- Katılımcı listesi mobilde kendi kaydırma alanında kalır; ekran altında kesilmez.

## 3. Cihaz tipine göre dinamik adlandırma

- `src/lib/identity/device.ts` içine `deviceScopeLabel()` eklenir: mobil → "Cihazım", tablet → "Tabletim", masaüstü/laptop → "Bilgisayarım". Tespit `detectDevice()` + ekran genişliği ile yapılır.
- Bu etiket şu noktalara bağlanır: masaüstü/dock ikon adı (`src/shell/installed.ts` kaydı çalışma anında etiketlenir), pencere başlığı (`WorkspacePanel` başlık tablosu), uygulama içi başlık (`ComputerApp`), Spotlight araması ve mağaza/uygulama listesi.
- Etiket ekran boyutu değişince (döndürme, pencere boyutu) güncellenir.

## Teknik notlar

Dokunulacak dosyalar: `src/components/shell/WorkspacePanel.tsx`, `src/components/shell/Dock.tsx`, `src/shell/windows.ts` (geri tuşu için küçük yardımcı), `src/components/Messenger.tsx`, `src/lib/identity/device.ts`, `src/shell/installed.ts`, `src/components/shell/apps/ComputerApp.tsx`, `src/styles.css`.

Doğrulama: `bunx tsgo --noEmit`, `bunx vitest run` ve mobil görünümde (390×844) Playwright ile ana ekrana dönüş + çağrı alanının kaydırılabilirliği ekran görüntüsüyle kanıtlanır.
