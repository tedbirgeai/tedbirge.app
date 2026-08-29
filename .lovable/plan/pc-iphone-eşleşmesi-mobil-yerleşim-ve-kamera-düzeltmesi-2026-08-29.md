# PC ↔ iPhone Eşleşmesi, Mobil Yerleşim ve Kamera Düzeltmesi

## Tespit edilen gerçek nedenler (kod okunarak doğrulandı)

1. **İki ayrı kimlik/keşif havuzu var.** Ağ motoru (`src/lib/browser-node.ts`) `tedbirge-mesh-v1` kanalında `getBrowserNodeId()` kimliğiyle presence yayınlıyor; sohbet ekranı ise `src/services/signaling.ts` içindeki ayrı bir `presence:tedbirge-signal` kanalını ve `NODE_xxxxxx` biçiminde bambaşka bir `localStorage` kimliğini dinliyor. İki liste hiçbir zaman örtüşmediği için karşı cihaz ya hiç görünmüyor ya "hayalet röle" satırı olarak beliriyor ve el sıkışma başlatılmıyor.
2. **Sinyal kanalı düşünce geri gelmiyor.** `CHANNEL_ERROR / TIMED_OUT / CLOSED` durumunda `cloudUp=false` yapılıyor ama yeniden abone olma yok; telefon ekranı kapanıp açıldığında düğüm kalıcı olarak "Yerel Mod"da kalıyor.
3. **Başarısız WebRTC denemesi tekrarlanmıyor.** `dialNewPeers` yalnız presence "sync" olayında çalışıyor; bağlantı `failed` olunca eş siliniyor ama yeniden aranmıyor.
4. **TURN tanımlı değil.** Yalnız Google STUN var; mobil operatör ağı ↔ ev interneti kombinasyonunda doğrudan hat çoğu zaman kurulamıyor, kullanıcıya da bunun yerine sessizce "Yerel Mod" gösteriliyor.
5. **Video kutusu sabit yükseklikte.** `Messenger.tsx` içinde çağrı sahnesi `maxHeight: 340` px ile açılıyor ve video `object-cover` ile kırpılıyor; mobilde görüntü kesiliyor, panel ekran dışına taşıyor.

## Yapılacaklar

### 1. Tek keşif havuzu (kritik ağ düzeltmesi)
- `src/services/signaling.ts` içindeki ikinci presence kanalı ve `getLocalPeerId()` kimliği kaldırılır; `subscribeLivePeers` doğrudan düğüm motorunun presence listesini yansıtacak şekilde `node-runtime` üzerinden beslenir. Böylece PC ve iPhone aynı kimlik uzayında (`tedbirge-mesh-v1`, oda: global mesh) buluşur.
- `Messenger.tsx` katılımcı listesi tek kaynaktan üretilir; sahte "röle · çevrimiçi" kopya satırları biter.
- Presence'te görülen her yeni kimlik için el sıkışma otomatik tetiklenir.

### 2. Kalp atışı, otomatik yeniden bağlanma ve TURN
- Kanal hatasında/kapanmasında üstel geri çekilmeli (2s → 5s → 10s, üst sınır 30s) yeniden abone olma eklenir.
- 5 saniyelik hafif bir tarayıcı ("dial") turu: presence'te olup bağlı olmayan veya `failed/disconnected` durumundaki eşler tekrar aranır; ilk 30 saniye agresif, sonrası seyrelir.
- `buildMeshIce` genişletilir: TURN ortam değişkeni varsa kullanılır, yoksa arayüzde "doğrudan hat kurulamadı, şifreli röle üzerinden bağlı" durumu net gösterilir (sessiz "Yerel Mod" yerine gerçek durum).
- Durum etiketi düzeltilir: eş presence'te görünüyor ama hat kurulmadıysa "Eş bulundu · bağlanıyor…" yazar.

### 3. Mobil yerleşim (iOS)
- Çağrı sahnesindeki sabit `340px` yükseklik kaldırılır; kutu `aspect-video` (mobilde `aspect-[4/3]`) esnek orana geçer, video `object-contain` olur — görüntü kırpılmaz.
- Ana çalışma alanı `min-h-0` + `overflow-y-auto` ile düzeltilir; sohbet, katılımcılar ve oturum panelleri mobilde ekran dışına taşmadan kaydırılır.
- Alt aksiyon çubuğu güvenli alan (`env(safe-area-inset-bottom)`) ile hizalanır.

### 4. Kamera renk/görüntü temizliği
- Video elemanına etki eden CSS kuralları gözden geçirilir (`.wa video { height: auto }` çakışması, `filter`/`backdrop-filter` mirası) ve video kapsayıcısı filtresiz, karışım modu olmayan sade bir katmana alınır.
- Video akışı Canvas'tan geçirilmez; doğrudan `srcObject` ile donanım hızlandırmalı çizim korunur (mesh topolojisi canvas'ı video ile ilgisiz, ona dokunulmaz).
- `getUserMedia` kısıtları netleştirilir: 1280×720 ideal, `facingMode: "user"`, renk dönüşümü yok.

### 5. Doğrulama
- `bunx tsgo --noEmit` 0 hata.
- Playwright ile iki ayrı tarayıcı bağlamı (biri mobil iPhone profili) aynı anda açılıp katılımcı listelerinde karşı düğümün belirdiği ekran görüntüsüyle kanıtlanır.
- Mobil viewport'ta (390×844) video kutusunun kesilmediği ve sayfanın kaydığı doğrulanır.

## Teknik notlar
- Dokunulacak dosyalar: `src/services/signaling.ts`, `src/lib/browser-node.ts`, `src/lib/node-runtime.ts`, `src/components/Messenger.tsx`, `src/styles.css`.
- Şifreleme, kimlik türetme ve store-and-forward kuyruğu değişmez; yalnız keşif/yeniden bağlanma katmanı ve sunum düzeltilir.
- TURN kimlik bilgisi gerekiyorsa gizli değer olarak eklenir; koda gömülmez.
