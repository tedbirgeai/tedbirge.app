# Tedbirge Web-OS — Zero-Touch Düğüm, Kör Aktarım ve Canlı Komut Merkezi

Mevcut P2P sohbet, WebRTC ve E2EE katmanına dokunmadan; otomatik düğüm başlatma, arka plan dayanıklılığı, kör aktarım ve gerçek veriyle beslenen bir komut merkezi tamamlanacak.

## Kod tabanında doğrulanan mevcut durum

- `src/lib/node-runtime.ts` düğümü yalnızca daha önce elle açılmışsa (`tedbirge.browser-node.auto === "1"`) başlatıyor. İlk ziyarette cihaz canlı düğüm olmuyor.
- `src/lib/pwa-install.ts` `beforeinstallprompt` olayını yakalıyor ve iOS tespiti yapıyor; ancak OS bazlı (Android/Windows/macOS) yönlendirme ve "yalnızca tarayıcıdayken göster" mantığı arayüze tam bağlı değil.
- `src/lib/browser-node.ts` ICE yapılandırmasını (`iceServers`, `iceTransportPolicy: "all"`) kuruyor; `src/lib/call/engine.ts` TURN sunucularını içeriyor. Symmetric NAT için peer-relay yolu Dijkstra motoruna otomatik devredilmiyor.
- `Navigator.locks` kod tabanında hiç kullanılmıyor; arka plan dayanıklılığı yalnızca `visibilitychange` dinleyicilerine bağlı.
- `src/components/shell/CommandCenter.tsx` içindeki telemetri kartları sabit değerler kullanıyor (ör. `18,420` aktif düğüm, `1.4 TB`, sabit OS dağılım yüzdeleri).
- `src/components/Dashboard.tsx` içinde sabit `NODES` dizisi ve `SIM_LOGS` simülasyon günlükleri var; radar ve log akışı kısmen gerçek olaylara bağlı.
- Eş limiti (`src/lib/peer-limit.ts`, `FREE_PEER_LIMIT = 5`) ana iş parçacığında uygulanıyor; `src/kernel/kernel.worker.ts` peer sayımı yapmıyor.

## Yapılacaklar

### 1. Zero-touch düğüm açılışı
- Uygulama açılır açılmaz düğüm ve DHT bağlantısı otomatik başlatılacak; "ağa katıl" onayı kaldırılacak. Kullanıcı isterse ayarlardan durdurabilecek (tercih kalıcı).
- Çekirdek (Wasm varsa Wasm, yoksa TS) açılışta hazır edilecek, hata durumunda sessiz düşüş korunacak.

### 2. Smart OS kurulum akışı
- OS tespiti (Android / iOS / Windows / macOS / Linux) tek bir yardımcı modülde toplanacak.
- "Uygulamayı Cihaza Yükle" yalnızca tarayıcı modunda görünecek, standalone modda gizlenecek.
- Android/masaüstünde tek tık `beforeinstallprompt`; iOS'ta Paylaş → Ana Ekrana Ekle yönergesi.

### 3. Kör aktarım (blind relay) ve store-and-forward
- Çevrimdışıyken üretilen şifreli `.tpack` zarfları IndexedDB kuyruğuna güvenle yazılacak (mevcut kuyruk sağlamlaştırılacak).
- İnternetli bir eş kapsama girdiğinde kuyruk otomatik olarak o eşe devredilecek.
- Aktarıcı cihaz zarfı açmadan (yalnızca yönlendirme başlığını okuyarak) küresel ağa iletecek; içerik çözme yolu kodla engellenecek.

### 4. Arka plan ve uyku direnci
- `Navigator.locks` ile uzun ömürlü çekirdek kilidi alınacak; Service Worker / Background Sync kayıtları tamamlanacak.
- Ön plana dönüş ve ağ değişiminde (`online`, `visibilitychange`, `Network Information`) kopan tüneller anında yeniden el sıkışacak (üstel geri çekilmeli hızlı yeniden bağlanma).

### 5. Symmetric NAT ve peer-relay fallback
- STUN/TURN zinciri doğrulanacak; ICE başarısızlığı ölçülebilir hale gelecek.
- Doğrudan bağlantı kurulamazsa Dijkstra motoru açık erişimli 3. bir düğümü kör aktarıcı olarak rotaya ekleyecek; veri şifreli halde o düğüm üzerinden gidecek.

### 6. Çekirdekte 5 eş limiti
- Aktif eş sayısı `kernel.worker.ts` içinde gerçek zamanlı izlenecek; 6. bağlantı denemesi çekirdek katmanında durdurulacak.
- Limit aşımında UI'ya olay düşecek ve `PaywallModal` (glassmorphic) açılacak: Kurumsal Lisans ve "Düğümleri Yönet" seçenekleriyle.

### 7. Gerçek verili komut merkezi
Tüm mock değerler kaldırılacak, kartlar canlı kaynaklardan beslenecek:
- Aktif düğüm sayısı → DHT/eş listesi
- OS bilgisi → gerçek cihaz tespiti
- Trafik sayaçları → gerçek gönderilen/alınan bayt
- CPU/RAM/ping → `performance.memory`, `hardwareConcurrency` ve ölçülen RTT (desteklenmeyen alan varsa "yok" gösterilir, uydurma değer üretilmez)
- Canlı akış görselleştirici gerçek eş listesine bağlanacak
- Adaptör şeması (Uygulama Verisi → Tedbirge OS Adaptörü → Transport Substrate) gerçek aktif taşıyıcıyı gösterecek

### 8. Node test ve gerçek log konsolu
- Sağ üstte "Interactive Node Test" butonu; mevcut URL'yi taşıyan QR modalı.
- Sağ panelde `HH:mm:ss.SSS` damgalı, kaydırılabilir, doğrudan çekirdek işçisinden akan gerçek log konsolu; simülasyon günlükleri kaldırılacak.

## Teknik notlar

- Dokunulacak başlıca dosyalar: `src/lib/node-runtime.ts`, `src/lib/browser-node.ts`, `src/lib/pwa-install.ts`, `src/kernel/kernel.worker.ts`, `src/kernel/kernel-worker-bridge.ts`, `src/lib/mesh/dht.ts`, `src/lib/mesh-routing.ts`, `src/components/Dashboard.tsx`, `src/components/shell/CommandCenter.tsx`, `src/components/shell/PaywallModal.tsx`, `src/components/shell/NodeTestModal.tsx`; yeni: OS tespiti, canlı metrik toplayıcı, blind-relay yardımcıları.
- Sohbet/WebRTC/E2EE dosyalarının mevcut sözleşmeleri değişmeyecek; yalnızca ek olay ve ölçüm noktaları takılacak.
- Ölçülemeyen metrik uydurulmayacak; tarayıcı desteklemiyorsa açıkça "yok" gösterilecek.
- Bitişte `tsgo --noEmit` ve derleme çıktısı 0 hata olarak raporlanacak.

## Kapsam dışı

- Ödeme/Paddle canlı entegrasyonu (yalnızca modal üzerinden yönlendirme).
- Barındırılan veritabanı duraklatılmış durumda; bulut rölesi bağımlı akışlar mevcut zarif düşüş davranışını koruyacak.
