# Geliştirici Portalı: Tek Depo, İki Yayın

Seçilen yol: yeni bir Lovable projesi veya ikinci bir depo açılmayacak. Portal bu projede kalır, yayın tarafında ayrı bir site olarak `tedbirge.dev` adresinden yayına alınır.

## Yapılacaklar

1. Portal klasörünü tek başına yayına hazır hale getirmek: giriş sayfası, kaynak dosyalar, ayarlar ve paket tanımının eksiksiz ve bağımsız çalıştığını doğrulamak.
2. Portal için yayın ayar dosyası eklemek (kök klasör `portal`, çıktı `dist`), böylece yayın tarafında elle ayar yapmaya gerek kalmasın.
3. Ana site ile portal arasındaki bağlantıları kontrol etmek: ana sitedeki geliştirici bağlantıları `tedbirge.dev` adresine, portaldaki bağlantılar `tedbirge.app` adresine gitsin.
4. Portalın kendi başlık, açıklama ve paylaşım bilgilerini düzenlemek.
5. Portalın derlemesini çalıştırıp hatasız çıktı verdiğini doğrulamak; ana sitenin derlemesinin bozulmadığını kontrol etmek.
6. Kısa bir kurulum notu bırakmak: yayın panelinde ikinci siteyi eklerken hangi ayarların girileceği ve alan adının nasıl bağlanacağı.

## Sizin yapacağınız (tek seferlik, 3 dakika)

- Yayın panelinde "yeni site" ekleyip aynı depoyu seçin.
- Kök klasör olarak `portal` yazın, çıktı klasörü `dist`.
- Alan adı olarak `tedbirge.dev` bağlayın.

Bundan sonra her değişiklik iki siteye de otomatik yansır.

## Teknik notlar

- Portal içeriği: `portal/index.html`, `portal/src/{main,App,content,styles}`, `portal/package.json`, `portal/vite.config.ts`, `portal/tsconfig.json`.
- Portal bağımsız bir Vite uygulaması; derleme komutu `bun run build`, çıktı `dist`.
- Ana uygulamanın SSR yapısına dokunulmaz; portal ayrı bir derleme hedefidir.
- Yayın kökü `portal` olduğu için ana sitenin derlemesi bu siteyi etkilemez.
