# Tedbirge® WebOS

**Altyapıdan bağımsız bağlantı.** Tedbirge® WebOS; Ethernet, Wi-Fi, hücresel, uydu, WiGig, FSO lazer, Wi-Fi HaLow, TVWS ve LoRa olmak üzere dokuz fiziksel taşıyıcıyı tek bir güvenli ağ geçidi altında birleştiren, kesinti anında otomatik devreye giren bağımsız bir mesh iletişim platformudur.

Üretici / satıcı: **Mehmet DİNÇ (Tedbirge® WebOS)** — Türkiye  
Canlı Platform: <https://tedbirge.app>  
Geliştirici & Teknik Portal: <https://tedbirge.dev>  

---

## Modüller

| Modül | İşlev |
| --- | --- |
| **Tedbirge® WebOS** | Çok taşıyıcılı ağ geçidi; taşıyıcı seçimi, sağlık ölçümü ve otomatik yedekleme (failover). |
| **Tedbirge Loop** | Düğümler arası mesh yönlendirme, çoklu atlama (multi-hop) ve topoloji keşfi. |
| **Tedbirge Off-Grid** | Bağlantı yokken mesajları kuyruklayıp bağlantı geri geldiğinde teslim eden kopukluğa dayanıklı katman. |

## Güvenlik

- Uçtan uca şifreleme: **AES-256-GCM**
- Düğüm kimliği ve imzalama: **Ed25519**
- Sıfır-bilgi tünel tasarımı: ağ geçidi taşınan içeriği göremez
- Telemetri yalnızca metrik taşır (RTT, throughput, paket kaybı); kullanıcı içeriği taşınmaz

## Regülasyon ve Uyum

Tüm bant/limit verileri tek doğruluk kaynağında (`src/lib/regulation.ts`) tutulur ve `/mevzuat` sayfasında yayımlanır.

- **Türkiye:** 5809 sayılı Kanun, BTK KEGY Yönetmeliği, 6698 sayılı KVKK, 5651 sayılı Kanun log yükümlülükleri
- **Avrupa:** ETSI EN 300 220, EN 301 893, EN 18031 (siber güvenlik), RED 2014/53/EU
- **ABD:** FCC Part 15.247 / 15.407
- **İhracat kontrolü:** Wassenaar Düzenlemesi kapsamında kriptografi beyanı
- Bölge profilleri (TR/EU/US/UK/GCC/APAC/JP) düğüm bazında kilitlenir; TR profilinde 868 MHz için 25 mW e.r.p. ve %1 duty cycle sınırı uygulanır.

## Platform

- Web: TanStack Start (React 19, Vite 7, Tailwind CSS v4)
- Backend: yönetilen Postgres + satır düzeyi güvenlik (RLS), sunucu fonksiyonları
- PWA: mobil, tablet ve masaüstünde kurulabilir
- Telemetri API'si: `POST /api/public/telemetry` — lisans anahtarı ile kimlik doğrulama, hız sınırlı
- OpenAPI 3.1 tanımı: `/api/public/openapi.json`

## Geliştirme

```sh
git clone [https://github.com/tedbirgeai/tedbirge.app.git](https://github.com/tedbirgeai/tedbirge.app.git)
cd tedbirge-gateway
npm install
npm run dev
