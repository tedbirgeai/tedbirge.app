# Sistem Denetimi, Marka Temizliği ve Alan Adı Eşitlemesi

Onaylanan kapsam: görünen metinlerde "Protokol" ve "Lovable" temizliği, altyapı dosyalarına dokunulmaz; yayın Vercel'de kalır; geliştirici bağlantıları yayında olan https://tedbirge.dev adresine gider.

## 1. Marka metinleri: "Protokol" → Tedbirge® WebOS

- Kullanıcının gördüğü tüm başlık, açıklama, buton ve sayfa metinlerinde "Tedbirge Protokol / Tedbirge Protocol" ifadesi "Tedbirge® WebOS" olur.
- Dokunulacak yerler: yasal sayfalar (`kosullar`, `gizlilik`, `iade`, `ihracat-uyum`, `yasal`), `cevrimdisi`, ana sayfa ve panel/site bileşenlerindeki tanıtım metinleri, `README.md`, `public/tedbirge-teknik-ozet.md`.
- Teknik anlamdaki "protokol" sözcüğü (enerji protokolü, ağ protokolü, WebRTC) ve dosya/değişken adları değişmez — bunlar marka değil işlev adıdır.
- Sekme başlıkları ve sosyal paylaşım metinleri `Tedbirge® WebOS` kimliğiyle tek biçime getirilir.

## 2. "Lovable" izleri

- Kaldırılacak: yorum satırları, geliştirici notları ve kullanıcıya görünebilecek metinlerdeki marka adı.
- Kalacak (teknik zorunluluk): platformun kendi ürettiği altyapı dosyaları, paket bağımlılıkları ve önizleme adresi kontrolleri. Bunlar silinirse önizleme, giriş ve hata bildirimi çalışmaz.
- Hata raporlama modülü nötr bir isimle (`error-reporting`) yeniden adlandırılır ve çağrı yerleri güncellenir; davranışı aynı kalır.

## 3. Alan adı ve bağlantı eşitlemesi

- Tek doğruluk kaynağı `src/lib/site.ts`: ana adres `https://tedbirge.app`, geliştirici portalı `https://tedbirge.dev`.
- Tüm sayfa adresleri (canonical, paylaşım adresleri) `https://tedbirge.app` üzerinden üretilir; elle yazılmış eski adres kalmaz.
- Geliştirici/SDK bağlantıları tek noktadan `tedbirge.dev` adresine gider; her bağlantı `rel="noopener noreferrer"` ile yeni sekmede açılır.
- Genel API uçları şu an her kaynağa açık (`*`). Bunlar yazma/telemetri uçlarında lisans anahtarıyla korunuyor; yine de izin listesi `tedbirge.app`, `tedbirge.dev` ve önizleme adresiyle daraltılır, salt-okunur sağlık/ping uçları açık kalır.
- Kimlik doğrulama yönlendirmeleri `window.location.origin` kullanmaya devam eder; sunucu tarafındaki izinli adres listesine iki alan adı da eklenir.

## 4. Bağlantı ve mimari doğrulama

- Tüm iç yönlendirmeler taranır; hedefi olmayan bağlantı bırakılmaz.
- Görsel/ikon/manifest yolları, servis çalışanı ve Wasm çekirdek yolu yüklenebilirlik açısından kontrol edilir.
- Tip denetimi, testler ve derleme sıfır hata ile geçirilir; ana sayfa, sohbet ve dokümanlar tarayıcıda açılarak konsol hatası olmadığı doğrulanır.

## 5. Teslimde verilecek rapor

Denetim sonunda tek bir liste sunulur: bulunan tutarsızlıklar, düzeltilenler, teknik nedenle bilinçli olarak bırakılanlar (platform altyapısı) ve sizin kararınızı bekleyen açık noktalar.

## Kapsam dışı

DNS kayıtlarının kendisi (Vercel tarafında sizde), ödeme entegrasyonunun canlıya alınması, yeni sayfa/özellik geliştirme.
