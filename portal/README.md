# Tedbirge® WebOS — Geliştirici ve SDK Portalı

`https://tedbirge.dev` adresinde yayınlanan geliştirici portalının kaynak kodu.
Bağımsız bir Vite + React uygulamasıdır; ana uygulamadan (`tedbirge.app`) ayrı derlenir.

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # üretim çıktısının yerel önizlemesi
```

## Yayın

Vercel: Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`.

## İçerik

- Başlangıç ve SDK kullanımı
- Zarf (envelope) mimarisi ve röle / store-and-forward akışı
- Çok-sıçramalı yönlendirme motoru
- Rust-Wasm çekirdek ABI'si
- Kamusal saha API'si referansı

Satıcı ve lisans veren: Mehmet DİNÇ (Tedbirge® WebOS).
