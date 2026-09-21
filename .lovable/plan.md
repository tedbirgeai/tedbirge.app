# AXIOM Kernel v12 — Faz 2: Dil Motoru, Değişmez Kuralları ve Ağ Düğümü

Faz 1 (değişmez aksiyom tabanı, 50 MB sınırlı önbellek, çekirdek daemon'ı, çizim yüzeyi) çalışıyor.
Faz 2 bunun üzerine üç şeyi ekler: girdiyi tanıyan dil motoru, fizik/emniyet kurallarıyla eşleştirme
katmanı ve ağ düğümü göstergesi.

## Ne göreceksiniz

AXIOM penceresi dört yeni bölüm kazanır:

1. **Dil tanıma** — Yazdığınız metnin hangi insan dili olduğunu (Türkçe, İngilizce, Arapça, Çince,
   Rusça, Yunanca vb. yazı sistemi tabanlı) veya hangi programlama/donanım dili olduğunu (C/C++,
   Rust, Ada, Java, COBOL, Fortran, Solidity, VHDL/Verilog, Python, SQL) güven yüzdesiyle söyler.
2. **Yapı ağacı** — Girdi bayt dizisinden başlayıp belirteçlere ve ağaç yapısına ayrıştırılır; ağaç
   pencerede açılır-kapanır biçimde gösterilir.
3. **Değişmez eşleşmeleri** — İddianız hangi korunum yasası veya emniyet standardıyla ilgiliyse o
   kural kartı çıkar (termodinamik 0–3, enerji/momentum/yük korunumu, Shannon kapasitesi,
   Nyquist örnekleme, Gödel eksiklik, DO-178C, ISO 26262, IEC 61508, IEEE 7000, NIST SP 800-53).
   Her kart hangi kurumun defterinden geldiğini yazar. Bilim matrisi 6 kategoriye göre filtrelenir.
4. **Ağ düğümü durumu** — Uygulama açıldığında bağımsız düğüm çalışır; bağlantı yolu (doğrudan,
   yansıtıcı sunucu üzerinden veya aktarmalı), eş sayısı ve **NODE_ACTIVE_FREE / 6. cihazda
   SUBSCRIPTION_REQUIRED** durumu görünür.

## Dürüst sınır

Bu fazda hâlâ **kanıt üretilmez**. Kurallar yalnız eşleştirilir ve "bu iddia şu değişmezle
çelişiyor olabilir / ilgili" biçiminde işaretlenir. Simgesel doğrulama motoru (Z3 / Lean 4) Faz 3'ün
konusudur; arayüz her yerde bunu açıkça yazmaya devam eder. Dolayısıyla "200_PROVEN" mührü,
ücretlendirme ve harici model geçidi bu fazda yer almaz.

## Teknik kapsam

Yeni dosyalar (Faz 1'in `src/lib/axiom/` düzenini sürdürür; emirdeki `src/core` adları buraya eşlenir):

- `src/lib/axiom/lang/detect.ts` — yazı sistemi + anahtar kelime/sözdizimi imzalarıyla dil tanıma,
  saf fonksiyon, skor üretir.
- `src/lib/axiom/lang/ask-ascii.ts` — bayt → belirteç → AST ayrıştırıcı (Faz 1'deki `digest.ts`
  üzerine kurulur, onu değiştirmez).
- `src/lib/axiom/lang/axiom-ir.ts` — AST → ortak ara gösterim (AXIOM-IR): varlıklar, ilişkiler,
  birimler, nicelikler.
- `src/lib/axiom/invariants.ts` — değişmez kayıtları: kimlik, kategori, ifade, kaynak defteri,
  tetikleyici anahtarlar; IR ile eşleştirme fonksiyonu ve çelişki işareti.
- `src/lib/axiom/registry.ts` — 6 bilim kategorisi ve TCB defter listesi (Faz 1 ROM tohumuna ek
  bloklar; yazılmış bloklar değiştirilmez).
- `src/lib/axiom/i18n.ts` — çizim yüzeyi ve etiketler için JSON tabanlı sözlük (tr varsayılan, en yedek).
- `src/lib/axiom/net/node.ts` — düğüm durumu köprüsü.
- `src/components/axiom/LanguageCard.tsx`, `AstView.tsx`, `InvariantMatrix.tsx`, `NodeStatusCard.tsx`.

Değişecek mevcut dosyalar: `src/lib/axiom/kernel.worker.ts` (ayrıştırma + eşleştirme daemon'a taşınır,
mesaj sözleşmesi genişler), `src/components/axiom/AxiomApp.tsx` (yeni bölümler), `src/lib/axiom/rom.ts`
(defter blokları tohuma eklenir).

Ağ katmanı kararı: **ikinci bir WebRTC yığını kurulmaz.** Mevcut `src/lib/browser-node.ts`,
`src/lib/node-runtime.ts` ve `src/lib/webrtc/ice.ts` (STUN + aktarma yedeği zaten yapılandırılmış)
salt-okunur biçimde okunur; `net/node.ts` yalnız bu durumu AXIOM diline çevirir. Böylece sohbet,
arama ve mesh davranışı hiç etkilenmez.

Korunacak sınırlar: yalnız `--tb-*` renk token'ları, CDN yok, yeni bağımlılık yok (dil tanıma ve
ayrıştırma kendi kodumuz — tree-sitter gibi ağır paket eklenmez), telif başlığı her yeni dosyada,
dosya sistemi / pencere yöneticisi / çekirdek / P2P / masaüstü ızgarası dokunulmaz.

## Doğrulama

- Yeni birim testleri: dil tanıma (10+ örnek, yanlış pozitif kontrolü), ayrıştırıcı (yorum, dizgi,
  iç içe parantez, UTF-8), IR dönüşümü, değişmez eşleştirme (ilgili/çelişki/ilgisiz üç durum).
- `bunx tsgo --noEmit`, `bunx eslint`, `bunx vitest run`, `bun run build`.
- Tarayıcıda: Türkçe metin, İngilizce iddia, Rust kod parçası ve termodinamik ihlali içeren bir
  iddia ile pencere ekran görüntüsüyle teyit.

## Bu fazın dışında (sonraki fazlar)

Z3/Lean 4 gerçek motoru ve ispat kartı, harici model geçidi (MCP) ve JSON-RPC ucu, ispat başına
ücretlendirme, hakem düğüm onayı ve sahte imza banı, SDK paketleri ve CI/CD rozetleri.
