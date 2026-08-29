# Küresel P2P/Mesh UX & İnsan Dostu Kimlik

Katılımcı paneli, Meshtastic/Briar/Berty kalıplarına göre yeniden kurgulanır: teknik kimlikler geri plana çekilir, her eş adlandırılabilir olur ve tek tıkla mesaj/arama başlar.

## 1. Yerel eş takma adı (rehber)

Yeni `src/lib/identity/peer-nickname.ts`:
- `getNickname(nodeId)` / `setNickname(nodeId, name)` / `clearNickname(nodeId)` — `localStorage` (`tedbirge.peer.nickname`), SSR güvenli (`typeof window` kontrolü) ve abonelik (`onNickname`) ile.
- `peerDisplayLabel` çözümleme sırası güncellenir: **takma ad → ad kanalı/beyan → cihaz etiketi → `Ağ Cihazı (#5AC)`**.

## 2. Katmanlı katılımcı listesi

`src/components/Messenger.tsx` içindeki "Katılımcılar" kartı iki gruba ayrılır:
- **Rehberiniz** — takma adı verilmiş ya da ad beyanı gelmiş eşler (+ "Bu cihaz" en üstte).
- **Çevredeki cihazlar** — henüz adlandırılmamış eşler.

Grup başlıkları küçük, silik etiketlerdir; boş grup hiç render edilmez.

## 3. Kart tasarımı

Her satır yeni `src/components/chat/PeerRow.tsx` bileşeniyle çizilir:
- Solda cihaz türüne göre renkli mikro ikon (masaüstü / mobil / tablet / röle / tarayıcı).
- Birincil metin: insan dostu ad. İkincil: silik `#5AC` rozeti (metin `NODE_B32` hiç geçmez).
- Bağlantı kalitesi: `1 sıçrama` yerine 3 çubuklu minimal sinyal göstergesi + "Doğrudan Bağlı" / "Röle" mikro etiketi; ayrıntı yalnız tooltip'te.
- Sağda aksiyonlar: **Mesaj**, **Ara**, **Yeniden adlandır** (adsız eşlerde kalem/UserPlus vurgulu). Masaüstünde hover ile belirir, dokunmatikte hep görünür.
- Yeniden adlandırma satır içi küçük bir input ile yapılır (Enter kaydeder, Esc iptal).

## 4. Tek tıkla iletişim

- **Mesaj**: sohbet sekmesine geçer ve mesaj kutusuna odaklanır, seçili eş üst bilgide gösterilir.
- **Ara**: mevcut `inCall` akışını hedef eşle başlatır; orta sohbet alanı yumuşak geçişle **Video/Ses Sahnesi**'ne dönüşür (yerel + uzak akışlar, mikrofon/kamera/bitir kontrolleri). Arama bitince aynı yumuşak geçişle mesaj görünümüne döner.

## 5. Boş durum ve güvenlik

- Tek cihaz varken: nabız animasyonlu "Ağ taranıyor, yeni cihazlar otomatik eklenecek" kartı (mevcut rozetin yerine).
- Tüm `navigator` / `localStorage` okumaları hydrated bayrağı ya da `typeof window` arkasında.

## Doğrulama

- `bunx tsgo --noEmit` → 0 hata.
- Derleme günlüğü temiz; önizlemede tek cihaz ve iki cihaz senaryosu kontrol edilir.
