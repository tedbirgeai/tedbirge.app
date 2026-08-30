# Tedbirge® Geçit — İzin Listesi Genişletmesi (Kamusal ve Oturumsuz Servisler)

Amaç: pencere içinde açılabilen servis sayısını artırmak; yeni sekmeye düşen servis sayısını azaltmak. Mimari, pencere yöneticisi, VFS ve çekirdek değişmez.

## Kapsam kuralı (değişmez sınır)

Geçide yalnızca şu üç şartı sağlayan hedefler eklenir:

1. Kamusal ve oturumsuz (giriş, çerez veya hesap gerektirmez)
2. Salt-okunur (GET; form gönderimi arama sorgusuyla sınırlı)
3. Kullanım şartları makine erişimini yasaklamıyor

WhatsApp, LinkedIn, Google hesabı, Spotify gibi oturumlu servisler listeye **girmez** — bunlar Web Kabuğu kartı ve "Harici Sekmede Aç" ile çalışmayı sürdürür. Bu, "Tedbirge VPN/proxy değildir" sınırının korunması için zorunludur.

## Eklenecek servisler

- Bilgi: Wikimedia projeleri (wiktionary, wikisource, wikidata, commons), Wikiwand yerine doğrudan Wikipedia dil alanları
- Arama: DuckDuckGo lite/html, Startpage, Ecosia, Marginalia, SearXNG kamusal örneği
- Harita ve açık veri: OpenStreetMap, OpenTopoMap kutucukları, Overpass Turbo, NASA Worldview
- Haber ve akış: Hacker News, Lobsters, RSS/Atom uçları, Reuters/AA gibi statik haber sayfaları yerine yalnızca açık RSS köprüleri
- Teknik: MDN, docs.rs, crates.io, pypi.org, GitHub raw ve gist içerikleri (salt-okunur)
- Zincir/veri: Blockscout, Etherscan sayfa görünümü yerine Blockscout, IPFS ağ geçitleri, CoinGecko
- Standart ve mevzuat: resmi gazete arşiv sayfaları, ETSI/ITU açık doküman dizinleri

Her ekleme, uygulamadan önce tek tek 200 yanıtı ve gömülebilirlik açısından doğrulanır; başarısız olan hedef listeye alınmaz.

## Davranış değişikliği

- `web-apps.ts` içinde geçide uygun uygulamalara `proxy: true` verilir; böylece pencere içi zincir: gömme dostu adres → Geçit → doğrudan adres.
- Geçide uygun olmayan uygulamalar `popup` olarak kalır; Web Kabuğu kartında logo, açıklama ve **"Harici Sekmede Aç"** birincil eylem olarak korunur.
- Geçit uygun olduğunda kart üzerinde "Geçit Üzerinden Çalıştır" düğmesi görünür kalır (yedek yol).
- Hiçbir durumda tarayıcının kendi "bağlanmayı reddetti" ekranı görünmez.

## Güvenlik ve sınırlar (mevcut korumalar korunur)

- Yalnız `https` + GET; POST engelli
- Çerez, `Authorization` ve `Referer` hiçbir yöne taşınmaz
- 4 MB gövde sınırı, 12 sn zaman aşımı
- `X-Frame-Options` / `frame-ancestors` temizliği, COEP `credentialless`
- Yeni: alan adı başına basit hız sınırı ve yanıt önbelleği (60 sn) ile hedef sitelere yük bindirmemek

## Teknik notlar

- Güncellenecek: `src/routes/api/public/gecit.ts` (`ALLOWED_HOSTS` genişletme + hız sınırı), `src/lib/shell/embed-strategy.ts` (istemci kopyası `GATEWAY_HOSTS` eşitlenir), `src/shell/web-apps.ts` (`proxy` alanları).
- Yeni: `src/lib/shell/gateway-hosts.ts` — izin listesi tek kaynak hâline gelir, sunucu ve istemci aynı diziyi kullanır; bir birim testi iki tarafın sapmadığını doğrular.
- Doğrulama: `bunx tsgo --noEmit` 0 hata, birim testleri geçer, Playwright ile üç yeni hedefin (arama, harita, dokümantasyon) pencere içinde yüklendiği ve bir oturumlu hedefin (WhatsApp) Web Kabuğu kartına düştüğü ekran görüntüsüyle teyit edilir.
- Renkler yalnız `--tb-*` değişkenlerinden okunur; sabit hex eklenmez.
