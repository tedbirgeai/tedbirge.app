# Geliştirici Portalını Ayrı Projeye Taşıma

Yeni bir Lovable projesi oluşturmak ve onu bir GitHub deposuna bağlamak, yalnızca sizin hesabınızdan yapılabilen bir işlem — ben bu projenin içinden yeni proje açamıyorum. Bunun yerine taşımayı sorunsuz hale getirecek hazırlığı burada yapıp, size adım adım kısa bir yol veriyorum.

## Sizin yapacağınız (5 dakika)

1. Lovable ana sayfasında yeni bir proje oluşturun (adı: Tedbirge Geliştirici Portalı).
2. Yeni projede GitHub bağlantısını açın ve mevcut depo olarak `tedbirgeai/tedbirge.dev` seçin.
3. Yeni projenin sohbetine "portal dosyalarını buraya kur" yazın ve bu projedeki portal klasörünü kaynak olarak gösterin (@ ile bu projeyi etiketleyebilirsiniz).

## Benim burada yapacağım hazırlık

- Portal klasörünü tek başına çalışabilir bir proje olacak şekilde son kez gözden geçirmek: giriş sayfası, kaynak dosyalar, ayarlar ve paket tanımı.
- Yayın için gerekli ayar dosyasını eklemek, böylece yeni depoda ek ayara gerek kalmadan yayına alınabilsin.
- Kısa bir kurulum notu yazmak: hangi dosyanın nereye gittiği, yayın ayarları ve alan adı bağlama adımları.

## Alternatif: tek depo, iki yayın

Yeni proje açmak istemezseniz, portal bu projede kalabilir ve yayın tarafında kök klasör olarak portal seçilerek `tedbirge.dev` adresinden yayına alınabilir. Bu durumda ikinci bir depo bağlamaya gerek kalmaz.

## Teknik notlar

- Portal içeriği: `portal/index.html`, `portal/src/{main,App,content,styles}`, `portal/package.json`, `portal/vite.config.ts`, `portal/tsconfig.json`.
- Portal bağımsız bir Vite uygulaması; derleme çıktısı `dist`, derleme komutu `bun run build`.
- Ana uygulama (SSR) etkilenmez; portal taşınırken kök projede hiçbir davranış değişmez.
- Yayın tarafında kök dizin `portal`, çıktı `dist`, alan adı `tedbirge.dev`.

## Sizden onay gereken nokta

Yukarıdaki iki yoldan hangisini istiyorsunuz: ayrı proje + ayrı depo mu, yoksa tek depo içinden ikinci yayın mı?
