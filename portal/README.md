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

## Yayın (tek depo, iki site)

Portal ana uygulamayla aynı depoda durur, ayrı bir site olarak yayınlanır.
Vercel panelinde **Add New Project** → aynı depo (`tedbirgeai/tedbirge.app`) seçilir ve:

- **Root Directory:** `portal`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Domain:** `tedbirge.dev`

Bu ayarlar `portal/vercel.json` içinde de tanımlıdır; kök dizin `portal` seçildiğinde
otomatik uygulanır. Ana site (`tedbirge.app`) kök dizinden derlenmeye devam eder ve
iki yayın birbirini etkilemez.


## İçerik

- Başlangıç ve SDK kullanımı
- Zarf (envelope) mimarisi ve röle / store-and-forward akışı
- Çok-sıçramalı yönlendirme motoru
- Rust-Wasm çekirdek ABI'si
- Kamusal saha API'si referansı

Satıcı ve lisans veren: Mehmet DİNÇ (Tedbirge® WebOS).
