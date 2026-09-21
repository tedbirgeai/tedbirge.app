# Faz 7 planı — AXIOM v12 canlı çekirdek ve üretim sertleştirmesi

## Kapsam ve net sınırlar

- AXIOM arayüzündeki eski “iskelet”, “mock”, “simülasyon” ve geçici faz metinleri temizlenecek.
- Kanıt ekranı sahte başarı üretmeyecek: gerçek motor yoksa “kanıtlandı” yerine motorun kullanılamadığı dürüstçe gösterilecek.
- CDN kullanılmayacak; worker, ikon ve varsa WASM dosyaları aynı kaynaktan, yerel paketle yüklenecek.
- Bu ortamda fiziksel cihaz/USB/ISO boot doğrulaması yapılamaz; web önizleme, build ve test kapıları doğrulanacak.
- Mevcut inceleme sonucu: `createAxiomWorker()` zaten Vite uyumlu `new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" })` kullanıyor; fakat doğrulama motoru halen `mockSolve()` çalıştırıyor, `/public/axiom` altında gerçek Z3/Lean WASM ikilisi görünmüyor ve AXIOM ekranında “iskelet/mock/simülasyon” metinleri duruyor.

## Dosya yapısı

```text
public/axiom/
  README.md                         # Yerel Z3/Lean WASM ikililerinin beklenen adları ve lisans notu
  z3.wasm                           # Varsa gerçek Z3 WASM ikilisi buradan yüklenir
  lean.wasm                         # Varsa gerçek Lean 4 WASM ikilisi buradan yüklenir

src/lib/axiom/live/
  engine-session.ts                 # Worker içinde tek canlı doğrulama oturumu
  wasm-runtime.ts                   # Same-origin WASM fetch/compile/instantiate katmanı
  z3-adapter.ts                     # AXIOM-IR -> SMT-LIB -> Z3 çağrı adaptörü
  lean-adapter.ts                   # AXIOM-IR -> Lean önerme/teorem denetim adaptörü
  fallback-verifier.ts              # Offline, deterministic yerel kural denetimi; sahte Z3/Lean diye sunulmaz
  proof-seal.ts                     # WebCrypto tabanlı mühür üretimi ve doğrulama
  engine-health.ts                  # Active / degraded / unavailable durum modeli

src/lib/axiom/
  kernel.worker.ts                  # Canlı daemon: boot/analyze/verify/stat/reset mesajları
  worker-client.ts                  # Vite worker başlatma, iframe/preview güvenli retry stratejisi
  local-kernel.ts                   # Sadece worker yasaksa “canlı yerel çekirdek” yedeği
  verify/engine.ts                  # Mock bağımlılığı kaldırılıp canlı motor zincirine bağlanır
  verify/types.ts                   # Engine/durum/verdict tipleri güncellenir

src/components/axiom/
  AxiomApp.tsx                      # Canlı durum, restart, bellek temizleme, hata/sağlık görünümü
  ProofViewer.tsx                   # Z3/Lean/yerel motor sonucu ve proof seal gösterimi
  MemoryProfiler.tsx                # Reset sonrası doğru RAM/iş kuyruğu durumu
  NodeStatusCard.tsx                # Çevrimiçi/offline/P2P durum rozetleri

src/lib/p2p/
  axiom-mesh.ts                     # WebRTC üzerinden doğrulama görevi yayınlama/alma
  axiom-offline-queue.ts            # Service Worker/IndexedDB destekli offline doğrulama kuyruğu

src/components/shell/
  app-icons.tsx                     # Profesyonel yerel WebOS ikon seti
  BrandIcon.tsx                     # Yerel marka SVG eşlemeleri
  AppIconBadge.tsx                  # Dock/masaüstü/başlatıcı boyut standardı
  WindowFrame.tsx                   # Focus/z-index entegrasyonu

src/shell/
  windows.ts                        # Deterministik cascade, boş alan seçimi, z-index normalizasyonu

src/lib/shell/
  desktop-layout.ts                 # Tek geçişli hydration validasyonu

src/lib/axiom/__tests__/
  axiom-live-engine.test.ts
  axiom-worker-restart.test.ts
  axiom-proof-seal.test.ts
  axiom-offline-queue.test.ts

src/shell/__tests__/
  windows.test.ts
```

## Bileşen mimarisi

```text
AxiomApp
  ├─ worker-client → kernel.worker.ts
  │    ├─ engine-session
  │    │    ├─ z3-adapter + wasm-runtime
  │    │    ├─ lean-adapter + wasm-runtime
  │    │    └─ fallback-verifier (offline yerel kural denetimi; Z3/Lean diye etiketlenmez)
  │    ├─ proof-seal
  │    └─ engine-health
  ├─ CommandBar
  ├─ ProofViewer
  ├─ MemoryProfiler
  ├─ NodeStatusCard
  └─ axiom-mesh + axiom-offline-queue
```

## Uygulama adımları

1. **AXIOM durum dili temizliği**
   - `AxiomApp`, `ProofViewer`, `verify/types`, SDK/CI metinleri ve test fixture’larında “mock”, “simülasyon”, “iskelet”, “henüz bağlı değil” gibi üretim dışı ifadeleri kaldır.
   - Görünür durumları şu çizgiye sabitle: “Faz 1 — Çekirdek Doğrulama Motoru Aktif (Çevrimiçi)” ve “AXIOM Kernel v12 — Active”.

2. **Canlı worker oturumu**
   - `worker-client.ts` mevcut Vite uyumlu başlatmayı korusun; boot mesajı cevap vermezse zaman aşımıyla sağlık durumuna düşsün.
   - Worker açılabiliyorsa her zaman gerçek daemon ana yol olsun.
   - Worker tarayıcı/iframe kısıtı nedeniyle açılamazsa uygulama çökmeden `local-kernel` ile aynı canlı doğrulama zincirini çalıştırsın; bu mod “iskelet” olarak adlandırılmasın.

3. **Servisi yeniden başlat davranışı**
   - “Servisi Yeniden Başlat” bellek/RAM önbelleğini, bekleyen işleri, worker mesaj sırasını, engine cache’i ve son hata durumunu temizlesin.
   - Yeni worker instance’ı başlatılsın; boot onayı gelmeden eski sonucun ekranda kalması engellensin.
   - Worker tekrar açılırsa yerel yedekten canlı daemon’a geri dönsün.

4. **Z3/Lean doğrulama zinciri**
   - `verify/engine.ts` içindeki `mockSolve()` ana karar yolundan çıkarılsın.
   - Yerel WASM ikilileri varsa `z3-adapter` ve `lean-adapter` üzerinden gerçek compile/instantiate akışı çalışsın.
   - İkili yoksa sahte “200_PROVEN” üretilmesin; sonuç “motor kullanılamıyor / yerel kural denetimi” şeklinde güvenli ve dürüst bir duruma düşsün.
   - Proof seal, girdi metni, motor kimliği, karar, süre ve kanıt adımlarının özetinden WebCrypto ile üretilsin; gizli veri loglanmasın.

5. **Offline ve P2P entegrasyon**
   - Service Worker hazırsa AXIOM doğrulama görevleri IndexedDB kuyruğuna alınsın.
   - Bağlantı dönünce kuyruk sıralı biçimde boşaltılsın.
   - WebRTC mesh açıkken doğrulama sonucu/sağlık özeti diğer düğümlere yayınlansın; girdi metninin tamamı paylaşılmasın.

6. **İkon ve arma standardı**
   - Harici servisler için CDN’siz yerel SVG eşlemeleri tek dosyadan kullanılmaya devam etsin.
   - Yerleşik WebOS uygulamaları için daha profesyonel, tutarlı glassmorphic arma çizimleri üretilecek; masaüstü, Dock, görev çubuğu ve başlatıcı aynı yüzeyi kullanacak.
   - Resmi marka dosyası lisansı doğrulanamayan servislerde taklit yerine yerel, marka-renkli ama özgün SVG işareti kullanılacak.

7. **Pencere yönetimi**
   - `windows.ts` deterministik cascade ve boş alan seçimini koruyup güçlendirecek.
   - Focus alanı aktif pencereyi daima en üste taşıyacak; minimize/restore/close sonrası z-index yeniden normalize edilecek.
   - `WindowFrame` sürükleme ve resize sırasında güvenli alan/dock sınırına uymaya devam edecek.

8. **Çift yükleme/flicker denetimi**
   - Hydration yapan store’lar tekrar kontrol edilecek; `subscribe/getSnapshot` içinde gereksiz ikinci bildirim üreten yer varsa tek geçişli hale getirilecek.
   - İlk açılış rehberi masaüstünü bloke etmeyecek; gerekirse yalnız elle çağrılan yardım akışına dönüştürülecek.

9. **Doğrulama kapıları**
   - Hedef kontroller: TypeScript, Vitest, lint, security check, build logları ve Playwright ile canlı masaüstü + AXIOM açılış testi.
   - Playwright’ta doğrulanacaklar: masaüstü tek açılıyor, AXIOM penceresi açılıyor, durum “Active”, restart sonrası worker tekrar boot ediyor, proof viewer sahte başarı göstermiyor, konsolda yeni kritik hata yok.

## Teslim kriteri

- Önizlemede AXIOM “Active” durumda açılır.
- Eski iskelet/mock/simülasyon ibareleri kullanıcı arayüzünde görünmez.
- Gerçek Z3/Lean WASM dosyaları varsa canlı motor kullanılır; yoksa sahte kanıt üretilmez.
- Restart düğmesi temiz oturum başlatır.
- Masaüstü ikonları, pencere yerleşimi ve ilk açılış tek geçişli çalışır.
- Web ortamında tüm test ve build kapıları yeşil raporlanır.
