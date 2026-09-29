# Üretilen uygulamaları ayrı işçide çalıştırma ve 1,5 sn sert kesme

## Hedef

Üretilen uygulamaların çekirdek (Wasm) çağrıları artık ana arayüzde değil, her uygulamaya özel bir işçi iş Onaylıyorum, harika bir teknik tespit! Lütfen önerdiğin gibi çekirdek ve dinamik uygulama yürütme katmanını ayrı bir Web Worker iş parçacığına (kernel.worker.ts / Dedicated Worker) taşı. 

Şu özellikleri eksiksiz implement et:

1. Çekirdek ve üretilen kodlar ana thread'i asla bloklamayacak şekilde worker içinde çalışsın.

2. 1500 ms (1.5 saniye) zaman aşımı sınırını aşan veya sonsuz döngüye giren işlemler için worker.terminate() ile sert ve güvenli bir kesme (hard-kill) mekanizması devreye girsin.

3. Worker tarafında hata oluştuğunda ana kabuğa (Shell) güvenli IPC mesajı ile bildirilsin ve kullanıcıya Türkçe net bir hata raporu sunulup sistemin kararlılığı korunmaya devam etsin.parçacığında çalışacak. 1,5 saniyeyi aşan veya sonsuz döngüye giren çağrıda işçi zorla sonlandırılacak; pencere Türkçe hata raporu gösterecek, masaüstü donmayacak.

## Yapılacaklar

1. **Uygulama işçisi (`src/lib/studio/app-runtime.worker.ts`)**
  - Modülü alır, yalnız `tedbirge` köprüsüyle (log, status_peers, status_online) açar. Durum değerleri ana taraftan her çağrıyla birlikte gönderilir; işçi ağa/depoya erişmez.
  - Mesajlar: `init`, `call(fn, args, status)`, yanıtlar `ready`, `result`, `log`, `error`. Hatalar kullanıcı verisi içermeyen kısa Türkçe metne çevrilir.
2. **İşçi istemcisi (`src/lib/studio/app-runtime.ts`)**
  - Uygulama başına tek işçi; her çağrıya 1500 ms zamanlayıcı. Süre dolarsa `worker.terminate()`, durum "durduruldu", bekleyen çağrılar reddedilir.
  - `onerror` / `messageerror` ve modül yükleme hataları da aynı yola düşer. "Yeniden başlat" yeni işçi kurar.
  - Worker yoksa (eski tarayıcı) uygulama çalıştırılmaz, açık hata gösterilir — ana iş parçacığında yedek çalıştırma yapılmaz (donma riskini geri getirir).
3. **Kabuğa bildirim (desktop IPC)**
  - Kesme ve çökme olayları `src/shell/desktop-ipc.ts` üzerinden yeni `app.fault` türünde kabuğa iletilir (appId, neden: `timeout` | `crash` | `load`, süre). Kabuk tarafı bildirim merkezine Türkçe rapor düşer.
  - Mevcut doğrudan `notify()` yedeği kaldırılır; bildirim bloğu da IPC yolunu kullanır.
4. **Çalıştırıcı güncellemesi (`GeneratedAppRunner.tsx`)**
  - `instantiateTbApp` + senkron `runGuarded` yerine asenkron işçi istemcisi; düğmeler çağrı sürerken "çalışıyor…" durumunda.
  - Hata kartı: neden, süre, "Yeniden başlat" ve "Günlüğü kopyala".
5. **Testler (Vitest)**
  - Sahte işçi ile: normal yanıt, 1500 ms aşımında `terminate` çağrısı ve reddedilen çağrı, çökme olayı → IPC `app.fault`, yeniden başlatma yeni işçi kurar.
  - Eski `runGuarded` testleri kaldırılır/yenilenir.
6. **Doğrulama:** tip denetimi, tüm testler, derleme ve canlı önizlemede sonsuz döngülü örnek uygulamayla masaüstünün yanıt vermeye devam ettiğinin gözlenmesi.

## Kapsam dışı / dürüst notlar

- AXIOM doğrulama işçisi (`src/lib/axiom/kernel.worker.ts`) ve ağ çekirdek işçisi zaten ayrı iş parçacığında; bu plan yalnız üretilen uygulamaları taşır.
- Sert kesme çağrı düzeyindedir: kesilen uygulamanın bellekteki durumu (ör. sayaç) sıfırlanır.

## Teknik ayrıntılar

- AGENTS.md'ye kural: "Üretilen/.tbapp Wasm kodu yalnız `app-runtime.worker.ts` içinde, çağrı başına 1500 ms terminate sigortasıyla çalışır; ana iş parçacığını korumak için."
- İşçi `new Worker(new URL("./app-runtime.worker.ts", import.meta.url), { type: "module" })` ile, Vite worker formatı zaten `es`.