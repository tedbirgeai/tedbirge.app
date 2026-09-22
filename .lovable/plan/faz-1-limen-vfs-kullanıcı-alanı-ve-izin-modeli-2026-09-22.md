# Faz 1 — LIMEN VFS Kullanıcı Alanı ve İzin Modeli

Amaç: masaüstünde çalışan her uygulama, dosya deposuna yalnızca kendisine ayrılmış
alandan ve yalnızca kullanıcı onayıyla erişsin. Alan dışına yapılan her istek
reddedilsin, kayıt altına alınsın ve depo dolmaya başladığında eski birikim
otomatik sıkıştırılsın.

## 1. Sandbox ve dizin izolasyonu

- Yeni bir aracı katman: uygulamalar dosya deposuna doğrudan değil, uygulama
  kimliğine bağlı bir "kapı" üzerinden erişir.
- Yazma/okuma yolu her zaman `/appdata/{app_id}` altına zorlanır; `/system`,
  başka bir uygulamanın alanı veya `repo` kökü dışına çıkma denemesi hata ile
  döner (sessizce yutulmaz).
- Yol normalize edilir (`..`, çift eğik çizgi, gizli kaçışlar) — normalize
  sonrası kendi ön ekiyle başlamayan her yol reddedilir.
- Mevcut şifreli uygulama alanı (`src/lib/apps/appdata.ts`) korunur; yeni katman
  bunun üzerine dosya/klasör semantiği ekler. `src/lib/vfs/store.ts` genel API'si
  değişmez.

## 2. Yetki token matrisi

- POSIX rwx yerine yetenek anahtarı: her dosya işlemi için kısa ömürlü, tek
  kullanımlık bir oturum anahtarı üretilir (kapsam: uygulama kimliği + işlem türü
  + yol ön eki + son kullanma anı).
- Anahtar cihazda türetilen gizli değerle mühürlenir; kapı, anahtarı doğrulamadan
  hiçbir işlem yapmaz. Kullanılan anahtar tekrar kabul edilmez.
- Yeni yetenekler mevcut yetenek listesine eklenir: dosya okuma, dosya yazma,
  dosya silme. Kullanıcı onayı bugünkü onay ekranından geçer; onaylanmayan
  yetenek için anahtar hiç üretilmez.

## 3. Kota ve veri bütünlüğü

- Depo doluluk oranı eşiği aşınca budama: önce geçici/türev kayıtlar, sonra en
  eski sürüm yığınları. Kullanıcının kendi dosyaları son çare bile değil —
  dokunulmaz.
- Delta birleştirme (compaction): aynı yola ait birikmiş değişiklik kayıtları tek
  bir güncel anlık görüntüye indirilir; kayıt sayısı ve boyut düşer, içerik
  birebir korunur.
- Kota aşımı yakalanırsa işlem kullanıcıya anlaşılır bir mesajla döner, depo
  yarım kayıt bırakmaz.

## 4. Bütünlük ve test geçitleri

- `limen_mount_lock` kilidi aynen korunur; budama ve birleştirme de bu kilit
  altında çalışır, böylece iki sekme aynı anda depoyu bozamaz.
- Yeni testler: alan dışına çıkma denemesi reddi, başka uygulamanın verisinin
  okunamaması, anahtarın ikinci kullanımda reddi, süresi geçmiş anahtar reddi,
  budama sonrası kullanıcı dosyalarının bozulmaması, birleştirme sonrası içerik
  eşitliği, kilit altında eşzamanlı montaj.
- Kapılar: tip denetimi, tüm test paketi, kod biçim denetimi, `security:check`,
  derleme. Sonuçlar tek tabloda raporlanır.

## Teknik notlar

- Yeni dosyalar: `src/lib/vfs/sandbox.ts` (yol zorlaması + kapı), `src/lib/vfs/tokens.ts`
  (yetenek anahtarı üretimi/doğrulaması), `src/lib/vfs/compaction.ts` (budama +
  snapshot birleştirme), ilgili `__tests__` dosyaları.
- Dokunulacak mevcut dosyalar: `src/kernel/capabilities.ts` (üç yeni yetenek ve
  vekil geçidi), `src/shell/permissions.ts` (Türkçe etiketler), `src/apps/registry.ts`
  ve `src/apps/tbapp.ts` (manifest yetenek eşlemesi), `src/lib/limen/mount.ts`
  (birleştirmeyi kilit altına alma).
- `src/lib/vfs/store.ts` dışa açık API'si ve `VFS_FOLDERS` şeması değişmez;
  `appdata` AES-GCM izolasyonu ve `hal/storage.ts` sözleşmesi korunur.
- Ağ isteği yok, CDN yok, sabit renk yok; arayüz metinlerinde kriptografi jargonu
  kullanılmaz.
