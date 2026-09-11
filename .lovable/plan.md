# Tedbirge® WebOS — XDG Kategorileri, Yüzen Dock, Bento Mağaza ve Komuta Merkezi

Mevcut masaüstü kabuğu, dock, mağaza, arama ve sohbet ekranları korunan çekirdek (VFS, pencere yöneticisi, Rust-WASM, P2P) üzerinde yenilenir. VFS ve pencere API'leri değişmez; tüm renkler `--tb-*` token'larından okunur, harici CDN kullanılmaz.

## 1. Uluslararası kategori düzeni (XDG)

- Uygulama kategorileri sekiz standart başlığa geçer: Development, Office, System, Network, Utility, Graphics, AudioVideo, Education/Game. Türkçe etiketler: Geliştirme, Ofis, Sistem, Ağ, Araçlar, Grafik, Medya, Eğitim.
- Mevcut beş kategori (sistem, sosyal, üretkenlik, araçlar, web3) yeni sekize eşlenir; her katalog kaydı tek bir yeni kategoriye taşınır, hiçbir uygulama listeden düşmez.
- Kategori bilgisi tek kaynaktan okunur; mağaza, başlatıcı ve arama aynı listeyi kullanır.

## 2. Mağaza: Bento ızgara

- Banner/hero bölümü kaldırılır. Yerine 1x1, 2x2 ve 2x1 boyutlu kartlardan oluşan canlı bir ızgara gelir.
- Her kart: uygulama simgesi, canlı mikro önizleme, dijital imza rozeti, çevrimdışı uyumluluk etiketi ve yalıtılmış çalışma (sandbox) göstergesi.
- Kurulum butonu tek tıkla çalışır: yüzde göstergesi, duraklat/iptal, bitince "Aç".
- Kart sağ tık menüsü: "Masaüstüne Kısayol Ekle", "Dock'a Sabitle", "Kaldır".

## 3. Yüzen cam dock

- Dock ekranın altından 8 px yukarıda yüzer, 46 px yükseklikte, cam efektli.
- Sürükle-bırak: masaüstünden veya mağazadan simge sabitleme, dock içinde sıralama. Sabitlenen uygulamalar cihazda kalıcıdır (üç sabit yuva sınırı kalkar, liste genişleyebilir).
- Çalışan uygulamaların altında aktiflik noktası.
- Dock sağ tık menüsü: Yeni Pencere, Pencereyi Kapat, Küçült/Büyüt, Dock'a Sabitle/Kaldır, Görev Yöneticisi, Masaüstünü Göster.
- Mobil ve tablet genişliklerinde dock alt gezinti barına dönüşür.

## 4. Akıllı pencere yerleşimi

- Kenara sürüklemede ikili (%50/%50), üçlü ve dörtlü (%25x4) yerleşim ızgaraları önizlemeyle tetiklenir; bırakıldığında pencereler yerleşir.
- Klavye kısayolları aynı yerleşimleri çağırır.

## 5. Masaüstü sağ tık menüsü

- Boş alanda: Sırala, Yenile, Arka Planı Değiştir, Yeni Klasör, Masaüstü Ayarları — hepsi gerçek işlev (VFS klasörü, duvar kağıdı ekranı, ikon düzeni).
- Menüde işlevsiz/dekoratif madde bırakılmaz.

## 6. Komuta merkezi (Spotlight)

- Eski kalabalık arama/dialer ekranı sade bir komuta paletiyle değişir; Cmd/Ctrl+K veya Alt+Space ile her yerden açılır.
- Tek çubuktan anında arama: uygulamalar (kategori etiketiyle), VFS dosyaları, kişiler, mesh düğümleri, terminal komutları. Ok tuşları + Enter ile çalıştırma.

## 7. Sohbet (P2P) yeniden düzeni

- Mesaj listesi sanallaştırma ve sıkı memoization ile sarılır; ağ durum güncellemeleri artık sohbet penceresini titretmez.
- Çift panel: solda aktif sohbetler ve mesh cihaz listesi, sağda mesaj akışı, dosya paylaşım alanı ve üst durum çubuğu. Dar ekranda tek panel + geri gezinme.

## 8. Tasarım sistemi, performans, uyarlanabilirlik

- Açık/koyu tema geçişi pencere başlığı, gövde ve dock'ta eşzamanlı; parlak duvar kağıtlarında yüksek kontrastlı cam kenarlık.
- Dosyalar: sütun görünümü ve Space ile hızlı önizleme.
- CPU/RAM, P2P durumu ve VFS senkron ölçümleri arka plan işçisine taşınır, arayüz kilitlenmez.
- Mobil/tablet/laptop/masaüstü kırılımları, 1K–4K ölçekleme, dokunma + klavye + fare + kalem girdileri arasında kesintisiz geçiş.

## Teknik notlar

- Yeni/`değişen` alanlar: `src/shell/web-apps.ts` + `src/shell/installed.ts` (XDG kategori enum ve eşleme), `src/shell/dock-slots.ts` (sabitlenmiş liste), `src/lib/shell/window-snap.ts` (üçlü/dörtlü ızgara), `src/components/shell/Dock.tsx`, `Desktop.tsx`, `Spotlight.tsx`, `ContextMenu.tsx`, `apps/StoreApp.tsx`, `apps/FilesApp.tsx`, sohbet bileşenleri.
- Sanallaştırma için `react-window` eklenir; başka harici bağımlılık eklenmez.
- Mağaza kurulum ilerlemesi `.tbapp` kurulum akışına (imza doğrulama + `/appdata/{app_id}` yalıtımı) bağlanır; güvenlik davranışı değişmez.
- Kategori taşıması için eski değer okuyan yerler tek eşleme fonksiyonundan geçirilir; cihazda kayıtlı kurulu uygulama listesi bozulmaz.
- Kapılar: `bunx tsgo --noEmit`, `bunx eslint`, `bunx vitest run`, `bun run build`. Kategori eşlemesi ve snap ızgarası için yeni birim testleri eklenir.

## Kapsam dışı

- ISO/bare-metal derleme, installer ve CI iş akışları bu turda değişmez.
