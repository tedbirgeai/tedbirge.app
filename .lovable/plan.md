# Uçtan Uca Tek Tema — Açık Kristal (Tüm Rotalar + /panel)

## Tespit

Tarama sonucu: `/panel` (`src/routes/_authenticated/panel.tsx`) ve tüm site rotaları zaten sabit renk sınıfı kullanmıyor — hepsi shadcn tokenlarıyla (`bg-background`, `text-foreground`, `border-border`) yazılmış. Koyu lacivert görüntünün tek kaynağı `src/styles.css`:

- `:root` (satır 102-136) ve `.dark` (138-172) blokları koyu lacivert değerler içeriyor (`--background: oklch(0.27 0.155 273)`).
- Açık Kristal token seti (`--tb-*`, satır 689+) yalnızca `.tbos` kapsamında (satır 577-619) shadcn tokenlarına bağlanmış. Yani sadece Web-OS ekranı açık, geri kalan tüm site koyu.

Ayrıca `@utility grid-bg` (195-200) beyaz çizgili ızgara kullanıyor; açık zeminde görünmez/uyumsuz kalır.

## Yapılacaklar

1. **Global token bağlaması** — `src/styles.css` içindeki `:root` bloğundaki sabit lacivert oklch değerleri kaldırılıp `--tb-*` değişkenlerine bağlanır (`--background: var(--tb-bg)`, `--card: var(--tb-panel-solid)`, `--primary: var(--tb-accent)`, `--border: var(--tb-border)`, sidebar ve chart tokenları dahil). Böylece `/panel`, `/kurumsal`, `/fiyatlandirma`, dokümanlar, modal/dialog'lar ve tüm alt rotalar tek kaynaktan beslenir.
2. **`.dark` bloğu** — Gece Modu ile çakışmaması için `.dark` da aynı `--tb-*` referanslarına çevrilir; koyu görünüm yalnızca `data-theme="night"` seçildiğinde gelir. İkinci bir tema dili bırakılmaz.
3. **`.tbos` kapsamı** — Artık global ile aynı değerleri verdiği için sadeleştirilir; `--wa-*` sohbet kabuğu eşlemeleri korunur (sohbet ekranı bozulmaz).
4. **`grid-bg` ve dekoratif efektler** — `grid-bg` çizgileri `var(--tb-grid)`, parıltılar `var(--tb-glow)` üzerinden okunur; `bg-primary/15` blur alanları tek vurgu rengiyle uyumlu kalır.
5. **FOUC / renk sıçraması** — `src/routes/__root.tsx` içindeki tema boot betiği zaten `data-theme`'i ilk boyamadan önce yazıyor; ek olarak `html` ve `body` arka planı `var(--tb-bg)` ile sabitlenir, böylece rota geçişlerinde beyaz/lacivert flaş olmaz.
6. **Doğrulama ve yayın** — `bunx tsgo --noEmit` ve `bun run build` 0 hata; `/`, `/panel`, `/kurumsal`, `/fiyatlandirma` ekran görüntüsüyle kontrol; ardından canlı adrese yayın.

## Teknik notlar

- Değişiklik tek dosyada yoğunlaşır: `src/styles.css`. Bileşenlerde renk sınıfı sökümü gerekmiyor (tarama sabit renk bulmadı).
- `--tb-*` tanımları (crystal/soft/night) olduğu gibi kalır; sadece tüketim noktası genişler.
- Dokunulmaz: çekirdek (`src/kernel/*`), mesh/E2EE/çağrı katmanları, Supabase entegrasyonları, rota adları.

## Kapsam dışı

Yeni özellik, içerik değişikliği, ödeme entegrasyonu.
