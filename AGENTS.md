<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Mimari kuralları

- Tüm dış protokol köprüleri (REST, GraphQL, WS/SSE, Webhook, gRPC, SOAP, MQTT, AMQP)
  `src/lib/gateway/` altında kayıt olur — tek doğruluk kaynağı, böylece protokol
  ekleme UI/rota kodunu değiştirmeden yapılır.
- Giden P2P paketleri `src/lib/axiom/net/packet-gate.ts` kapısından geçmek zorundadır;
  fizik/birim ihlali olan paket ağ katmanında imha edilir.
- Uygulamalar arası mesajlaşma yalnız `src/shell/desktop-ipc.ts` üzerinden yapılır;
  doğrudan global referans paylaşımı yasak.

- Arka plan servisleri yalnız `src/shell/services/services.ts` kayıt defterine eklenir (bağımlılık, watchdog, yeniden başlatma tek yerde); `BackgroundServices.tsx` doğrudan servis başlatmaz.
- /repo'ya yalnız `SYSTEM_APPS` içinde `repo.write` sistem yeteneği olan yerleşik uygulama (AxiomStudio) `resolveRepoPath` üzerinden yazar; `.tbapp` paketleri bu yeteneği isteyemez, çünkü kaynak ağacı kullanıcı kodundan korunmalıdır.
- Doğal dil istekleri `src/lib/studio/intent.ts` ile sınıflandırılır: yalnız açık "yeni bağımsız program" isteği `/repo/apps/<slug>/` açıp masaüstü/Dock kaydı yapar; sistem bileşeni istekleri `src/lib/studio/system-patch.ts` ile yerinde uygulanır — masaüstü rastgele ikonla kirlenmesin diye.

- AssemblyScript derleyicisi yalnız `src/lib/studio/compiler.worker.ts` içinde, yükleme ve derleme ayrı süre sınırlarıyla çalışır; ana iş parçacığını ve CSP'yi gevşetmemek için.
- Üretilen/.tbapp Wasm kodu arayüzde yalnız `src/lib/studio/app-runtime.worker.ts` içinde, çağrı başına 1500 ms `terminate()` sigortasıyla çalışır; ana iş parçacığı asla bloklanmasın diye.
