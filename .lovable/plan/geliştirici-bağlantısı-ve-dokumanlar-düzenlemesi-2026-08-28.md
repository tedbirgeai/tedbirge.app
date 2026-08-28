# Geliştirici Bağlantısı ve /dokumanlar Düzenlemesi

## Tespit

`https://tedbirge.dev` bağlantısı iki yerde geçiyor ve alan adı bağlı olmadığı için dışarı çıkıp hata veriyor:

- `src/components/Dashboard.tsx:591` — alt bar, "tedbirge.dev · geliştirici portalı"
- `src/components/Messenger.tsx:838` — sohbet alt barı, "tedbirge.dev"

`src/routes/dokumanlar.tsx` (538 satır) hâlihazırda arama kutulu, gruplanmış doküman motoru içeriyor (HCL, Başlangıç, CLI vb.) ve Açık Kristal temasıyla uyumlu `SitePage` kabuğunu kullanıyor. `/api-dokumantasyon` telemetri API'si için ayrı ve eksiksiz.

## Yapılacaklar

1. **Bağlantı düzeltmesi** — Her iki alt bardaki `<a href="https://tedbirge.dev" target="_blank">` etiketi, TanStack `<Link to="/dokumanlar">` ile değiştirilir. Görünen metin "Geliştirici Portalı" olur; `title="Geliştirici Portalı & API Dokümantasyonu"` ve aynı içerikli `aria-label` eklenir. Renk/tipografi mevcut `var(--tb-accent)` düzeninde kalır.
2. **/dokumanlar içeriği** — Mevcut doküman dizisine üç yeni grup eklenir (var olan kayıtlara dokunulmaz):
   - **SDK Başlangıç** — düğüm başlatma, eş bağlama, mesaj/dosya gönderme adımları; kopyalanabilir kod blokları.
   - **Protokol Mimarisi** — zarf yapısı, röle ve store-and-forward akışı, çok-sıçramalı yönlendirme (Dijkstra + DHT), yeniden oynatma/imza koruması, egress sınırı.
   - **Rust-Wasm Çekirdek** — `crates/tedbirge-kernel` derleme akışı, `public/kernel/tedbirge_kernel.wasm` yüklemesi, işçi/IPC v2 ve paylaşımlı halka tamponu, TS geri düşüşü.
   Her grup mevcut `Entry` tipleriyle (text/code/table) yazılır, arama kutusuna otomatik dahil olur.
3. **Çapraz bağlantı** — `/dokumanlar` üstüne `/api-dokumantasyon` sayfasına giden bir bağlantı eklenir, böylece "geliştirici portalı" tek giriş noktası olur.
4. **Doğrulama** — `bunx tsgo --noEmit` ve derleme 0 hata; `/`, `/chat` alt barlarındaki bağlantı ve `/dokumanlar` yeni bölümleri kontrol edilir.

## Teknik notlar

- Dokunulan dosyalar: `src/components/Dashboard.tsx`, `src/components/Messenger.tsx`, `src/routes/dokumanlar.tsx`.
- Yeni renk sabiti yok; tüm değerler `--tb-*` token'larından okunur.
- İçerik tanıtım metni değil, koddaki gerçek modüllerden türetilen teknik özet olur.

## Kapsam dışı

Alan adı bağlama, gerçek SDK paketi yayımlama, yeni rota oluşturma.
