# Teslim yol haritası

- [x] Kurulum imajını Debian live-build'e taşı (kök derleme sırasında pişirilir, açılışta paket kurulmaz)
- [ ] Yeni Debian aday ISO'sunu GitHub hattında üret, yapısal doğrulama ve tüm QEMU testlerinden geçir
- [ ] Doğrulanmış Debian adayını yayınla; eski Alpine imajını indirme kanalından kaldır
- [ ] Gerçek donanımda (Gigabyte H81M-S1) yeni Debian imajıyla açılış ve kurulum doğrulaması
- [x] BIOS/UEFI QEMU testlerini taşınabilir ve kesin sonuçlu yap
- [x] Canlı açılış kökü ve servis başarı işaretini doğrula
- [x] Kalıcı disk kurulumunu BIOS/UEFI için tutarlı hale getir
- [x] Testleri ve mevcut uygulama derlemesini doğrula
- [x] Yalnız başarılı paketin yayınlanmasını güvenceye al
- [x] Disk bölümlemeyi BIOS/UEFI için ortak GPT düzeni ve açıklanabilir hata kodlarıyla sağlamlaştır
- [x] Kurulum boyunca boş konsolu kaldır; tekrar dene/canlı masaüstü/kapat kurtarma menüsünü kur
- [x] Canlı masaüstü ve ilk açılış hazır sinyalini gerçek kiosk durumu üzerinden doğrula
- [x] Etkileşimli kurucu sözleşmesi ve hata sonrası dönüş denetimlerini CI hattına ekle
- [x] Sistem kopyalama hatasını kökten çöz (desteklenmeyen ilerleme seçeneği kaldırıldı, gerçek squashfs testi eklendi)
- [x] Kopyalama hatalarını gerçek nedene göre sınıflandır (bozuk imaj / yazma hatası / bağlantı kaybı / yer yok)
- [x] Kopyalama sırasında sürekli ilerleme, dosya sayısı, geçen süre ve faaliyet göstergesi
- [x] Kurulum ekranlarında konsol fare desteği (gpm)
- [x] Kurulum sonunda gerçek açılabilirlik denetimleri (ACL-301..312) ve kurtarma menüsü
- [x] ISO iş akışında yarım kalan doğrulamanın iptalini kapat
- [ ] Gerçek donanımda yeni ISO ile kurulum kabulü (fiziksel disk gerektirir)
- [ ] Kurulum sonrası gerçek görüntülü masaüstü açılışını doğrula; GPU/ekran hatasında otomatik güvenli moda dön
- [x] Faz 4 entegrasyonu: giden mesh paketleri değişmez kapısından geçiyor, red sayacı arayüze akıyor
- [x] Faz 5 çekirdek: uygulamalar arası tipli IPC kanalı (`src/shell/desktop-ipc.ts`)
- [x] Ağ Geçidi Faz 1: adaptör kayıt defteri, inbound REST köprüsü (`/api/public/gateway/{slug}`), HMAC, 64 KB + JSON + değişmez kapısı
- [x] Ağ Geçidi Faz 2: SSRF'e karşı sertleştirilmiş outbound fetch, webhook HMAC doğrulaması
- [x] Ağ Geçidi sertleştirme: adaptör `strictHmac` tipi, giriş köprüsünde IP+slug hız sınırı ve zorunlu HMAC modu
- [x] Çıkış filtresi sertleştirmesi: 0/tamsayı/sekizli IPv4, IPv4-eşlenmiş IPv6, bulut metadata ve manuel yönlendirme zinciri denetimi
- [x] Desktop IPC güvenlik zinciri: capability jetonu doğrulama ve Merkle durum kaydı
- [ ] Ağ Geçidi Faz 3: GraphQL, gRPC, SOAP, MQTT, AMQP adaptörlerini stub'dan üretim seviyesine çıkar
- [ ] Ağ Geçidi Faz 3: WS/SSE canlı proxy köprüsü ve otomatik OpenAPI auto-probe


## Faz 4 — Arka plan servisleri
- [x] Servis kayıt defteri, watchdog, Web Locks liderliği
- [x] Mesh-sync servisi (gossip → vector clock → CRDT kuyruğu, packet-gate)
- [x] Portal servis listesi + yeniden başlat
- [x] tedbirge-truth.service + imaj denetimi
- [ ] Servis olaylarının Kayıtlar sekmesine akışı
- [ ] WebRTC eş bağlantılarında gossip kanalı (şimdilik yalnız sekmeler arası)
- [ ] tedbirge-truthd ikilisi (birim ikili yoksa atlanıyor)
