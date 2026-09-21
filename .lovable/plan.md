# LIMEN → VFS Mount, Kuyruk Akışı ve Terminal Ağaç Listesi

Amaç: LIMEN'de kuyrukta bekleyen paketlerin gerçek dosya ağacı olarak yerel depoya yazılması,
Dosyalar penceresinde yeni bir "repo" kök klasöründe görünmesi ve Terminal `ls` komutunun bu
ağacı gezebilmesi. Ağa çıkılmaz; her şey cihazda ve çevrimdışı çalışır.

Mevcut durum (okundu, doğrulandı):
- `src/lib/vfs/store.ts` dört sabit klasör tanır (Belgeler, Görseller, Medya, İndirilenler) ve şema dışı klasörü reddeder; bugün hiçbir "repo" yolu yok.
- `src/lib/limen/sync.ts` yalnız CRDT kayıtları tutar ve `BroadcastChannel` üzerinden delta gönderir; depoya hiç yazmaz, bu yüzden `queued` kayıtlar dosya üretmiyor.
- `src/lib/terminal/paths.ts` + `commands.ts` içindeki `ls`, kökte sadece dört sabit klasörü listeler; alt dizin kavramı yok.

## Faz 1 — Depoda "repo" kök klasörü ve yol destekli ağaç

- `VFS_FOLDERS` listesine beşinci kök olarak `repo` eklenir; `folderForMime` davranışı değişmez (repo'ya yalnız açıkça yazılır), `normalizeFolder` geriye dönük uyumlu kalır.
- Dosya adı içinde `/` ile yol taşınabilir (örn. `src/lib/limen/sync.ts`). Depo API imzaları değişmez.
- Yeni yardımcı modül `src/lib/vfs/tree.ts`: düz kayıt listesini klasör/dosya ağacına çevirir (`treeAt(path)`, `childrenOf(path)`), yol normalizasyonu ve ".." koruması içerir.
- `FilesApp` repo klasöründe ağaç görünümünü (alt klasöre girme + üst dizin) gösterir; diğer klasörlerin davranışı aynı kalır.

## Faz 2 — LIMEN delta işleyicisi paketleri mount eder

- Yeni modül `src/lib/limen/mount.ts`:
  - Bir LIMEN kaydını (`name`, `branch`, `mode`, delta alanları) `repo/<çalışma-alanı>/...` altına fiziksel dosya ağacı olarak yazar: manifest, dal bilgisi ve delta girdilerinin her biri ayrı dosya.
  - `writeDocument` kullanır, aynı yol yeniden yazıldığında kopya çoğaltmaz (idempotent mount).
  - `mountedTree()` ile mount edilmiş yolların özetini döner.
- `src/lib/limen/sync.ts`:
  - Gelen delta uygulandığında ve yerel delta kuyruğa alındığında mount tetiklenir (arka planda, hata yutulmadan durum alanına yazılır).
  - `flushLimen` başarılı gönderimde kaydı `synced` yapmadan önce mount'u bekler; böylece `queued` kayıtlar takılmadan depoya iner.
  - Ayrı bir senkronizasyon döngüsü: pencere açıldığında ve `online` olayında bekleyen kuyruk otomatik boşaltılır (tekrar girişe kapalı, çakışmasız).
- `LimenApp`: her kayıt kartında mount edilen yol + dosya sayısı; "Depoya bağla" ve "Dosyalar'da aç" düğmeleri; kuyruk sayacı canlı.

## Faz 3 — Terminal `ls` ağacı görür

- `paths.ts`: kök klasör listesine `repo` eklenir, çok seviyeli yol çözümlemesi (`resolvePath` artık bir seviyeyle sınırlı olmaz), `splitTarget` yol önekini korur.
- `commands.ts`:
  - `ls` kökte beş klasörü, `repo` altında ise `tree.ts` üzerinden alt dizinleri (`ad/`) ve dosyaları listeler; `-l` biçimi korunur.
  - `cd`, `cat`, `rm`, `mv` gibi mevcut komutlar yeni yol çözümlemesiyle uyumlu hâle getirilir (davranış değişmez, yalnız derinlik kazanır).
  - Yeni `tree [yol]` komutu delta/proje ağacını girintili gösterir.

## Teknik notlar

- Depo şeması sürümü (`VFS_SCHEMA_VERSION`) korunur; yeni kök klasör veri göçü gerektirmez, eski kayıtlar `normalizeFolder` ile aynı yerde kalır.
- `src/hal/storage.ts` ve `src/hal/native.ts` yalnız tür üzerinden etkilenir; native kol `FileMeta.folder` alanını serbest metin tuttuğu için değişiklik gerekmez.
- Tüm renkler `--tb-*` tokenlarından okunur; CDN ve harici ağ çağrısı yok.
- Testler: `src/lib/vfs/__tests__/store.test.ts` genişletilir; yeni `tree`, `limen/mount` ve terminal yol/`ls`/`tree` testleri eklenir.
- Kapılar: `bunx tsgo --noEmit`, `bunx vitest run`, `bun run lint`, `bun run security:check`, `bun run build` ve canlı önizlemede LIMEN → Dosyalar → Terminal akışının uçtan uca kontrolü.
