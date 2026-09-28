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
