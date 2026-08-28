# Sahte Veri Temizliği + Tek Renk Açık Kristal Çalışma Alanı

Ana ekran (`/` → `src/components/Messenger.tsx`) şu an geliştirici konsolu görünümünde: sabit "823 / 1,284" düğüm sayıları, "12g 6sa 24dk" çalışma süresi, "12ms / %0.12 / 98.7" metrikleri, `ALIAS_POOL` üzerinden üretilen "Node Alpha…Node Theta" isimleri ve bir "Node Alpha (Simülasyon)" eşi var. Sol menüde `routes/ · kernel/ · components/ · wasm/` klasör yolları görünüyor. Renkler emerald/cyan/slate/pembe olarak dosyaya sabit yazılmış (yalnız bu dosyada 139 eşleşme, Dashboard'da 123).

## 1. Sahte veri temizliği (dürüst durum)

- `ALIAS_POOL` ve `peerAlias` kaldırılır; eş adı gerçek kimlikten (`nodeLabel` / TBG kısaltması) türetilir. Ad yoksa "Bilinmeyen eş" değil, kimliğin kendisi gösterilir.
- "Node Alpha (Simülasyon)" eşi ve onun ürettiği sahte mesajlar tamamen silinir.
- Ağ Özeti kartı canlı kaynaklara bağlanır (`useLiveTelemetry`, `subscribeLivePeers`, `describeNode`):
  - Gerçek eş yokken: **1 Düğüm (Bu Cihaz)** ve **Ağ Durumu: Yerel Mod**.
  - Eş bağlandığında sayaç gerçek eş sayısına döner.
- Ölçüm yoksa metrik basılmaz: RTT, paket kaybı, bant genişliği, çalışma süresi, "AĞ SAĞLIĞI: MÜKEMMEL" gibi alanlar ölçüm gelene kadar `—` gösterir. Uydurma değer ve rastgele üretim kalmaz.
- Sabit "v2.7.1", "SÜPER EŞ", "node_admin" gibi rozetler ya gerçek runtime değerine bağlanır ya kaldırılır.
- Aynı denetim `src/components/Dashboard.tsx` ve `src/components/shell/CommandCenter.tsx` için de yapılır; oradaki kalan sabit sayılar temizlenir.

## 2. Tek renk Açık Kristal paleti

- Kaynak tek yerdir: `src/styles.css` içindeki `--tb-*` token seti (crystal teması). Renk eklenmez, mevcut palet tek vurgu rengiyle sadeleştirilir.
- `Messenger.tsx`, `Dashboard.tsx`, `CommandCenter.tsx`, `WorkspacePanel.tsx`, `SecurityPanel.tsx`, `NodeSettingsPanel.tsx`, `FeedPanel.tsx`, `PaywallModal.tsx`, `NodeTestModal.tsx` içindeki `emerald-*`, `cyan-*`, `slate-*`, `pink/fuchsia-*`, `text-white`, `bg-[#06090e]` benzeri sabit sınıflar sökülür; yerine token tabanlı yüzeyler gelir:
  - zemin `var(--tb-bg)`, kart `var(--tb-panel)` + hafif blur, kenarlık `var(--tb-border)`, metin `var(--tb-text)` / `var(--tb-muted)`, tek vurgu `var(--tb-accent)`.
- Durum renkleri (uyarı/hata) tek nötr + tek vurgu düzeyine indirilir; çok renkli ikon paleti kaldırılır.
- `soft` ve `night` temaları aynı token adlarıyla çalışmaya devam eder (tema anahtarı bozulmaz).

## 3. Kullanıcı odaklı yapı

- Sol menüden `routes/ · kernel/ · components/ · wasm/` bloğu tamamen kaldırılır.
- Sol menü son kullanıcı diline geçer: **Sohbet · Dosyalar · Ekip · Ağ & Sistem Durumu** (en altta, ⚙️ ikonu).
- Ağ Özeti, P2P Topolojisi (MiniMeshCanvas), çekirdek/telemetri kartları ana ekrandan çıkarılıp **Ağ & Sistem Durumu** sekmesine taşınır (bileşenler silinmez, sadece bu sekmeye bağlanır).
- Ana ekran Slack/Notion tarzı sade çalışma alanı olur: solda sohbet listesi, ortada sohbet/dosya akışı, sağda katılımcı/ekip paneli. Görüşme ızgarası sohbet içinden başlatılan bir eylem olarak kalır.

## Teknik notlar

- Dokunulmaz: `src/kernel/*`, `crates/tedbirge-kernel`, `src/lib/mesh/*`, `src/lib/call/*`, `src/lib/e2ee.ts`, Supabase entegrasyonları, rota dosya adları. Değişiklik sunum katmanıyla sınırlı.
- Veri kaynakları: `src/lib/telemetry/live-store.ts`, `src/services/signaling.ts`, `src/lib/node-runtime.ts`.
- Doğrulama: `bunx tsgo --noEmit` 0 hata, `bun run build` 0 hata, `bunx vitest run` yeşil ve `/` ekranının üç temada görsel kontrolü.

## Kapsam dışı

- Yeni özellik, ödeme entegrasyonu, çekirdek/mesh mantığı değişikliği.
