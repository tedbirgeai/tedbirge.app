# Mimari Denetim Yanıtları ve İyileştirme Planı

## Denetim sonuçları (kod okunarak doğrulandı)

**1. Tekil çekirdek — DURUM: TAMAM.**
Düğüm çalışma zamanı `src/lib/node-runtime.ts` içinde modül seviyesinde tekil (singleton): tek `BrowserNode` örneği, tek `setInterval` nabzı, `useSyncExternalStore` ile paylaşılan durum. Açılış `src/routes/__root.tsx` (satır 182) içindeki `CallHost` ile kök seviyede bir kez yapılıyor. `/` ile `/chat` arasında router içi geçişte kök bileşen sökülmediği için WebRTC bağlantıları ve düğüm durumu kopmuyor. Tek istisna: tarayıcıdan tam sayfa yenileme/adres çubuğuyla giriş — bu her PWA'da doğaldır.

**2. Çevrimdışı kalıcılık — DURUM: BÜYÜK ORANDA TAMAM, tek boşluk var.**
IndexedDB `tedbirge` v4: mesajlar, sohbetler, kuyruktaki paketler, anahtar kayıtları, eş ve güvenilir düğüm kayıtları kalıcı (`src/lib/store/idb.ts`). Yenileme sonrası sohbet geçmişi korunuyor. Yerel takma adlar ise `localStorage`'da (`src/lib/identity/peer-nickname.ts`) — tarayıcı depolama baskısında IndexedDB'den önce silinebilir ve `navigator.storage.persist()` kapsamına girmiyor.

**3. Medya parçalama — DURUM: İYİLEŞTİRME GEREKİYOR.**
`fileToDataUrl` asenkron (FileReader) ancak `splitMedia` (`src/lib/chat/media.ts`) tüm base64 dizesini tek turda senkron dilimliyor. 8 MB sınırında ~350 parça tek makro-görevde üretiliyor; düşük güçlü telefonlarda arayüzde görünür donma riski var. `collectChunk` alıcı tarafında birleştirmeyi de tek seferde `join` ediyor.

**4. WebOS pencere modeli — DURUM: HAZIR DEĞİL.**
`/chat` rotası `fixed inset-0` tam ekran bir kabuk (`src/routes/chat.tsx`) ve `ChatApp` kendi tam-ekran ölçülerini varsayıyor. Sürüklenebilir/boyutlandırılabilir pencere için içerik bileşeninin kapsayıcıdan bağımsız (yüzde/akış tabanlı) olması gerekiyor. Pencere yöneticisi de yok.

**5. Ölü kod ve tip denetimi — DURUM: TEMİZ + kullanılmayan dosyalar.**
`bunx tsgo --noEmit` → 0 hata. Kullanılmayan dosya taraması: 43 dosya; bunların 40'ı hiç kullanılmayan shadcn/ui bileşeni (zararsız, ağaç sallamada bundle'a girmiyor). Gerçek artıklar: `src/components/site/MarketingHome.tsx`, `src/components/site/AppGetPanel.tsx` (hiçbir rota bağlamıyor) ve `public/push-sw.js` (yerine geçen kayıt yolu var mı ayrıca doğrulanacak).

## Önerilen işler

1. **Takma ad kalıcılığını IndexedDB'ye taşı.** `peer-nickname.ts` yazma/okuma yolunu IndexedDB'ye alıp `localStorage`'ı yalnızca tek seferlik göç kaynağı olarak kullan; senkron okuyucular için bellek önbelleği korunur. Açılışta `navigator.storage.persist()` çağrısı zaten mevcut yardımcıyla tetiklenir.
2. **Parçalamayı arayüzü bloklamayan hâle getir.** `splitMedia` yerine parçaları tur tur üreten asenkron bir akış (her ~8 parçada `await` ile ana döngüye nefes aldıran) kullan; `collectChunk` birleştirmesini de aynı şekilde bölerek yap. Gönderim sırasında ilerleme yüzdesi mevcut arayüze bağlanır.
3. **Pencere modeline hazırlık (yapısal, görsel değişiklik yok).** `ChatApp` içeriğini `fixed inset-0` yerine `h-full w-full` kapsayıcı varsayacak şekilde ayır; `/chat` rotası bu bileşeni tam ekran kapsayıcıya sarar. Böylece ileride aynı bileşen bir pencere gövdesine gömülebilir. Pencere yöneticisi bu işte yazılmaz.
4. **Ölü kod temizliği.** `MarketingHome.tsx` ve `AppGetPanel.tsx` kaldırılır; `public/push-sw.js` kullanımı doğrulanıp kullanılmıyorsa silinir. Kullanılmayan shadcn/ui bileşenlerine dokunulmaz.
5. **Doğrulama.** `bunx tsgo --noEmit` 0 hata, derleme temiz; `/` ↔ `/chat` geçişinde düğüm kimliğinin ve eş listesinin korunduğu tarayıcıda kontrol edilir.

## Kapsam dışı

Sürüklenebilir pencere yöneticisi, çoklu pencere görev çubuğu ve medya aktarımının Web Worker'a taşınması bu işte yapılmaz — istenirse ayrı bir iş olarak planlanır.
