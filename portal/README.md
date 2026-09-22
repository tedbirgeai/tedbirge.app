# 🛠️ Tedbirge® WebOS — Geliştirici ve SDK Portalı

`https://tedbirge.dev` adresinde yayınlanan geliştirici portalının kaynak kodu.
Bağımsız bir **Vite + React** uygulamasıdır; ana uygulamadan (`tedbirge.app`) ayrı derlenir.

---

## 🚀 Yayın (Tek Depo, İki Site)

Portal ana uygulamayla aynı depoda (`tedbirgeai/tedbirge.app`) durur, ayrı bir site olarak yayınlanır.
Vercel panelinde **Add New Project** → aynı depo (`tedbirgeai/tedbirge.app`) seçilir ve:

| Parametre | Değer |
| :--- | :--- |
| **Root Directory** | `portal` |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Domain** | `tedbirge.dev` |

Bu ayarlar `portal/vercel.json` içinde de tanımlıdır; kök dizin `portal` seçildiğinde otomatik uygulanır. Ana site (`tedbirge.app`) kök dizinden derlenmeye devam eder ve iki yayın birbirini etkilemez.

---

## 📚 İçerik

* **🚀 Başlangıç ve SDK Kullanımı:** Düğüm başlatma, eş bağlama, mesaj/dosya taşıma ve saha ölçüm ilkeleri.
* **📦 Zarf (Envelope) Mimarisi:** İmzalı, uçtan uca şifreli taşıma birimi, röle ve store-and-forward akışı.
* **🌐 Çok-Sıçramalı Yönlendirme:** Ağ tünelleri ve yönlendirme motoru.
* **⚙️ Rust-Wasm Çekirdek ABI'si:** C-ABI soket arabirimi ve AXIOM doğrulamaları.
* **📡 Kamusal Saha API'si Referansı:** Telemetri ve taşıyıcı katman standartları.

---

## 💻 Çalıştırma

Geliştirici portalını yerel ortamınızda derlemek ve test etmek için:

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # üretim çıktısının yerel önizlemesi
