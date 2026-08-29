# Küresel PWA Konumlandırma & Otomatik Cihaz Tespiti

Uygulama, WebOS ana sayfasından açılan bir modül gibi davranacak; mobil cihazlar listede telsiz yerine kendi telefon kimlikleriyle görünecek.

## 1. PWA kök başlangıcı

Manifest dosyası `public/manifest.webmanifest` (proje `manifest.json` kullanmıyor).
- `start_url`: `/chat` → `/` (WebOS ana ekranı).
- Kısayollar korunur: Sohbet (`/chat`), Saha, Demo, Pilot panosu — böylece ana ekrandan doğrudan sohbete girmek isteyen kullanıcı kısayolu kullanabilir.

## 2. Akıllı oturum yönlendirmesi

`src/components/chat/ChatApp.tsx` içinde, yerel oturum kontrolü (`src/lib/chat/local-auth`) zaten katılım ekranını belirliyor. Buna ek olarak:
- Oturum doğrulanmışsa akış aynı kalır (doğrudan sohbet).
- İlk kez giriliyorsa, "Numaranızla katılın" kartının üstüne marka başlığı eklenir: sol ok ikonu + `TB` marka işareti + "Tedbirge® WebOS Ana Sayfası" bağlantısı (`/`). Bağlantı `<Link to="/">` ile verilir.

## 3. Otomatik mobil cihaz algılama

`src/lib/identity/device.ts` iPhone/iPad/Android'i zaten User-Agent'tan ayırt ediyor; etiketler sadeleştirilir:
- `iPhone`, `iPad`, `Android` (bugün "Android Telefon"), `Android Tablet`.
- Bilinmeyen mobil dokunmatik cihazlar için `browser` yerine `mobile` çıkarımı (maxTouchPoints + kaba UA kontrolü).

El sıkışma (`src/lib/chat/name-exchange.ts`) hâlihazırda bağlantı anında `{ device, kind }` yayınlıyor — değişiklik gerekmiyor; yalnız gelen `kind` verisi karşı ekranda doğru ikona bağlanacak.

## 4. Liste ikonu düzeltmesi (telsiz yerine telefon)

`src/components/chat/PeerRow.tsx` şu an `relay` bayrağı varsa cihaz türünü yok sayıp `Radio` (telsiz) ikonu çiziyor. Bu nedenle röle üzerinden gelen bir iPhone telsiz görünüyor.
- İkon her zaman cihaz türünden seçilir (mobile → `Smartphone`, tablet → `Tablet`, desktop → `Monitor`, aksi halde `Globe`).
- Röle bilgisi, ikonun köşesindeki küçük bir `Radio` rozeti + mevcut "Röle" mikro etiketi olarak kalır.
- Cihaz türü henüz bilinmiyorsa `Globe` yedeği sürer.

`src/components/Messenger.tsx` içindeki eş üretiminde `kind` yedeği `getPeerIdentity(...).kind ?? "browser"` olarak kalır; ad beyanı geldiği anda liste `onPeerIdentity` aboneliğiyle tazelenir.

## 5. Takma ad önceliği

`peerDisplayLabel` sırası zaten **takma ad → beyan → cihaz etiketi → yedek**. Kalem ikonuyla verilen ad `localStorage`'da saklanıp `iPhone (#BD9)` yerine gösterilmeye devam eder. Ek iş gerekmiyor; yalnız doğrulanır.

## Doğrulama

- `bunx tsgo --noEmit` → 0 hata.
- Derleme günlüğü temiz.
- Önizlemede: mobil UA ile `/chat` açıldığında kendi satırın "iPhone/Android" görünür; masaüstünde röleli eş telefon ikonuyla listelenir.
