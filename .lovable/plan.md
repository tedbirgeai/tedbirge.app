# Faz 2 — C-ABI Olay Kancaları ve Telemetri Sinyalleri

Amaç: sistem tarafındaki olaylar (bellek koruma hatası, bellek dolması, donanım
durum değişimi, bağlantı kopması) sürekli sorgulama yapılmadan, oluştuğu anda
arayüze düşsün; hiçbiri arayüzü dondurmasın ve hiçbir günlük tutulmasın.

## 1. Olay tabanlı dinleyici (polling yok)

- Köprü çerçevesine ikinci bir mesaj türü eklenir: istemcinin sormadığı, sunucunun
  kendiliğinden gönderdiği **olay** satırları. Yanıt satırları bugünkü gibi istek
  numarasıyla eşleşir; numarası olmayan satırlar olay akışına yönlendirilir.
- Hem yerel soket hem tarayıcı bağlantısı aynı akışı besler. Bağlanma, kopma ve
  yeniden deneme durumları da aynı akışa olay olarak yazılır — böylece arayüz tek
  bir kaynağı dinler.
- Olaylar bellekte son 50 kayıtla sınırlı bir halkada tutulur; disk veya buluta
  hiçbir şey yazılmaz. Tanınmayan çerçeve sessizce düşer, bağlantı bozulmaz.
- Olay metinleri kullanıcıya sade Türkçe görünür: "bellek koruma hatası",
  "bellek doldu", "donanım durumu değişti", "bağlantı koptu". Ham sinyal adları
  arayüzde gösterilmez; yalnız teknik kod alanı olarak taşınır.

## 2. Çift yönlü telemetri ve izolasyon kalkanı

- Her köprü isteği iptal edilebilir bir kalkanla sarılır: 500 ms yumuşak bütçe,
  750 ms sert sınır. Yumuşak bütçe aşılırsa istek iptal edilir ve yerel motora
  düşülür; sert sınır aşılırsa bağlantı kapatılıp yeniden kurulur.
- Sert sınıra takılan her olay, arayüze "çekirdek yanıt vermedi, yerel kapıya
  düşüldü" olarak bildirilir. Girdi metni hiçbir olaya konmaz.
- Çekirdek/donanım kaynaklı hata olayları arayüzü çökertmez; mevcut yerel kapı
  davranışı korunur ve sahte "kanıtlandı" mührü üretilmez.

## 3. C tarafı kanca sözleşmesi

- Başlık dosyasına olay yapısı ve geri çağırma kaydı eklenir: uygulama bir kanca
  bırakır, sistem sinyali yakaladığında bu kanca çağrılır (sorgulama döngüsü yok).
- Yapı boyutu açık dolgu ile doğal 4 bayt sınırına çekilir ve derleyici
  seviyesinde boyut/hizalama iddiaları eklenir — Faz 1'deki 212 baytlık kanıt
  yapısıyla aynı disiplin.
- Sinyal işleyicileri yalnız olayı kuyruğa koyar; içinde tahsis, yazma veya
  günlükleme yapmaz.

## 4. Bütünlük ve test geçitleri

- Yeni testler: olay çerçevesi çözümleme, numarasız satırın olay akışına gitmesi,
  50 kayıtlık halka sınırı, bozuk çerçevenin yok sayılması, yumuşak bütçe iptali,
  sert sınırda bağlantının kapanıp yeniden kurulması, bağlanma/kopma olaylarının
  akışa düşmesi.
- Kapılar: tip denetimi, tüm test paketi, biçim denetimi, `security:check`,
  derleme — sonuçlar tek tabloda raporlanır.

## Teknik notlar

- Yeni dosyalar: `src/lib/axiom/bridge/events.ts` (olay tipleri, sade Türkçe
  eşleme, halka arabellek, abonelik ve anlık görüntü önbelleği),
  `src/lib/axiom/bridge/shield.ts` (`AbortController` + 500/750 ms bütçe sarmalı),
  `src/lib/axiom/bridge/__tests__/events.test.ts`,
  `src/lib/axiom/bridge/__tests__/shield.test.ts`.
- Dokunulacak dosyalar: `bridge/types.ts` (olay çerçevesi tipi ve sürüm),
  `bridge/socket.server.ts` ve `bridge/wss.ts` (numarasız satır → olay akışı,
  istek sarmalı), `bridge/index.ts` (olay aboneliğini dışa açma),
  `src/components/axiom/BridgeStatusCard.tsx` (son olayların sade listesi),
  `src/lib/axiom/sdk/tedbirge_truth.h` (olay yapısı + kanca kaydı + boyut/hizalama
  iddiaları).
- Korunacaklar: mevcut `axiom.verify` sözleşmesi, `VERIFY_TIMEOUT_MS` bütçesi,
  worker bekçisi, `limen_mount_lock`, Faz 1 dosya izin modeli, tüm renkler
  `--tb-*` değişkenlerinden; CDN ve harici istek yok, günlük tutulmaz.
