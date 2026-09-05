import type { ReactNode } from "react";

export type DocSection = {
  id: string;
  title: string;
  summary: string;
  body: ReactNode;
};

const APP_URL = "https://tedbirge.app";

export const SECTIONS: DocSection[] = [
  {
    id: "baslangic",
    title: "Başlangıç",
    summary: "Portalın kapsamı, sürüm ve temel kavramlar.",
    body: (
      <>
        <p className="lead">
          Tedbirge® WebOS, cihazda çalışan dayanıklı bir iletişim işletim sistemidir. Bu portal, bir
          düğümü başlatmak, eş bağlamak, mesaj/dosya taşımak ve saha ölçümlerini bildirmek için
          gereken arayüzleri belgeler.
        </p>
        <h2>Kavramlar</h2>
        <table>
          <thead>
            <tr>
              <th>Kavram</th>
              <th>Anlamı</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Düğüm</td>
              <td>Tarayıcı, mobil veya bare-metal kurulumda çalışan tek bir çalışma zamanı.</td>
            </tr>
            <tr>
              <td>Zarf</td>
              <td>İmzalı, uçtan uca şifreli taşıma birimi; içerik ara düğümlerde açılmaz.</td>
            </tr>
            <tr>
              <td>Röle</td>
              <td>Zarfı hedefe yaklaştıran ara düğüm; içerik göremez, yalnız taşır.</td>
            </tr>
            <tr>
              <td>Taşıyıcı</td>
              <td>IP, LoRa, HaLow gibi fiziksel/mantıksal iletim yolu.</td>
            </tr>
          </tbody>
        </table>
        <div className="note">
          Tedbirge® WebOS bir VPN, proxy veya ücretsiz internet dağıtıcısı değildir. Çıkış (egress)
          kilidi çekirdek düzeyinde uygulanır; yalnız ağ içi taşıma yapılır.
        </div>
        <h2>Ana uygulama</h2>
        <p>
          Çalışan sistem{" "}
          <a href={APP_URL} rel="noopener noreferrer">
            tedbirge.app
          </a>{" "}
          adresindedir; bu portal yalnız geliştirici belgelerini barındırır.
        </p>
      </>
    ),
  },
  {
    id: "sdk",
    title: "SDK kullanımı",
    summary: "Düğüm başlatma, eş bağlama, mesaj ve dosya gönderimi.",
    body: (
      <>
        <p className="lead">
          Düğüm çalışma zamanı tarayıcıda otomatik açılır. Aşağıdaki akış, gömülü kabuk içinden veya
          kendi arayüzünüzden aynı şekilde kullanılır.
        </p>
        <h2>1. Düğümü başlat</h2>
        <pre>
          <code>{`import { bootNodeRuntime, startNode } from "@/lib/node-runtime";

bootNodeRuntime();      // durum deposunu kurar, kimliği okur
await startNode();      // taşıyıcıları ve dinleyicileri açar`}</code>
        </pre>
        <h2>2. Eş bağla</h2>
        <pre>
          <code>{`// Eşler TBG-XXXX biçimli, insan-okunur kimliklerle bulunur.
node.connect("TBG-4K7Q");

// Bağlantı durumu tek yerden izlenir:
const { peers, online, queued } = useNodeRuntime();`}</code>
        </pre>
        <h2>3. Mesaj ve dosya gönder</h2>
        <pre>
          <code>{`await node.send("TBG-4K7Q", { kind: "text", body: "Merhaba" });

// Dosya parçalara bölünür; bağlantı koparsa kuyrukta bekler
// ve yeniden bağlanınca kaldığı yerden devam eder.
await node.sendFile("TBG-4K7Q", file, { priority: "normal" });`}</code>
        </pre>
        <h2>4. Çevrimdışı davranış</h2>
        <p>
          Ağ koptuğunda zarflar cihazda saklanır (store-and-forward) ve bağlı bir taşıyıcı
          bulunduğunda otomatik iletilir. Kullanıcıya hata gösterilmez; kuyruk sayacı artar.
        </p>
      </>
    ),
  },
  {
    id: "zarf",
    title: "Zarf mimarisi",
    summary: "Zarf alanları, imza/tekrar koruması, röle ve store-and-forward.",
    body: (
      <>
        <p className="lead">
          Her taşıma birimi bir zarftır. Ara düğümler yalnız yönlendirme başlığını okur; yük uçtan
          uca şifrelidir.
        </p>
        <table>
          <thead>
            <tr>
              <th>Alan</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>id</td>
              <td>Tekil zarf kimliği; tekrar (replay) koruması bu kimlik üzerinden yapılır.</td>
            </tr>
            <tr>
              <td>from / to</td>
              <td>Kaynak ve hedef düğüm kimliği.</td>
            </tr>
            <tr>
              <td>ttl</td>
              <td>Kalan sıçrama hakkı; her rölede azalır, sıfırda zarf düşer.</td>
            </tr>
            <tr>
              <td>ts</td>
              <td>Üretim zamanı; pencere dışındaki zarflar kabul edilmez.</td>
            </tr>
            <tr>
              <td>sig</td>
              <td>Gönderen kimliğiyle üretilen imza; her rölede doğrulanır.</td>
            </tr>
            <tr>
              <td>payload</td>
              <td>Uçtan uca şifreli yük; yalnız hedef açar.</td>
            </tr>
          </tbody>
        </table>
        <h2>Store-and-forward</h2>
        <p>
          Hedefe doğrudan yol yoksa zarf yerel kuyruğa yazılır. Kuyruk, taşıyıcı skoruna göre
          (gecikme, kayıp, maliyet) sıradaki en uygun yola boşaltılır; başarısız denemede bir
          sonraki taşıyıcıya düşülür.
        </p>
        <div className="note">
          Ara düğüm içerik göremez. Röle davranışı varsayılan olarak açıktır ve kullanıcı tarafından
          kapatılabilir.
        </div>
      </>
    ),
  },
  {
    id: "yonlendirme",
    title: "Çok-sıçramalı yönlendirme",
    summary: "Dijkstra maliyet motoru, dinamik TTL, eş keşfi ve çıkış kilidi.",
    body: (
      <>
        <p className="lead">
          Yönlendirme, komşu bağlantılarının ölçülen kalitesine göre en düşük maliyetli yolu seçen
          bir Dijkstra motoruyla yapılır.
        </p>
        <h2>Maliyet bileşenleri</h2>
        <ul>
          <li>Gidiş-dönüş gecikmesi (RTT)</li>
          <li>Paket kaybı oranı</li>
          <li>Taşıyıcı türü ve enerji bütçesi</li>
          <li>Eşin son görülme tazeliği</li>
        </ul>
        <h2>Dinamik TTL</h2>
        <p>
          TTL sabit değildir: hesaplanan yolun uzunluğuna göre belirlenir, böylece kısa yollarda
          gereksiz dolaşım, uzun yollarda erken düşme olmaz.
        </p>
        <h2>Çıkış kilidi</h2>
        <pre>
          <code>{`// Ağ dışına genel internet trafiği taşınamaz.
// Kilit, taşıma katmanının önünde çalışır ve ihlali baştan reddeder.
assertNoEgress(target); // yalnız ağ içi hedefler geçer`}</code>
        </pre>
      </>
    ),
  },
  {
    id: "wasm",
    title: "Rust-Wasm çekirdek",
    summary: "Çekirdek ABI'si, yükleme akışı ve TypeScript geri düşüşü.",
    body: (
      <>
        <p className="lead">
          Yönlendirme ve durum hesabı, Rust ile yazılan çekirdekte çalışır. Modül
          <code> /kernel/tedbirge_kernel.wasm </code> adresinden yüklenir.
        </p>
        <h2>Beklenen ABI</h2>
        <pre>
          <code>{`// Rust tarafının dışa açtığı asgari yüzey
abi_version() -> u32     // beklenen sürüm: 1
route_hops(target: u32) -> u32`}</code>
        </pre>
        <h2>Yükleme ve geri düşüş</h2>
        <ol>
          <li>TypeScript çekirdeği daima hazır kaydedilir; kesinti olmaz.</li>
          <li>Tercih "wasm" ise modül arka planda indirilir ve ABI sürümü doğrulanır.</li>
          <li>Modül yoksa, indirilemezse veya ABI uyuşmazsa sessizce TypeScript çekirdeğinde kalınır.</li>
          <li>Hızlandırılmış çekirdek ısrarla arıza verirse denetleyici standart çekirdeğe iner.</li>
        </ol>
        <h2>Derleme</h2>
        <pre>
          <code>{`# depo kökünde
npm run kernel:build
# çıktı: public/kernel/tedbirge_kernel.wasm`}</code>
        </pre>
        <div className="note">
          Paylaşımlı halka tamponu yalnız çapraz kaynak yalıtımı (COOP/COEP) etkin olduğunda
          kullanılır; yalıtım yoksa mesaj tabanlı köprüye düşülür.
        </div>
      </>
    ),
  },
  {
    id: "api",
    title: "Kamusal API referansı",
    summary: "Saha telemetrisi, sağlık, kuyruk, röle ve dağıtım uçları.",
    body: (
      <>
        <p className="lead">
          Kamusal uçlar <code>/api/public/*</code> altındadır ve yalnız ölçüm/işletim verisi taşır;
          kullanıcı içeriği bu uçlardan geçmez. Yazma uçları lisans anahtarı ister.
        </p>
        <h2>Kimlik doğrulama</h2>
        <pre>
          <code>{`X-Tedbirge-License: <panelinizdeki lisans anahtarı>`}</code>
        </pre>
        <h2>Uçlar</h2>
        <table>
          <thead>
            <tr>
              <th>Uç</th>
              <th>Yöntem</th>
              <th>Amaç</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/api/public/telemetry</td>
              <td>POST</td>
              <td>Saha ölçümü bildirimi (RTT, verim, paket kaybı).</td>
            </tr>
            <tr>
              <td>/api/public/health</td>
              <td>GET</td>
              <td>Servis sağlık durumu.</td>
            </tr>
            <tr>
              <td>/api/public/ping</td>
              <td>GET</td>
              <td>Gecikme ölçümü için hafif yankı.</td>
            </tr>
            <tr>
              <td>/api/public/queue</td>
              <td>GET/POST</td>
              <td>Store-and-forward kuyruğu alışverişi.</td>
            </tr>
            <tr>
              <td>/api/public/relay</td>
              <td>POST</td>
              <td>Zarf rölesi (içerik açılmaz).</td>
            </tr>
            <tr>
              <td>/api/public/enroll</td>
              <td>POST</td>
              <td>Cihaz katılımı (cihazda üretilen tek kullanımlık kodla).</td>
            </tr>
            <tr>
              <td>/api/public/iso</td>
              <td>GET</td>
              <td>Yayımlanmış bare-metal imaj bağlantısı; imaj yoksa 503 döner.</td>
            </tr>
            <tr>
              <td>/api/public/openapi.json</td>
              <td>GET</td>
              <td>Makine-okunur OpenAPI 3.1 tanımı.</td>
            </tr>
          </tbody>
        </table>
        <h2>Örnek</h2>
        <pre>
          <code>{`curl -X POST ${APP_URL}/api/public/telemetry \\
  -H "content-type: application/json" \\
  -H "X-Tedbirge-License: $TEDBIRGE_LICENSE" \\
  -d '{"node_id":"saha-A","rtt_ms":42,"loss_pct":0.4}'`}</code>
        </pre>
        <p>
          Tam şema:{" "}
          <a href={`${APP_URL}/api/public/openapi.json`} rel="noopener noreferrer">
            openapi.json
          </a>
        </p>
      </>
    ),
  },
  {
    id: "surum",
    title: "Sürüm notları",
    summary: "Uyumluluk sözleri ve değişiklik politikası.",
    body: (
      <>
        <h2>Uyumluluk</h2>
        <ul>
          <li>Çekirdek ABI sürümü artmadıkça mevcut Wasm modülleri çalışmaya devam eder.</li>
          <li>Kamusal API'de alan kaldırma kırıcı sayılır; yeni alanlar geriye dönük uyumludur.</li>
          <li>Zarf başlığındaki alan adları sabittir; yeni alanlar isteğe bağlı eklenir.</li>
        </ul>
        <h2>Geçerli sürüm</h2>
        <table>
          <thead>
            <tr>
              <th>Bileşen</th>
              <th>Sürüm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Saha API</td>
              <td>0.6a</td>
            </tr>
            <tr>
              <td>Çekirdek ABI</td>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
];
