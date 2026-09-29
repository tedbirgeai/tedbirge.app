# Kalan Başlıklar: Studio Rehberi, Üst Bar/Dock, Sohbet Asistanı

## 1. AxiomStudio şablon seçici ve rehber
- İlk açılışta (proje yoksa veya "Yeni proje" tıklanınca) modal: **Widget**, **Mesh Botu**, **WASM Modülü** kartları; her biri kısa açıklama + ad alanı. Seçim mevcut `templateFiles` akışıyla `/repo` altına yazılır.
- "Bir daha gösterme" tercihi tarayıcıda saklanır.
- Sağ panel iki sekme:
  - **Önizleme**: son başarılı derlemeyi ayrı, izole çerçevede çalıştırır; `host_log` çıktısı canlı listelenir. Derleme yoksa "Önce derleyin" durumu.
  - **Rehber**: Türkçe fonksiyon listesi (`host_log`, `host_peers`, `host_now`, `host_emit` vb. — yalnız gerçekten sağlanan host fonksiyonları), imza, örnek, tıkla-ekle.

## 2. Üst bar ve Dock
- Üst bardaki "0 cihaz · 89 ms · 1280 MB" metni tek bir durum simgesine iner (renkli nokta: bağlı / tek başına / çevrimdışı). Ayrıntılar simgeye tıklayınca açılan küçük panelde ve Kontrol Merkezi'nde kalır.
- Dock: her uygulama simgesinin altında açık pencere noktası (açık = dolu, küçültülmüş = soluk, birden fazla pencere = çoklu nokta). Tıklama: küçültülmüşse geri getir, açık ama arkadaysa öne al, öndeyse küçült. Mevcut pencere durumuna bağlanır; yeni sahte durum yok.

## 3. Sohbet: Axiom Bot + şifreli mesh
- Sohbet listesindeki örnek/dummy kişi ve mesajlar kaldırılır; boş durum "Henüz sohbet yok" gösterir.
- **Axiom Bot** sabit sohbet olarak eklenir. Yanıtlar gerçek AI modeliyle, sunucu üzerinden akış halinde üretilir (anahtar tarayıcıya gitmez). Bot bir iddia/denklem algılarsa AXIOM doğrulama motoruna gönderir ve sonucu (doğrulandı / çelişki / karar verilemedi) rozetle gösterir — sahte onay yok.
- Eş sohbetleri yalnız doğrulanmış mesh bağlantısı üzerinden, uçtan uca şifreli gider; giden paketler mevcut ağ kapısından geçer. Bağlı eş yoksa gönder düğmesi pasif ve "Eş çevrimdışı — kuyruğa alındı" gösterilir (çevrimdışı kuyruk mevcut).
- Mesajlar yalnız bu cihazda saklanır.

## Doğrulama
- Tip denetimi, tüm testler, üretim derlemesi.
- Yeni testler: Dock tıklama durum makinesi, şablon dosya üretimi, bot yanıt yönlendirmesi (AXIOM rozeti).
- Canlı önizlemede: Studio modalı → şablon → derle → önizleme; Dock noktaları ve geri getirme; Axiom Bot ile bir mesaj gidiş-dönüş.

## Sınırlar
- Tek cihazda gerçek iki eşli şifreli sohbet uçtan uca test edilemez; birim testle ve tek düğüm kuyruğuyla doğrulanır.
- Axiom Bot yanıtları çalışma alanı AI kredisini kullanır.

## Teknik ayrıntılar
- Studio: `StudioApp.tsx` + yeni `TemplatePickerDialog.tsx`, `PreviewPane.tsx`, `HostGuide.tsx`; host fonksiyon listesi Studio runtime'ın gerçek import nesnesinden türetilir.
- Üst bar: `PeerStatusIndicator.tsx` sade nokta + popover; `SystemBar.tsx` ham metin kaldırılır.
- Dock: `Dock.tsx` nokta işaretleri ve `focus/restore/minimize` döngüsü; saf yardımcı fonksiyon test edilir.
- Sohbet: `src/routes/api/axiom-bot.ts` akışlı uç nokta (`openai/gpt-6-astra`, Responses API, AI SDK `useChat`), 402/429 hata mesajları arayüzde; eş mesajları `desktop-ipc` + `packet-gate` + mevcut datachannel üzerinden.
