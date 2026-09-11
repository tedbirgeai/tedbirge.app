# Tedbirge® WebOS — Denetim Sonucu ve Kapatma Planı

Sistemi beş eksen üzerinden taradım. Çoğu madde tamam; **üç gerçek pürüz** ve **iki doğrulanması gereken nokta** kaldı.

## Denetim özeti

Tamam olanlar (dosya bazında görüldü):
- Kurulum ve ISO altyapısı: `image/config/hooks/normal/9000-tedbirge.hook.chroot`, `image/profiles/common.list`, `image/install/tedbirge-kur`, Plymouth teması `image/config/includes.chroot/.../themes/tedbirge/tedbirge.plymouth` yerinde.
- Üst bar titreme çözümü: `src/lib/shell/peer-status.ts` ayrı bir kaynak olarak duruyor, panel bileşenleri ağ verisine bağlı değil.
- Pencere sıralaması tek kaynaktan: `z` değeri yalnız pencere durumundan okunuyor, bileşende sabit sıra yok.
- `.tbapp` imza ve şifreli uygulama alanı akışı kurulu.

## Kapatılacak pürüzler

### 1. Küçültülen pencereler arka planda çalışmıyor
`WindowFrame` küçültülünce içeriği tamamen kaldırıyor; müzik, indirme, sohbet gibi işler duruyor ve geri açınca uygulama sıfırlanıyor. Çözüm: pencere içeriği bellekte kalacak, yalnız görünmez hale gelecek.

### 2. Açılamayan dosya türü sessiz kalıyor
Tanınmayan bir dosyaya çift tıklanınca hiçbir şey olmuyor. Çözüm: "Bu dosyayı açacak uygulama yok" kartı; dosya bilgisi, dışa aktarma ve metin olarak açma seçenekleriyle.

### 3. Çevrimdışı çalışmayı bozan dış bağımlılıklar
- Yazı tipleri Google sunucusundan çekiliyor (`src/routes/__root.tsx`): ağsız cihazda yazı tipi düşer. Çözüm: yazı tiplerini paket içine alıp yerelden servis etmek.
- Ödeme betiği (`src/lib/paddle.ts`) dış kaynaktan yükleniyor: bu yalnız ödeme sayfasında çalışacak şekilde sınırlanacak, işletim sistemi kabuğuna hiç girmeyecek.

### 4. Doğrulanacak iki nokta
- Kapanış ekranı ("Tedbirge Kapanıyor...") ile açılış ekranının aynı temadan geldiğini ve `quiet splash` ile uyumunu derleme kapısına bağlamak.
- Kurulum bitişinde fallback `BOOTX64.EFI`, initramfs ve `/sbin/init` kontrollerinin hepsinin başarısızlıkta kurulumu "%100" saymadığını tek bir sözleşme testinde toplamak.

## Teknik uygulama

- `src/components/shell/WindowFrame.tsx`: `if (win.minimized) return null` yerine görünürlük gizleme (`hidden` + `aria-hidden`, pointer/tab dışı), ölçüm ve odak mantığı korunur.
- `src/lib/office/documents.ts` + `FilesApp`/`Desktop` açma yolu: `kindOf()` null dönerse yeni `UnsupportedFileCard` bileşeni gösterilir.
- Yazı tipleri `public/fonts` altına alınır, `src/styles.css` içinde `@font-face` ile tanımlanır, `__root.tsx` içindeki dış `link` etiketleri kaldırılır.
- `src/lib/paddle.ts` yükleyicisi yalnız ödeme rotalarından çağrılacak biçimde tembelleştirilir.
- `scripts/test-installer-contract.sh` ve `scripts/validation-gates.sh`: plymouth tema + `quiet splash` ve ACL-3xx boot kontrolleri için ek doğrulama.
- Kapılar: `bunx tsgo --noEmit`, `bunx vitest run`, installer contract, ISO bundle kontrolü.

Gerçek donanımda USB açılış testi bu ortamda yapılamaz; onu yine GitHub derlemesi ve fiziksel makine üstlenir.
