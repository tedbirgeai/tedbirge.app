# Faz 6 Planı: Tedbirge WebOS, AXIOM & Connect V5 Birleşik Üretim Sürümü

## Amaç
Tedbirge® WebOS içinde üç ana modülü tek masaüstü deneyimine yerleştirmek:

1. AXIOM doğrulama terminali
2. Tedbirge Connect sohbet / dosya / sesli mesaj
3. Tedbirge Connect HD arama / toplantı

Buna ek olarak masaüstü ikonlarını, görev yöneticisini, tedbirge.dev geliştirici portalını ve yönetim portalını V5 üretim standardına taşımak.

## Dürüstlük sınırları
- Gerçek Z3 / Lean 4 WASM ikilileri depoda yoksa AXIOM kararları mevcut simülasyon motoruyla işaretli kalacak; arayüz bunu saklamayacak.
- Gerçek ödeme, gerçek hakem ağı, gerçek paket mağazası yayını ve fiziksel ISO/USB boot testi bu ortamda yapılamaz; yapılandırma ve yazılım kapıları doğrulanır.
- Harici marka ikonları CDN üzerinden çekilmeyecek; yerel SVG bileşenleri veya paketlenmiş vektörler kullanılacak.
- Arayüzde kriptografi jargonu gösterilmeyecek; kullanıcıya E2EE, Sıfır-bilgi ve Doğrulanmış düğüm rozetleri gösterilecek.

## Dosya yapısı

### 1. WebOS üçlü ana uygulama yapısı
```text
src/shell/installed.ts                         # AXIOM, Connect Sohbet, Connect Toplantı ana modül kayıtları
src/shell/xdg.ts                               # XDG kategori eşlemeleri
src/components/shell/AppLauncher.tsx           # Üç ana modül öne çıkan grid + modern ikon kartları
src/components/shell/Taskbar.tsx               # Açık ana modüller ve durum rozetleri
src/components/shell/WindowSwitcher.tsx        # Görev yöneticisi görünümü
src/components/shell/DesktopItem.tsx           # İkon boyutu, etiket, safe-area uyumu
src/components/shell/app-icons.tsx             # Yerel marka SVG + premium WebOS ikonları
src/components/shell/AppIconBadge.tsx          # E2EE / Sıfır-bilgi / doğrulanmış düğüm rozetleri
```

### 2. AXIOM V5 sunumu
```text
src/components/axiom/AxiomApp.tsx              # Konsol sekmesi içinde V5 özet durum ve doğrulama akışı
src/components/axiom/ProofViewer.tsx           # STATUS: 200_PROVEN mühür kartı ve adım görünümü
src/components/axiom/CanvasPerformanceCard.tsx # WebGL/canvas durumu, FPS ve DOM yük göstergesi
src/lib/axiom/verify/*                         # Mevcut doğrulama motoru korunarak V5 etiketleri
```

### 3. Tedbirge Connect sohbet / WhatsApp benzeri modül
```text
src/components/chat/ChatApp.tsx                # Sohbet üst barı, medya ve arama girişleri
src/components/chat/MessageComposer.tsx        # Metin, belge, resim/video ve bas-konuş kontrolleri
src/components/chat/DeliveryTicks.tsx          # Gönderildi / İletildi / Okundu ikonları
src/components/chat/VoiceNoteRecorder.tsx      # Bas-konuş ses kaydı
src/components/chat/MediaAttachmentSheet.tsx   # Resim, video, belge seçimi
src/lib/chat/delivery.ts                       # Teslim durumu ve retry modeli
src/lib/chat/offline-queue.ts                  # Çevrimdışı şifreli kuyruk simülasyonu / mevcut kuyrukla bağ
```

### 4. Tedbirge Connect HD arama / toplantı modülü
```text
src/components/call/CallControls.tsx           # Mikrofon, kamera, ekran paylaşımı, el kaldırma
src/components/call/MeetingRoom.tsx            # Çoklu oda görünümü ve canlı sohbet alanı
src/components/call/MeetingLinkDialog.tsx      # Toplantı kodu/link paylaşımı
src/components/call/ParticipantGrid.tsx        # Katılımcı yerleşimi
src/components/call/InCallChat.tsx             # Oda içi canlı sohbet
src/lib/call/rooms.ts                          # Oda kodu, katılımcı, davet ve durum modeli
src/lib/call/meeting-state.ts                  # UI state ve mevcut WebRTC motoruyla köprü
```

### 5. tedbirge.dev geliştirici portalı
```text
portal/src/content.tsx                         # 8 bölüm: Başlangıç, SDK, Zarf, Yönlendirme, Rust-Wasm, API, Sürüm, MCP
portal/src/App.tsx                             # Sol navigasyon / arama / bölüm görünümü gerekiyorsa düzenleme
portal/src/styles.css                          # Portal V5 görünümü ve token uyumu
portal/README.md                               # Yayın ve bölüm haritası
```

### 6. Yönetim portalı üç ana sekme
```text
src/components/shell/apps/AdminConsole.tsx     # 3 ana sekme kabuğu: Ağ ve Ölçümler, Kullanıcı ve Lisans, Kayıtlar
src/components/shell/apps/portal/MetricsPanel.tsx
src/components/shell/apps/portal/TopologyPanel.tsx
src/components/shell/apps/portal/LicensePanel.tsx
src/components/shell/apps/portal/TelemetryLogsPanel.tsx
src/components/shell/apps/portal/export.ts     # CSV / JSON dışa aktarma
src/components/shell/apps/portal/topology.ts   # Kristal düğüm ve lazer paket akışı modeli
```

### 7. Test ve doğrulama
```text
src/shell/__tests__/v5-apps.test.ts
src/components/chat/__tests__/delivery.test.ts
src/lib/call/__tests__/rooms.test.ts
src/components/shell/apps/portal/__tests__/portal-export.test.ts
portal/src/__tests__/content.test.ts
```

## Bileşen mimarisi

### Masaüstü
- `installed.ts` uygulama kataloğu üç ana ürünü net gösterir: AXIOM, Connect Sohbet, Connect Toplantı.
- `AppLauncher` içinde bu üçlü üstte öne çıkar; diğer araçlar altında kalır.
- `app-icons.tsx` iki ikon ailesi sunar:
  - Harici uygulamalar: yerel SVG marka amblemleri.
  - WebOS uygulamaları: cam/neomorphic sistem ikonları.
- `Taskbar` ve `WindowSwitcher`, açık pencerelerde uygulama türünü ve güven rozetlerini gösterir.

### AXIOM
- Mevcut worker/fallback doğrulama zinciri korunur.
- Kullanıcıya “200_PROVEN” yalnız gerçekten kanıtlanmış sonuçta gösterilir.
- WebGL/canvas performans kartı AXIOM içinde görünür; 120 FPS hedefi “hedef/ölçülen” olarak ayrılır.

### Connect Sohbet
- Mevcut sohbet motoru korunur, sadece kullanıcı deneyimi V5 standardına yükseltilir.
- Gönderim durumu karmaşık teknik metin yerine üç sade durum ikonu ile gösterilir.
- Bas-konuş, medya ve belge kontrolleri tek besteci alanında toplanır.
- Çevrimdışı kuyruk başarısız mesajları sessiz düşürmez; durum ve yeniden deneme görünür olur.

### Connect Toplantı
- Mevcut arama motoru üzerine oda modeli eklenir.
- Sohbet içinden 1-e-1 ses/video arama başlatılır.
- Toplantı odası ekranında katılımcılar, ekran paylaşımı, mikrofon/kamera, el kaldırma ve oda sohbeti bulunur.
- Kamera/mikrofon izni yalnız kullanıcı butona bastığında istenir.

### Yönetim portalı
- Eski çok sekmeli idari yapı, istenen 3 ana sekmeye taşınır:
  1. Ağ ve Ölçümler
  2. Kullanıcı ve Lisans
  3. Kayıtlar
- Ağ sekmesi 2D/3D hissi veren canvas/WebGL topoloji görünümü, tıklanabilir düğüm kartları ve paket akışı içerir.
- Kayıtlar sekmesi milisaniyelik akış, filtre ve CSV/JSON dışa aktarma sunar.

### tedbirge.dev
- Portal içeriği 8 bölüme tamamlanır.
- `tedbirge.dev/mcp` için dokümantasyon ve mevcut `/api/public/v1/mcp/verify` eşlemesi açıklanır.
- SDK örnekleri Node, Python, Rust, Java, Go, C#, HDL ve C-ABI katmanlarıyla uyumlu hale getirilir.

## Uygulama adımları

1. Masaüstü uygulama kataloğunu V5 üçlü ana mimariye göre düzenle.
2. WebOS dahili ikonları için token tabanlı premium ikon kabuğu oluştur.
3. Harici marka ikonlarını yerel SVG vektörlerle değiştir; CDN kullanma.
4. App Launcher ve görev yöneticisinde AXIOM / Connect Sohbet / Connect Toplantı görünürlüğünü artır.
5. AXIOM ekranına V5 doğrulama, mühür ve performans özetini ekle; mevcut worker fallback akışını bozma.
6. Sohbet ekranına medya, belge, bas-konuş ve sade teslim ikonlarını bağla.
7. Toplantı odası ekranını ve sohbet içi arama düğmelerini mevcut çağrı motoruna bağla.
8. Yönetim portalını üç ana sekmeye indir; eski içerikleri uygun sekmelere taşı.
9. Ağ ve Ölçümler sekmesine canlı topoloji, tıklanabilir düğüm kartı, paket akışı ve ölçüm grafikleri ekle.
10. Kayıtlar sekmesine filtre, canlı akış ve CSV/JSON dışa aktarma ekle.
11. tedbirge.dev portalını 8 bölüme tamamla ve MCP ağ geçidi bölümünü ekle.
12. Paketleme yapılandırmalarını mevcut `BUILD.md`, `build/targets.json` ve GitHub paket akışıyla tutarlı kontrol et.
13. Testleri ekle/güncelle: uygulama kataloğu, ikon varlığı, teslim durumu, toplantı oda modeli, portal bölümleri, kayıt dışa aktarma.
14. Son doğrulama: tip denetimi, kod denetimi, testler, derleme, güvenlik denetimi ve tarayıcıda masaüstü/AXIOM/Connect/Yönetim/portal görünüm kontrolü.

## Kabul kriterleri
- Masaüstü, görev yöneticisi ve başlatıcıda üç ana modül net görünür.
- AXIOM kanıt kartı, simülasyon/kanıt ayrımını saklamadan gösterir.
- Sohbet modülünde medya, belge, sesli mesaj ve teslim ikonları görünür.
- Toplantı modülünde oda, link/kod, ekran paylaşımı, el kaldırma ve canlı sohbet görünür.
- Yönetim portalı tam olarak 3 ana sekme ile açılır.
- tedbirge.dev portalında istenen 8 bölüm yer alır.
- Tüm renkler `--tb-*` token sistemiyle uyumludur; CDN kullanılmaz.
- Test, derleme ve güvenlik kapıları yeşildir.
