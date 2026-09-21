# AXIOM Kernel v12 — Faz 1: Kabuk, Bellek Mimarisi ve Profiler

AXIOM, Tedbirge WebOS içinde yerleşik bir uygulama olarak kurulur: masaüstünde
simgesi, başlatıcıda kartı, kendi penceresi olur. Faz 1 yalnız görsel kabuk +
bellek mimarisi + canlı gösterge kapsar; doğrulama motorları (Z3 / Lean 4),
MCP ve faturalandırma sonraki fazlara bırakılır.

## Kullanıcının göreceği sonuç

- Masaüstünde ve başlatıcıda **AXIOM** uygulaması (Geliştirme kategorisi).
- Pencere açıldığında koyu cam görünümlü, çizim tabanlı bir konsol: komut
  satırı alanı, durum şeridi ve altta kalıcı marka bandı
  "AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs".
- Sağ tarafta canlı bellek göstergesi: kalıcı depolama izni, ROM durumu,
  anlık çalışma belleği ve 50 MB sınırına göre doluluk çubuğu.
- Donanım hızlandırması yoksa uygulama çökmez; daha basit çizim kipine geçer
  ve bunu durum şeridinde açıkça yazar.
- Komut girildiğinde Faz 1'de "motor sonraki fazda" bilgisi ve girdinin bayt
  özeti gösterilir — sahte doğrulama sonucu üretilmez.

## Teknik kapsam

Yeni dosyalar:

```text
src/lib/axiom/
├── kernel.worker.ts      # daemon: LRU RAM yöneticisi, ROM okuma, profil örneği
├── rom.ts                # IndexedDB salt-okunur blok + navigator.storage.persist()
├── ram.ts                # <50 MB LRU önbellek, %80 eşiğinde tahliye
├── profiler.ts           # performance.memory örnekleyici (yoksa tahmini ölçüm)
└── brand.ts              # marka bandı metni, sürüm, telif başlığı sabitleri
src/lib/axiom/canvas/
├── renderer.ts           # WebGL2 → Canvas2D düşüş zinciri, 120 FPS hedefi, rAF döngüsü
└── geometry.ts           # panel/çubuk/metin çizim ilkelleri (tüm renkler --tb-*)
src/components/axiom/
├── AxiomApp.tsx          # pencere gövdesi: canvas + ARIA erişilebilir metin katmanı
├── CommandBar.tsx        # cam komut girdisi (Faz 1: bayt özeti + durum)
└── MemoryProfiler.tsx    # ROM / RAM / kalıcı depolama göstergesi
src/lib/axiom/__tests__/   # ram (LRU tahliye), profiler eşik, renderer düşüş testleri
```

Kayıt noktaları (mevcut desenler korunur):

- `src/shell/installed.ts` → `{ id: "axiom", category: "Development", builtin: true }`
- `src/components/shell/AppLauncher.tsx` → yeni kart (lucide simgesi)
- `src/components/shell/app-icons.tsx` ve pencere eşlemesi (`WorkspacePanel`)
- `src/shell/xdg.ts` eşlemesi değişmez; yalnız kategori kullanılır

Kurallar:

- Renkler yalnız `--tb-*` token'larından; sabit hex yok, CDN yok.
- Worker mesajları tipli; ana iş parçacığında ağır döngü yok.
- Canvas erişilebilirlik için gizli ARIA metin ikizi ile eşlenir.
- Telif başlığı yeni AXIOM dosyalarının üstüne eklenir (emirdeki metin).
- Mevcut VFS, pencere, çekirdek, P2P ve masaüstü ızgara davranışı
  değiştirilmez; AXIOM yalnız yeni bir uygulama olarak eklenir.

## Faz 1 dışında bırakılanlar (sonraki turlar)

Faz 2 dil/ASK ASCII/invariant/P2P, Faz 3 Z3 + Lean 4 + MCP uç noktası,
Faz 4 faturalandırma + SDK + CRDT/ZKP, Faz 5 lisans modali + C-ABI + paketleme.

## Gerçeklik notu

Z3 ve Lean 4 gerçek WASM ikilileri henüz depoda yok; Faz 3'te ya gerçek
ikililer eklenir ya da açıkça "benzetim" etiketli deterministik motor
kullanılır. Bilimsel kayıt defterleri (NIST, PDB, WHO vb.) canlı veri
kaynağı olarak bağlanmaz; yerel değişmez şemaları olarak modellenir.

## Doğrulama

`bunx tsgo --noEmit`, `bunx eslint`, `bunx vitest run`, `bun run build`
ve tarayıcıda gerçek pencere açılışı (çizim + bellek göstergesi) kontrolü.
