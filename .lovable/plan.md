# İnsan Dostu Düğüm Kimliği (Auto-Identity + UX)

Teknik `NODE_B32` etiketleri yerine "Ahmet — Windows PC" gibi okunur adlar, cihaz ikonları ve anlaşılır durum metinleri.

## 1. Otomatik cihaz kimliği

Yeni `src/lib/identity/device.ts`:
- `detectDevice()` — `navigator.userAgent` / `userAgentData` üzerinden `{ kind: "desktop" | "mobile" | "tablet" | "browser", label: "Windows PC" | "iPhone" | "Android Telefon" | "Mac" | "Chrome Tarayıcı" }` üretir.
- `getDeviceName()` / `setDeviceName()` — kullanıcı düzenlemesi `localStorage` (`tedbirge.device.name`) içinde saklanır; boşsa otomatik etiket kullanılır.
- `getDeviceKind()` — ikon seçimi için.

`src/lib/chat/profile.ts` dokunulmaz kalır; görünen ad zaten `getAlias()` üzerinden gelir. İnsan dostu tam etiket: `alias — cihazAdı`, alias yoksa yalnızca cihaz adı.

## 2. Hızlı düzenleme alanı

`src/components/shell/NodeSettingsPanel.tsx` içindeki "P2P düğüm yapılandırması" bölümünün en üstüne kalem (pencil) ikonlu satır içi düzenleme:
- Görünen ad (alias) ve cihaz adı iki küçük input; kaydet/iptal.
- Kaydedince ad, mevcut ad-beyanı protokolüyle eşlere duyurulur.

## 3. Ad + cihaz yayılımı (eşlere)

`src/lib/chat/name-exchange.ts` içindeki `NameExchange` tipine isteğe bağlı `device?: string` ve `kind?: string` alanları eklenir; `name-req`/`name-res` yanıtlarında gönderilir ve gelen değer eş bazlı hafif bir haritada (`src/lib/identity/peer-identity.ts`) saklanır. Protokol geriye uyumlu: alan yoksa eski davranış aynen sürer.

## 4. Katılımcı listesi hiyerarşisi

`src/components/Messenger.tsx` (ve aynı kalıbı kullanan katılımcı kartları):
- Birincil satır: insan dostu ad (`Ahmet — Windows PC`).
- Yanında silik rozet: `#B32` (nodeId son 3 karakteri).
- Solda cihaz ikonu: Monitor / Smartphone / Tablet / Globe (lucide, mevcut ikon setinden).
- Kendi kartı: "Bu cihaz" rozeti.

## 5. Teknik ifadelerin sadeleşmesi

| Eski | Yeni | Tooltip |
|---|---|---|
| doğrudan P2P | Doğrudan bağlı | "Aynı yerel ağda aracı olmadan doğrudan bağlı" |
| röle üzerinden | Güvenli röle aktarımı | "Şifreli paketler bir ara düğüm üzerinden taşınıyor; içerik açılamaz" |
| sinyal kanalı · çevrimiçi | Güvenli röle aktarımı · çevrimiçi | aynı |
| N sıçrama | N adım | "Paket hedefe ulaşmadan önce N cihaz üzerinden geçiyor" |

Tooltip için mevcut `@/components/ui/tooltip` kullanılır; erişilebilirlik için `title` yedeği de bırakılır.

## 6. Geriye uyumluluk (0 fail)

- Adı bilinmeyen eş: `Ağ Cihazı (#B32)`.
- Cihaz bilgisi yoksa yalnızca ad; ad yoksa yalnızca cihaz; ikisi de yoksa fallback.
- SSR/hidrasyon güvenliği: `navigator` okuması `useEffect`/hydrated bayrağı arkasında.

## Doğrulama

- `bunx tsgo --noEmit` → 0 hata.
- Derleme günlüğü temiz.
- Önizlemede katılımcı kartında ad + `#XXX` rozeti + ikon ve tooltip'ler kontrol edilir.
