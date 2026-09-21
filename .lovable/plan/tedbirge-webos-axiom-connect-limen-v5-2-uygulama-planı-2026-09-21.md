# TEDBİRGE® WEBOS, AXIOM, CONNECT & LIMEN — V5.2 Uygulama Planı

## Kapsam ilkesi
- Statik tanıtım sayfası üretmeyeceğim; mevcut çalışan WebOS kabuğu, uygulama pencereleri ve arayüz bileşenleri güncellenecek.
- Masaüstü, başlatıcı, Connect, AXIOM, Yönetim Portalı ve MCP yüzeyleri aynı uygulama deneyimi içinde çalışacak.
- Arayüzde sahte “kanıtlandı” beyanı gösterilmeyecek: gerçek yerel doğrulama çıktısı yoksa mühür/kanıt durumu dürüstçe ayrıştırılacak. “İskelet/taslak” gibi geçici ifadeler kaldırılacak.

## Faz 1 — Masaüstü ızgara refactor ve ikon standardı

### Dosya yapısı
- `src/components/shell/DesktopGrid.tsx` — yeni akış tabanlı masaüstü ızgarası.
- `src/components/shell/DesktopItem.tsx` — sabit 96 px ikon kartı ve iki satırlı güvenli etiket.
- `src/components/shell/Desktop.tsx` — mutlak konumlu ikon akışı kaldırılıp `DesktopGrid` bağlanacak.
- `src/components/shell/AppIconBadge.tsx` — istenen cam ikon kutusu ölçülerine uyarlanacak.
- `src/components/shell/app-icons.tsx` ve `BrandIcon.tsx` — yerel SVG marka ikonları ve yerleşik WebOS ikonları tek kaynaktan render edilecek.

### Uygulama adımları
1. Masaüstü simgeleri için `absolute`, `top`, `left`, elle sürüklenen ikon koordinatı ve çakışma üreten yerleşim yolunu masaüstü ana akışından çıkaracağım.
2. Masaüstü ana ızgarasında istenen sınıf düzenini birebir kullanacağım:
   ```text
   grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-8 gap-x-4 p-8 max-h-[calc(100vh-80px)] overflow-y-auto w-full items-start align-content-start
   ```
3. Her ikon kartını sabit `w-[96px]` yapacağım; etiketler `line-clamp-2`, `break-words`, `overflow-hidden` ile iki satırı aşmayacak.
4. Masaüstü sağ tık menüsü, çift tıkla açma, klavye ile açma, dosya kısayolları ve kilit rozeti korunacak.
5. TikTok, YouTube, Google, X, LinkedIn, GitHub, Spotify ve WhatsApp için CDN’siz yerel SVG marka ikonları kendi renkleriyle gösterilecek.
6. Yerleşik WebOS uygulamaları için beyaz tek tip kutu yerine cam yüzeyli, kategoriye göre ayırt edilebilir ikon seti kullanılacak.

## Faz 2 — Connect & LIMEN uygulama katmanı

### Dosya yapısı
- `src/components/connect/ConnectApp.tsx` — Connect için tek birleşik uygulama yüzeyi.
- `src/components/connect/ConnectSidebar.tsx` — Sohbetler / Aramalar & Toplantılar / Kişiler sol menüsü.
- `src/components/connect/MeetingRoom.tsx` — HD arama, toplantı araçları, ekran paylaşımı, el kaldırma.
- `src/components/limen/LimenApp.tsx` — P2P Code Forge uygulaması.
- `src/lib/limen/*` — yerel depo modeli, mesh eşitleme kuyruğu, GitHub ayna durum katmanı.
- `src/shell/installed.ts`, `src/components/shell/AppLauncher.tsx`, `src/components/shell/WorkspacePanel.tsx` — LIMEN kaydı ve pencere bağlama.

### Connect adımları
1. Mevcut sohbet ve arama motorları korunarak Connect için tek bir uygulama kabuğu oluşturulacak.
2. Sol menü üç ana bölüme sabitlenecek: Sohbetler, Aramalar & Toplantılar, Kişiler.
3. Sohbetlerde medya, belge, sesli not ve teslim durum simgeleri mevcut veri akışına bağlanacak; sessiz düşme olmaması için gönderim hataları görünür hale getirilecek.
4. Sohbet içi sağ üstten 1-e-1 HD arama başlatma, toplantı odası açma, mikrofon/kamera kapatma, ekran paylaşımı ve el kaldırma akışları aynı pencerede toplanacak.

### LIMEN adımları
1. Masaüstü, Dock/başlatıcı ve pencere yöneticisine “LIMEN” uygulaması eklenecek.
2. LIMEN, cihazdaki proje/depo özetlerini ve değişiklik kuyruklarını yöneten P2P Code Forge yüzeyi olarak çalışacak.
3. WebRTC mesh üstünden AXIOM düğümleri arasında depo delta eşitleme modeli kurulacak.
4. GitHub aynalama ekranı eklenecek; gerçek yetki/bağlantı yoksa “bağlanmadı” durumu gösterilecek, arka planda sahte başarı yazılmayacak.
5. “Otonom sentez” komutları uygulama içinde güvenli önizleme/öneri olarak hazırlanacak; kullanıcının açık onayı olmadan proje dosyalarına yazma yapılmayacak.

## Faz 3 — AXIOM canlı çekirdek, Yönetim Portalı ve MCP

### Dosya yapısı
- `src/components/axiom/AxiomApp.tsx` — terminal durumu, yeniden başlatma, doğrulama sonuçları.
- `src/lib/axiom/worker-client.ts` — Vite uyumlu worker başlatıcı korunacak.
- `src/lib/axiom/kernel.worker.ts` — boot/verify/analyze yanıtları canlı durumla uyumlu hale getirilecek.
- `src/lib/axiom/live/*` — yerel WASM oturumu, sağlık durumu, fallback ve timeout zinciri.
- `src/components/shell/apps/portal/MetricsPanel.tsx` — WebGL/topoloji paneli ve düğüm detayları.
- `src/components/shell/apps/portal/UsersPanel.tsx` — lisans/yetki mühür durumu ve offline lisans göstergeleri.
- `src/components/shell/apps/portal/LogsPanel.tsx` — milisaniyelik canlı kayıt akışı, arama, CSV/JSON export.
- `src/routes/dev.tsx` veya mevcut geliştirici portal rotası — 7 bölüm ve MCP bağlantı yüzeyi.
- `src/routes/api/v1/mcp/index.ts` ve mevcut verify uçları — JSON-RPC 2.0 MCP giriş noktası.

### AXIOM adımları
1. “İskelet / taslak / mock” kullanıcı metinleri AXIOM arayüzünden kaldırılacak.
2. Başlık durumu “AXIOM Kernel v12 — Active” çizgisine taşınacak; sonuç rozeti ise gerçek doğrulama çıktısına göre gösterilecek.
3. Worker başlatma `new Worker(new URL('./kernel.worker.ts', import.meta.url), { type: 'module' })` standardında kalacak.
4. Worker yüklenemezse kullanıcıya hata, ayrıntı ve yeniden başlatma düğmesi gösterilecek; uygulama çökmeden yerel doğrulama kapısına düşecek.
5. Yeniden başlatma düğmesi worker’ı, yerel belleği, bekleyen işleri ve son hata durumunu temizleyip canlı oturumu yeniden başlatacak.
6. Z3/Lean WASM ikilileri projede yoksa sahte mühür üretmeden yerel kural sonucunu gösterecek; gerçek ikililer eklendiğinde aynı arayüz 200_PROVEN ve mühür gösterecek.

### Yönetim Portalı adımları
1. “Ağ ve Ölçümler” sekmesine P2P topoloji görünümü eklenecek: kristal düğümler, paket akışı çizgileri ve tıklanabilir düğüm detay kartı.
2. “Kullanıcı ve Lisans” sekmesinde teknik jargon yerine E2EE, Sıfır-bilgi ve Doğrulanmış düğüm rozetleriyle yetki/lisans durumu gösterilecek.
3. “Kayıtlar” sekmesinde mevcut arama/filtre/export korunacak; canlı akış daha belirgin ve milisaniye zaman damgalı hale getirilecek.

### Geliştirici Portalı ve MCP adımları
1. `/dev` rotasında yedi bölümlü geliştirici portalı bağlanacak; içerik statik doküman sayfası gibi değil, kopyalanabilir uç nokta, durum ve SDK kartlarıyla çalışacak.
2. `/api/v1/mcp` JSON-RPC 2.0 uç noktası mevcut doğrulama MCP mantığına bağlanacak.
3. Claude, Gemini ve OpenAI gibi istemciler için tool/list ve tool/call yanıtları doğrulanacak.
4. MCP kapasite yanıtlarında “kanıtlar mühürlü” bilgisi gerçek WASM/mühür durumuna göre koşullu dönecek.

## Teknik notlar
- Mevcut pencere yöneticisinde akıllı cascade ve z-index normalizasyonu var; bu korunacak, LIMEN ve Connect pencereleri aynı yöneticiye eklenecek.
- Mevcut worker başlatıcı Vite uyumlu; çalışma, daha çok durum güvenilirliği, hata görünürlüğü ve yeniden başlatma davranışına odaklanacak.
- Arayüz renkleri `--tb-*` değişkenlerinden okunacak; CDN, uzak ikon servisi veya sabit dış kaynak kullanılmayacak.
- Gerçek Z3/Lean WASM ikilileri sağlanmadan “gerçek matematiksel kanıt üretildi” iddiası yapılmayacak.
- GitHub çift yönlü aynalama için kullanıcı bağlantısı/yetkisi yoksa sadece yerel kuyruk ve bağlantı bekleyen durum gösterilecek.

## Doğrulama
1. TypeScript kontrolü.
2. Vitest testleri; masaüstü ızgara, pencere, AXIOM doğrulama, MCP, Connect gönderim ve LIMEN kuyruk testleri.
3. Güvenlik invariant kontrolü.
4. Canlı önizlemede masaüstü 763×720, tablet ve geniş ekran kontrolleri.
5. AXIOM penceresinde worker başlatma, fallback, yeniden başlatma ve doğrulama sonucu kontrolü.
6. Connect’te sohbet, medya/sesli not düğmeleri, arama/toplantı araçları ve teslim durumlarının görünürlük kontrolü.
7. Yönetim Portalı sekmeleri, export düğmeleri ve topoloji etkileşimi kontrolü.
