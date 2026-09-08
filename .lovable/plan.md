# Tedbirge® WebOS — Kurumsal Gelecek Vizyonu, Misyon, Değerler ve Strateji Raporu

**Görev:** Sevimli İçin Görev  
**Hazırlayan:** Lovable  
**Mimari / Satıcı:** Mehmet DİNÇ (Tedbirge® WebOS)  
**Durum:** Salt-okunur strateji tasarısı — henüz kod veya dosya değişikliği yok.  
**Onay akışı:** Bu rapor onaylandığında; `src/lib/business-plan.ts`, web sitesi metinleri, yatırımcı sunumu ve iş planı dokümanları bu çerçeveye göre güncellenir.

---

## 1. Özet (Executive Summary)

Tedbirge® WebOS, taşıyıcı-bağımsız (PHY-agnostic), sıfır-bilgi, dayanıklı bir iletişim overlay katmanıdır. Fiziksel altyapı yatırımı yapmadan; telekom operatörlerini rakip değil taşıyıcı olarak kullanarak, afet, kritik altyapı, enerji/maden, kırsal bağlantı ve kurumsal saha operasyonlarına kesintisiz iletişim sağlar.

Ticari model **Resilience-as-a-Service (RaaS)** üzerine kuruludur: Freemium → Community → Enterprise → Operator. Gelir, düğüm başı abonelik, pilot kurulum hizmetleri, uyum dosyası hazırlığı ve operatör ortaklıklarından oluşur.

Bu rapor; Tedbirge® WebOS'un 2030 vizyonunu, misyonunu, dokunulmaz değerlerini, beş stratejik yönünü ve kademeli hedeflerini tanımlar. "Sevimli" perspektifi; teknik jargon yerine insan-okunur, güven veren ve yargılamayan bir rehberlik diliyle stratejiyi ifade etmektir.

---

## 2. Vizyon

> **2030'a kadar, Tedbirge® WebOS; dünyanın her yerindeki kritik operasyonlar için "iletişim dayanıklılığının varsayılan katmanı" olur.**

Kesinti, afet, sansür veya altyapı yetersizliği durumlarında bile; kurumlar, ekipler ve topluluklar, sahip oldukları her cihaz üzerinden, uçtan uca güvenli ve sürdürülebilir bir şekilde iletişim kurar. Telekom altyapısı bozulduğunda Tedbirge® WebOS devreye girer; altyapı sağlandığında ise onu şeffaf bir güvenlik ve süreklilik katmanı olarak zenginleştirir.

Vizyonun üç direği:

```text
Dayanıklılık    : Kesinti anında iletişim kesilmez.
Sıfır-Bilgi     : Ara düğümler içeriği göremez, kanıtlanabilir.
Taşıyıcı-Agnostik: IP, LoRa, HaLow, Uydu, Hücresel... hepsi aynı yönetim düzleminde.
```

---

## 3. Misyon

> **İletişimi altyapıya bağımlı olmaktan çıkarıp; cihazda başlayan, uçtan uca şifreli, taşıyıcı-bağımsız ve insan merkezli bir iletişim işletim sistemi sunmak.**

Tedbirge® WebOS;

- **Afet ve kamu** ekiplerine, klasik iletişim çöktüğünde bile koordinasyon imkanı verir.
- **Kritik altyapı** operatörlerine (enerji, su, ulaşım, maden) saha-saha süreklilik sağlar.
- **Kırsal bağlantı** kullanıcılarına, pahalı altyapı yatırımına gerek kalmadan güvenilir iletişim sunar.
- **Kurumsal saha** ekiplerine; maden, inşaat, lojistik, tarım gibi ortamlarda kendi ağlarını kurma özerkliği verir.

Misyon, "ücretsiz internet dağıtıcısı", "public VPN" veya "proxy" olmak değildir. Tedbirge® WebOS yalnızca ağ içi, izinli ve yönetilebilir overlay iletişimi taşır.

---

## 4. Temel Değerler

| # | Değer | Anlamı | Arayüz / İletişimde Nasıl Görünür? |
|---|-------|--------|-----------------------------------|
| 1 | **Dayanıklılık** | Kesinti anında iletişim durmaz; store-and-forward, çoklu taşıyıcı ve otomatik yedekleme ile süreklilik sağlanır. | "Bağlantı koptuğunda mesajlarınız cihazınızda güvenle bekler." |
| 2 | **Sıfır-Bilgi Gizliliği** | Röle düğümleri içeriği göremez; yalnızca hedef cihaz uçtan uca şifreyi çözer. | "İçeriği sadece siz ve karşı taraf görürsünüz; aradaki düğümler sadece taşır." |
| 3 | **Taşıyıcı Bağımsızlığı** | Ethernet, Wi-Fi, Hücresel, Uydu, LoRa, HaLow, FSO, TVWS, WiGig tek yönetim düzleminde. | "Hangi hat çalışıyorsa otomatik onu kullanırız." |
| 4 | **Açıklık & Kanıt** | Kaynak kod, kanıt taşıma, saha ölçümleri ve uyum beyanları şeffaftır. | "Her pilotun izin, uyum ve ölçüm kaydı arşivlenir." |
| 5 | **İnsan Merkezlilik** | Teknik jargon (Ed25519, AES-GCM, nonce vb.) arayüzde gizlenir; Sevimli rehberliğiyle anlaşılır dil kullanılır. | "Karmaşık terimler yerine size ne anlama geldiğini söyleriz." |
| 6 | **Yasal Sorumluluk** | Ücretsiz internet dağıtıcısı/VPN/proxy konumlanması yasaktır; uyum önce gelir. | "Yasal sınırlar içinde çalışırız; spektrum ve veri kurallarına uyarız." |
| 7 | **Ölçülen İddia** | Tasarruf, süreklilik veya SLA oranları, saha ölçümü yapılmadan pazarlama materyalinde iddia edilmez. | "Rakamları ölçmeden söylemeyiz." |

---

## 5. Stratejik Yönler

### 5.1 Ürün Stratejisi

- **Tek marka, yedi katman:** Görünür tek marka "Tedbirge® WebOS" olur. Alt markalar işlevsel katman adlarıdır: Gateway, Trust, Edge, Loop, Off-Grid, Sense, Console, Relay.
- **Cihaz-öncelikli mimari:** Tarayıcı PWA, mobil Capacitor kabuğu, Tauri masaüstü ve bare-metal ISO aynı çekirdek (Rust/Wasm) ve aynı kimlik/şifreleme modelini paylaşır.
- **Offline-first:** Cihazda üretilen TOTP, IndexedDB VFS, store-and-forward kuyruk ve çevrimdışı PWA; harici SMS sağlayıcısı (Twilio vb.) kullanılmaz.
- **Sıfır-konfigürasyon deneyimi:** Son kullanıcı için anahtar teslimi ISO kurulumu, tek tıklamalı PWA kurulumu ve otomatik röle zinciri.
- **İnsan dostu kurulum:** whiptail sihirbazı, açıklanabilir hata kodları, boş ekran yerine sürekli ilerleme, kurtarma menüsü ve gerçek masaüstü hazır sinyali.

### 5.2 Pazar Stratejisi

| Segment | Öncelik | Giriş Kapısı |
|---------|---------|--------------|
| Afet & Kamu | Yüksek | Sakarya pilotu → AFAD / belediye referansı |
| Kritik Altyapı (enerji, su, ulaşım) | Yüksek | Kesinti sürekliliği SLA'sı |
| Enerji / Maden | Yüksek | Saha operasyonu ve uzak tesisler |
| Kırsal Bağlantı | Orta | Topluluk tabanlı Community paketi |
| Kurumsal Saha (lojistik, tarım, inşaat) | Orta | Düğüm başı abonelik, hızlı devreye alma |
| Taşıyıcı / Operatör Ortaklığı | Uzun vade | Beyaz etiket ve gelir paylaşımı |

Konumlandırma globaldir; site dili Türkçe, hedef pazar yalnızca Türkiye değildir. Yasal sınırlar dahilinde her bölgeye açığız.

### 5.3 İş Modeli Stratejisi (RaaS)

| Paket | Hedef Kitle | Gelir Mekaniği |
|-------|-------------|----------------|
| Freemium | Bireysel / küçük ekip deneme | Ücretsiz, sınırlı düğüm; ücretli yükseltme yolu |
| Community | STK, köy derneği, küçük işletme | Düğüm başı aylık abonelik, temel telemetri |
| Enterprise | Kurum, kritik altyapı, kamu | SLA, rol bazlı panel, uyum raporlaması, öncelikli destek |
| Operator | Telekom / entegratör / ISP | Gelir paylaşımı, beyaz etiket, özel kapsam |

Ek gelir kalemleri: pilot kurulum hizmeti, saha eğitimi, uyum dosyası hazırlığı, özel entegrasyon.

### 5.4 Teknoloji Stratejisi

- **Rust + Wasm çekirdek:** Yönlendirme ve durum hesabı Rust'ta; tarayıcı/masaüstü Wasm ile hızlandırılır. TypeScript çekirdek her zaman geri düşüş (fallback) olarak hazır.
- **WebRTC + Web Push:** Tarayıcı tabanlı düğüm oluşturma, sesli iletişim ve VAPID bildirimleri.
- **Çoklu taşıyıcı:** 9 fiziksel katman desteği (Ethernet, Wi-Fi, Hücresel, Uydu, WiGig 60 GHz, FSO Lazer, Wi-Fi HaLow, TVWS, LoRa).
- **Yazılımsal spektrum sınırı:** `src/lib/regulation.ts` tek doğruluk kaynağı; BTK, ETSI, FCC tavanları kodda uygulanır.
- **CI/CD ve ISO:** GitHub Actions'ta Debian live-build ile Workstation ve Touch & Mobile ISO'ları; GitHub Releases'e otomatik yayın.
- **Açık kaynak çekirdek:** Rust çekirdek ve ABI belgeleri geliştirici portalında (tedbirge.dev) paylaşılır; topluluk katkısı hedeflenir.

### 5.5 Marka ve İletişim Stratejisi

- **Tek marka disiplini:** Arayüz ve dokümanlarda "Tedbirge Protokol/Protocol" ifadesi kullanılmaz. Tek görünen marka "Tedbirge® WebOS" ve onun alt katman adlarıdır.
- **Sevimli dili:** Karmaşık kriptografi ve ağ terimleri yerine; "E2EE", "Sıfır-bilgi", "Doğrulanmış düğüm rozetleri", "Güvenli zarf" gibi kullanıcı dostu kavramlar.
- **İçerik pazarlama:** Saha raporları, pilot ölçümleri, kanıt taşıma ve uyum beyanları ile güven inşa edilir.
- **Geliştirici portalı:** `tedbirge.dev` üzerinden SDK, API referansı, Zarf mimarisi ve Wasm ABI belgeleri.
- **Sosyal kanıt:** Pilot kurum referansları, saha ölçümü videoları ve bağımsız denetim özetleri.

### 5.6 Uyum ve Güven Stratejisi

- **Tek kaynak:** `src/lib/regulation.ts` ve `/mevzuat` hub; tüm spektrum/uyum verisi buradan yönetilir.
- **Regülasyon kapsamı:** BTK (TR), ETSI (EU), FCC (US); 868 MHz 25 mW %1 duty-cycle gibi sınırlar yazılımda uygulanır.
- **Veri uyumu:** KVKK / GDPR; röle düğümünde kişisel veri işlenmediği teknik olarak kanıtlanabilir.
- **5651 sınırı:** Genel internet dağıtımı yapılmaz; düğüm sahibi sağlayıcı konumuna düşmez.
- **İhracat kontrolü:** Wassenaar kapsamı gözetilir; ülke bazlı kısıtlar satış öncesi kontrol edilir.
- **Kanıt zinciri:** Her pilot için izin, uyum beyanı ve kanıt karması arşivlenir.

### 5.7 Operasyonel Strateji

- **Pilot-öncelikli büyüme:** Sakarya saha pilotu → referans dosyası → ikinci pilotlar → kurumsal satış.
- **Telemetry → Saha Raporu:** `/api/public/telemetry` uçlarından toplanan RTT, verim, paket kaybı verisi `/saha-raporu` akışına dönüştürülür.
- **Metric odaklı yönetim:** Aktif düğüm, MRR, düğüm kaybı oranı, pilot→sözleşme dönüşümü haftalık izlenir.
- **Ekip kademelendirme:** Tek kişiye bağımlılığı kırmak için dokümantasyon, kod sahipliği ve kademeli işe alım planı.

---

## 6. Hedefler

### 6.1 Kısa Vade (0–12 ay)

1. **Sakarya pilotunu tamamla:** RTT, paket kaybı, kesinti süresi ve enerji bütçesi ölçümlerini topla.
2. **İlk saha raporunu ve uyum dosyasını hazırla:** PDF rapor, izin ekleri ve kanıt karması.
3. **Freemium / Community ödeme akışını canlıya al:** Paddle entegrasyonu (önceden ertelenmişti) veya alternatif canlı ödeme yöntemi.
4. **PWA kurulum deneyimini stabilize et:** Cep telefonu, tablet ve masaüstünde tek dokunuşla kurulum.
5. **Workstation ve Touch & Mobile ISO'larını stabilize et:** BIOS/UEFI kurulum, gerçek donanım kabul testi.
6. **5 kurumsal / kamu görüşmesi yap:** Pilot öncesi ihtiyaç tespiti ve fiyat testi.
7. **Geliştirici portalını (tedbirge.dev) zenginleştir:** SDK, API referansı, Wasm ABI belgeleri.

### 6.2 Orta Vade (1–3 yıl)

1. **Türkiye'de 3–5 referans kurum:** AFAD, belediye, enerji dağıtım şirketi veya maden operatörü.
2. **10.000 aktif düğüm:** Community + Enterprise toplamı.
3. **Enterprise ve Operator paketlerini olgunlaştır:** SLA, rol bazlı panel, uyum raporlaması, öncelikli destek.
4. **AB ve ABD spektrum profilleri:** BTK/ETSI/FCC uyumlu bölgesel yapılandırmalar.
5. **Taşıyıcı / operatör ortaklıkları:** İlk 2-3 entegratör anlaşması.
6. **Açık kaynak Rust çekirdek topluluğu:** GitHub üzerinde katkıcı kılavuzu ve issue/PR akışı.
7. **Sürdürülebilir MRR:** Temkinli senaryoda aylık yinelenen gelir ile nakit dengesi.

### 6.3 Uzun Vade (3–5 yıl)

1. **Global dayanıklılık standardı olma:** En az 2 kıtada aktif kurumsal müşteri.
2. **100.000+ aktif düğüm:** Community, Enterprise ve Operator ağlarının toplamı.
3. **Taşıyıcı/operatör ortaklık ağı:** 10+ beyaz etiket veya gelir paylaşımlı ortak.
4. **"Tedbirge® WebOS Ready" sertifikasyonu:** Donanım ve entegratör uyumluluk programı.
5. **Kamusal dayanıklılık ihalelerinde tercih edilen çözüm:** Afet ve kritik altyapı projelerinde referans teknoloji.
6. **Sürekli inovasyon:** Yeni taşıyıcılar (örn. uydudan doğrudan cihaz), enerji verimliliği ve kuantum-sonrası kripto hazırlığı.

---

## 7. Başarı Göstergeleri (KPI'lar)

| Alan | KPI | Hedef (12 ay) | Hedef (3 yıl) |
|------|-----|---------------|---------------|
| Büyüme | Aktif düğüm sayısı | 1.000 | 10.000 |
| Gelir | Aylık Yinelenen Gelir (MRR) | İlk gelir akışı | Sürdürülebilir seviye |
| Dönüşüm | Pilot → Sözleşme oranı | %20 | %35 |
| Teknik | Ortalama RTT (Sakarya pilotu) | < 100 ms | < 50 ms |
| Teknik | Paket kaybı oranı | < %1 | < %0,5 |
| Operasyon | ISO kurulum başarı oranı | %95 | %99 |
| Uyum | Denetim / uyum beyanı geçiş oranı | %100 (pilot başına) | %100 |
| Müşteri | Kurumsal müşteri memnuniyeti (NPS) | > 40 | > 50 |

---

## 8. Riskler ve Azaltım Notları

| Risk | Azaltım |
|------|---------|
| Regülasyon değişikliği | `src/lib/regulation.ts` tek kaynaklı yapı ile hızlı uyarlama |
| Uzun kamu satın alma döngüsü | Paralel özel sektör pilotlarıyla nakit dengesi |
| Donanım tedarik kısıtlaması | Çoklu modem/taşıyıcı desteğiyle tek tedarikçiye bağımlılığı kırma |
| Tek kişiye bağımlılık | Dokümantasyon, kod sahipliği ve kademeli ekip planı |
| İddia riski | Tasarruf ve süreklilik oranları ölçülmeden pazarlamada kullanılmaz |
| Gerçek donanım uyumsuzluğu | Workstation / Touch & Mobile ayrı profiller, kabul testleri |
| Yasal sınır ihlali | "VPN/proxy/ücretsiz internet dağıtıcısı" konumlanmasından kesin kaçınma |

---

## 9. Sonuç ve Onay Talebi

Bu rapor; Tedbirge® WebOS'un kurumsal kimliğini, 2030 vizyonunu, misyonunu, yedi temel değerini, beş stratejik yönünü ve kademeli hedeflerini tek çatı altında tanımlar. Mevcut iş planı (`src/lib/business-plan.ts`), teknik özet ve bellek kurallarıyla tutarlıdır; aynı zamanda "Sevimli" perspektifiyle insan-okunur ve güven veren bir dil kullanır.

**Onay beklenen noktalar:**

1. Vizyon, misyon ve yedi temel değer onaylanıyor mu?
2. Stratejik yönler (ürün, pazar, iş modeli, teknoloji, marka/iletişim, uyum, operasyon) kapsamlı mı?
3. Kısa / orta / uzun vadeli hedefler ve KPI'lar gerçekçi mi?
4. "Sevimli"nin marka içindeki yeri (AI rehber karakteri / iletişim elçisi) uygun mu?
5. Bu çerçeveye göre `business-plan.ts`, web sitesi metinleri ve yatırımcı sunumu güncellensin mi?

Onay verildiğinde; strateji belgesini kalıcı hale getirip, ilgili kod ve içerik dosyalarına entegre etmeye başlarız.
