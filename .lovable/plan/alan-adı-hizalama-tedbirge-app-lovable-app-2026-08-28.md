# Alan Adı Hizalama: tedbirge-app.lovable.app

Kod tabanındaki 60 dosyada geçen eski `tedbirge-gateway.lovable.app` adresi yeni alt alan adına taşınır ve tüm URL üretimi tek kaynağa bağlanır.

## Yapılacaklar

1. **Tek doğruluk kaynağı**
   - `src/lib/site.ts` içindeki `SITE_URL` → `https://tedbirge-app.lovable.app`.
   - Üretim alan adı bağlandığında tek satırla `https://tedbirge.app`'e geçilebilmesi için ortam değişkeni desteği eklenir (`VITE_SITE_URL` varsa o kullanılır, yoksa varsayılan Lovable adresi).

2. **Rota meta verileri (48 rota)**
   - Tüm `head()` bloklarındaki `og:url` ve `canonical` değerleri betikle yeni alan adına çevrilir. Format ve başlıklar korunur, yalnızca alan adı değişir.

3. **Uygulama içi sabitler**
   - `src/lib/chat/call-links.ts`, `src/lib/peer-trust.ts`, `src/lib/node-runtime.ts`, `src/components/site/*` (PanelOps, PanelMesh, PanelLive, NetworkModal, EasyConsole, BrowserNodeCard) içindeki yedek/varsayılan adresler `siteUrl()` üzerinden okunacak veya yeni adrese güncellenecek.
   - `capacitor.config.ts` sunucu adresi, `public/install.sh`, `public/tedbirge-teknik-ozet.md`, `README.md`, `MOBILE.md` metinleri güncellenir.

4. **Auth ve yönlendirme**
   - `src/routes/giris.tsx` içindeki OAuth `redirect_uri` ve `emailRedirectTo` zaten `window.location.origin` kullanıyor; bu davranış korunur (doğru olan budur).
   - Backend tarafında Auth "Site URL" ve izin verilen yönlendirme listesi yeni adresi kapsayacak şekilde ayarlanır: `https://tedbirge-app.lovable.app/**`, `https://tedbirge.app/**` ve önizleme adresi.

5. **Manifest ve tarayıcı kimliği**
   - `public/manifest.webmanifest` göreli yollarla çalışıyor (`start_url: /chat`); alan adına bağımlı bir alan yok, bu yüzden yalnızca açıklama metni doğrulanır.
   - Projede `sitemap.xml` veya RSS dosyası yok; `robots.txt` içinde alan adı geçmiyor, dolayısıyla değişiklik gerekmez. İsterseniz yeni alan adına göre bir `sitemap.xml` de üretebilirim.

6. **Doğrulama**
   - `rg tedbirge-gateway` sonucunun sıfır olması, tip denetimi ve derlemenin temiz geçmesi kontrol edilir.

## Önemli not

Yayınlanmış adresin gerçekten `tedbirge-app.lovable.app` olması için yayın (publish) sırasında Lovable URL adı `tedbirge-app` olarak değiştirilmelidir. Bunu, siz onay verdiğinizde yayınlama adımında yapabilirim; aksi halde kod yeni adrese işaret ederken site eski adreste yayında kalır.
