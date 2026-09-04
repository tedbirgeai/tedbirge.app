# Yayına hazırlık: metin düzeltmesi, son denetim ve canlıya alma

## Denetimde bulunan gerçek sorun

Yasal sayfalar ve rapor metinlerinde marka adı bozuk görünüyor: "Tedbirge® WebOS" yerine
"TedbirgeÂ® WebOS" yazıyor. 24 dosyada mevcut — gizlilik, koşullar, ihracat uyum, çevrimdışı
sayfası, uyum beyanı/PDF metinleri, iş planı, panel ve sistem bilgisi ekranları dahil.
Satıcı unvanı ("Mehmet DİNÇ") doğru ve tutarlı; sorun yalnızca bu bozuk karakterde.

## Yapılacaklar

1. **Metin düzeltmesi** — 24 dosyadaki tüm "TedbirgeÂ®" ibareleri "Tedbirge®" olarak
   düzeltilir; başka bozuk karakter kalıntısı (Ã, â€ vb.) varsa aynı geçişte temizlenir.
2. **Satıcı unvanı doğrulaması** — gizlilik, koşullar, iade, ihracat uyum sayfaları ve
   üretilen uyum/beyan çıktılarında unvanın "Mehmet DİNÇ (Tedbirge® WebOS)" olarak tam
   tutarlı geçtiği tek tek kontrol edilir; sapma varsa hizalanır.
3. **Geliştirici bağlantıları** — tedbirge.dev'e giden tüm bağlantıların yeni sekmede ve
   `rel="noopener noreferrer"` ile açıldığı doğrulanır; eksik olan tamamlanır.
4. **Sıfır uyarı denetimi** — tip kontrolü, linter ve test paketi çalıştırılır; kalan
   uyarı/hata giderilir. Kodda unutulmuş geliştirme çıktısı (console.log / TODO / FIXME /
   geçici sahte veri) taranır ve temizlenir.
5. **Canlıya alma** — değişiklikler yayınlanır ve yayın adresi üzerinden ana sayfa, yasal
   sayfalar ve geliştirici bağlantısı son kez kontrol edilir.

## Sizin tarafınızda kalan adım (önemli)

Git push ve Vercel derlemesini ben tetikleyemiyorum — depoya doğrudan yazma yetkim yok.
İki seçenek var:

- **GitHub bağlantısı açıksa:** buradaki değişiklikler `tedbirgeai/tedbirge.app` deposuna
  otomatik akar ve Vercel derlemesi kendiliğinden başlar; benim tarafımda ek iş yok.
- **Bağlantı yoksa:** deponun bağlanması gerekir (sohbet alanındaki + menüsü → GitHub).
  Bağlandığı anda tüm çalışma push edilir ve Vercel iki projeyi de derler.

İkinci maddeyi siz onayladıktan sonra kalan tüm teknik işi ben tamamlayıp nihai raporu
sunacağım.

## Teknik notlar

- Düzeltme dosya bazında yapılır; `regulation.ts`, `business-plan.ts`, `guides.ts`,
  `api-spec.ts`, `hcl.ts`, `ai-advisor-prompt.ts`, `protocol-layers.ts`, `relay.ts`,
  `lead-plan.ts`, `webhooks.server.ts` ve yasal rota dosyaları kapsamdadır.
- Doğrulama: `bunx tsgo --noEmit`, `bunx vitest run`, lint; ardından tarayıcıda yasal
  sayfaların görsel kontrolü.
- CORS izin listesi (`src/lib/cors.ts`) ve `site.ts` alan adı yapılandırması olduğu gibi
  korunur; bu turda değişmez.
