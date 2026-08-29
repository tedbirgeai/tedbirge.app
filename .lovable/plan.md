# WebOS UX İnsanileştirme, Titreme Engelleyici ve Sistem Sağlık Taraması

Sohbet/mesh arayüzünde üç iş: masaüstü kamera renk sapmasını kapatmak, teknik dili sıcak Türkçeye çevirmek, eş listesindeki titremeyi sıfırlamak. Sonunda uçtan uca sağlık taraması.

## 1. Masaüstü kamera akışı

`src/components/Messenger.tsx` içindeki yerel video kutusu:
- `<video>` üzerinde `filter`, `mix-blend-mode`, `backdrop-filter`, `opacity` katmanı bırakılmaz; sarmalayıcı kutudaki cam efekti (`backdrop-filter`, `src/styles.css`) video alanına sızmayacak şekilde izole edilir.
- Video elementi `transform: translateZ(0)` yerine sade bırakılır, `playsInline muted autoPlay` korunur; akış doğrudan `srcObject` ile bağlanır (ara canvas yok).
- Kamera kısıtları masaüstünde `width 1280 / height 720 / frameRate 30` ile sabit kalır; ek renk işleme eklenmez.

## 2. İnsan dostu metinler

Tek kaynak `src/lib/node-runtime.ts` içindeki `describeNode`:

| Eski | Yeni |
| --- | --- |
| Çalışıyor · eş aranıyor | Ağ Hazır · Çevredeki Cihazlar Aranıyor |
| Yerel keşif · kuyruk N | Özel Ağ · Cihaz Bağlantısı Bekleniyor |
| Bağlı · N eş | N Aktif Cihaz Bağlı |
| Düğüm kapalı | Ağ Kapalı |

- `src/components/chat/PeerRow.tsx`: "Röle" mikro etiketi ve tooltip → "Güvenli Aktarıcı"; doğrudan hat → "Doğrudan Güvenli Bağlantı".
- Sohbet üst barına (Messenger başlığı) bağlantı varken yumuşak nabız animasyonlu yeşil nokta + "Güvenli P2P Bağlantısı Aktif" rozeti; bağlantı yokken rozet gizlenir.
- Metin değişimi yalnız sohbet/mesh yüzeyinde; pazarlama sayfalarındaki hukuki "Röle beyanı" metinlerine dokunulmaz.

## 3. Titreme (re-render jitter) engelleme

- `PeerRow` → `React.memo`, satır anahtarı zaten `peer.id`; katılımcı listesi ayrı `ParticipantsList` bileşenine alınıp `React.memo` ile sarılır.
- Presence/peer güncellemeleri 300 ms trailing debounce ile UI'ya aktarılır (`Messenger.tsx` içindeki abonelik katmanı); değişmemiş listede state güncellemesi yapılmaz (imza karşılaştırması).
- Katılımcı satırlarına giriş/çıkış için `transition-all duration-300 ease-in-out` + `animate-fade-in`.

## 4. Sağlık taraması

- `bunx tsgo --noEmit` ve lint → 0 hata.
- WebRTC çağrılarındaki (`createOffer`, `setRemoteDescription`, `getUserMedia`, kanal `subscribe`) yakalanmamış promise reddetmeleri `guard()`/try-catch ile `src/lib/chat/errors.ts` günlüğüne bağlanır.
- `Messenger.tsx` ve ilgili kancalardaki `setInterval`, `addEventListener`, `MediaStream` track'leri `useEffect` cleanup'ında durdurulur; `node-runtime` zamanlayıcıları tek noktadan temizlenir.
- Playwright ile masaüstü + mobil emülasyon: kamera rengi, rozet metinleri ve liste titremesi ekran görüntüsüyle doğrulanır.

## Teknik notlar

Davranış değişikliği yok: sinyalleşme, kimlik ve şifreleme katmanlarına dokunulmaz; debounce yalnız görüntüleme katmanındadır, `presencePeerIds()` tek doğruluk kaynağı korunur.
