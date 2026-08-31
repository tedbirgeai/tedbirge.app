# Tedbirge® WebOS — Sürtünme Temizliği, Mobil Uyum ve ISO Akışı

## 1. Arka planda tespit edilen 2 sorun

**A. Onaylı siteler Geçit'e girmiyor (yüksek öncelik).**
Pencere içi web görünümü, uygulamanın `proxy` bilgisini alt konteynıra hiç iletmiyor. Bu yüzden Vikipedi gibi izinli hedeflerde Geçit aşaması hiç denenmiyor; pencere ~3,5 saniye bekleyip "bu servis gömmeyi kısıtlıyor" kartına düşüyor ve kullanıcı her seferinde elle "Geçit Üzerinden Çalıştır" demek zorunda kalıyor. Pencere içi arama da aynı yere düşüyor.
Çözüm: `proxy` bilgisi konteynıra iletilecek; ayrıca hedef izin listesindeyse `proxy` verilmese bile Geçit aşaması otomatik eklenecek, pencere içi arama da Geçit üzerinden koşacak.

**B. Dosyalar penceresi kapanınca müzik/video susuyor (orta öncelik).**
Dosyalar uygulaması kapanırken tüm uygulamaların ortak kullandığı dosya bağlantı havuzunu topluca iptal ediyor; çalan şarkı/video anında kesiliyor ve yeniden seçilse de açılmıyor.
Çözüm: Havuz referans sayımlı hale getirilecek; bir pencere kapanınca yalnız kendi aldığı bağlantılar bırakılacak, Müzik/Medya kendi bağlantısını yeniden üretebilecek.

## 2. Güvenlik bulgusu

Yayınlama panelindeki tek açık kayıt, veritabanı tarayıcısının "aksiyon gerektiren sorun yok" seviyesindeki uyarısı. Kod tarafında yine de sertleştirme yapılacak:
- Geçit rotasında yanıt başlıklarının mühürlenmesi (`X-Content-Type-Options`, referrer politikası, indirilen içeriğin betik çalıştırmaması için sınırlar).
- Genel API rotalarında CORS ve girdi doğrulamasının gözden geçirilmesi.
- Kod tabanında sızmış gizli anahtar / `any` tipi taraması ve temizliği.
Doğrulama sonrası bulgu "giderildi" olarak işaretlenecek.

## 3. Duvar kâğıtları ve tema

- Yeni yüksek çözünürlüklü seçenekler: Mesh Nebula, Dark Minimal, Crystal Light varyasyonu ve gradyan tabanlı gürültüsüz seçenekler (mevcut Okyanus / Doğa / Kristal / Gece / Neon korunur).
- Varsayılan açılış: göz yormayan Açık Kristal + sade gradyan; ilk açılışta hiçbir ağır görsel beklenmeden ekran gelir.
- Görünüm uygulamasında seçim anında uygulanır (React yeniden çizimi yok, doğrudan `--tb-*` değişkenleri). Sabit hex kullanımı taranıp temizlenir.

## 4. Evrensel duyarlılık (telefon / tablet / masaüstü)

- Mobil ve tablet kırılımları netleştirilir: tablet artık masaüstü pencere yöneticisini değil, geniş kart düzenini kullanır.
- Mobil pencereler tam ekran kart olarak açılır; aşağı/yana kaydırma (swipe) ile kapanır.
- Tüm dock ikonları ve pencere düğmeleri en az 48px dokunma alanına çıkarılır.
- Portre/manzara dönüşünde taşmayı engelleyen viewport kilitleri (`100dvh`, güvenli alan dolguları) tüm kabuk yüzeylerine uygulanır.

## 5. Bare-Metal ISO indirme akışı

- Üst bardaki "Sistemi Cihaza Kur" menüsüne ve Bilgisayarım > Hakkında ekranına "Bare-Metal ISO İndir (.iso)" aksiyonu eklenir.
- İndirme, `/api/public/iso` rotası üzerinden tek tıkla `tedbirge-webos-v1.0-x86_64.iso` adıyla Downloads klasörüne akar.
- Rufus / Ventoy / BalenaEtcher adımlarını anlatan şık bir rehber kartı indirme başlar başlamaz görünür.

Şeffaf not: gerçek önyüklenebilir ISO imajı, kök yetkili bir Linux makinede `scripts/build-iso.sh` ile üretilir ve yayınlanan sürüme eklenir. İmaj henüz yüklenmemişken buton, hatasız biçimde kurulum kitini (betikler + rehber) indirir ve ISO'nun nasıl üretileceğini anlatır; imaj yüklendiğinde aynı buton gerçek ISO'yu verir. Sahte/boş bir .iso dosyası üretilmez.

## 6. Geçit dayanıklılığı

- Ağır hedeflerde ilk yükleme düşmesin diye tek kademeli otomatik yeniden deneme ve kademeli zaman aşımı esnekliği eklenir.
- İzin listesinde `www.` ve kök alan adı eşleşmesi tam kapsayıcı hale getirilir; alias'lar normalize edilir.

## 7. Web kabuğu ve PWA çevrimdışı

- Oturumlu servisler (WhatsApp, LinkedIn, Spotify) için tarayıcının "bağlantı reddedildi" ekranının hiçbir koşulda görünmediği doğrulanır; her durumda Tedbirge Web Kabuğu kartı gelir.
- Service Worker precache ve `navigateFallback` yapılandırması kontrol edilir; internet tamamen kesikken F5 yapıldığında sistem yerel çekirdekten Off-Grid açılır.

## 8. Sıfır hata denetimi

- Tip denetimi, tüm birim/entegrasyon testleri ve derleme yeşile alınır.
- Kırık bağlantı, eksik ikon ve konsol uyarıları taranıp giderilir.
- Kapanışta: 2 arka plan sorunu, güvenlik bulgusu ve test sonuçları tek raporda özetlenir.

## Teknik dokunulacak yerler

`src/components/shell/TedbirgeWebView.tsx`, `GenericAppContainer.tsx`, `src/lib/shell/embed-strategy.ts`, `src/lib/shell/gateway-hosts.ts`, `src/routes/api/public/gecit.ts`, yeni `src/routes/api/public/iso.ts`, `src/lib/vfs/store.ts` + `apps/FilesApp|MusicApp|MediaApp`, `src/lib/ui/wallpaper.ts` ve yeni duvar kâğıdı görselleri, `src/components/shell/{Dock,WindowFrame,WorkspacePanel,SystemBar,InstallSystemButton}.tsx`, `src/components/shell/apps/{ComputerApp,WallpaperSettingsApp}.tsx`, `src/styles.css`, `vite.config.ts` (PWA).
