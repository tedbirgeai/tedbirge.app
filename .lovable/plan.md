# Faz 5 — AxiomStudio (kendi kendini geliştiren yerel IDE)

## Kaynakta doğrulanan mevcut durum
- Kodda AxiomStudio, Meta-IDE ya da kod düzenleyici yok. "Studio" araması yalnız PDF Studio'yu buluyor. Projede CodeMirror, Monaco, AssemblyScript veya wabt bağımlılığı da yok.
- **Paketler** (`src/apps/tbapp.ts`): `.tbapp` bir JSON paketi; alanları id, name, version, capabilities ve `module` (data: URL veya /wasm). Yükleyici `WebAssembly.instantiate(bytes, { tedbirge: host })` ile çalıştırıyor. Host yalnız `status_online` ve `status_peers` sunuyor; `log(ptr,len)` boş. Kurulum yetenek onayıyla yapılıyor (`installTbAppWithConsent`).
- **İmza** (`src/apps/package.ts`, `tbapp-signature.ts`): `signPackage`, `packageTrust`, `verifyTbAppSignature` ve `isDeveloperMode` mevcut; imzasız paket yalnız geliştirici modunda çalışıyor.
- **Dosya sistemi**: `repo` kökü var (`VFS_FOLDERS`). `src/lib/limen/mount.ts` projeleri `withMountLock` ile /repo altına bağlıyor. Ancak `sandbox.ts` `/repo` yolunu uygulamalar için korumalı kök sayıyor; uygulamalar /repo'ya yazamıyor.
- **AXIOM doğrulaması** (`src/lib/axiom/verify/engine.ts`, `constraints.ts`): çelişki → 409, belirsiz → 422; gerçek çözücü olmadan mühür üretilmiyor.

## Kararlar (yanıtlarınıza göre)
- Studio, /repo altındaki projeleri düzenler, AssemblyScript kodunu cihazda Wasm'a derler, `.tbapp` paketi üretir ve masaüstüne kurar.
- Studio'nun kendi kaynak kodu da örnek bir /repo projesi olarak gelir; düzenlenip yeniden paketlenebilir. Çalışan WebOS'un derlenmiş kodu değiştirilmez.

## Yapılacaklar
1. **Studio uygulaması** (masaüstü uygulaması, kimliği `studio`): üç bölmeli düzen. Solda /repo dosya ağacı, ortada sekmeli düzenleyici, altta Çıktı / Sorunlar / AXIOM paneli. Kurulu uygulamalar listesine ve başlatıcıya eklenir; `WorkspacePanel` üzerinden açılır.
2. **Düzenleyici:** CodeMirror 6 kullanılır: sözdizimi renklendirme (TypeScript/AssemblyScript, JSON, Markdown), satır numarası, arama, geri al. Renkler yalnız `--tb-*` değişkenlerinden gelir. Kaydetme Ctrl+S ile yapılır; kaydedilmemiş dosya işaretlenir.
3. **Proje biçimi:** `/repo/<slug>/tbapp.json` (id, name, version, capabilities, entry) ve `assembly/index.ts`. "Yeni proje" şablonları: Merhaba, Sayaç (status_peers), Boş. Ayrıca salt-okunur tohumdan kopyalanan örnek proje `/repo/axiom-studio`.
4. **Güvenli /repo erişimi:** Studio'ya özel `repo.write` yeteneği tanımlanır. Yalnız bu yeteneği taşıyan ve imzalı sistem uygulaması olan Studio /repo'ya yazabilir. Diğer uygulamalar için /repo korumalı kalır. Her yazım `withMountLock` içinde yapılır, kotaya uyar ve yol kaçışı engellenir.
5. **Yerel derleyici:** AssemblyScript derleyicisi paketle birlikte gelir (CDN kullanılmaz). İlk "Derle" tıklamasında ayrı bir Web Worker içinde yüklenir. Süre sınırı 10 sn'dir, aşılırsa worker sonlandırılır. Hata ve uyarılar Sorunlar paneline satır/sütun bilgisiyle düşer, tıklanınca ilgili satıra gidilir.
6. **Paketleme ve kurulum:** Derlenen Wasm, `tbapp.json` ile `.tbapp` paketine dönüştürülür. Önce yetenek bildirimi `ALL_CAPABILITIES` ile doğrulanır. Paket, cihaz anahtarıyla `signPackage` kullanılarak imzalanır; güven seviyesi "yerel geliştirici" olarak gösterilir. Ardından "Çalıştır" (geçici örnek) veya "Kur" (`installTbAppWithConsent`) seçilebilir. Çıktı `/repo/<slug>/dist/` altına yazılır.
7. **Host günlüğü:** `tedbirge.log(ptr,len)` gerçek hâle getirilir: bellekten en fazla 1 KB UTF-8 metin okunur ve Studio'nun Çıktı paneline aktarılır. Saniyede en fazla 50 satır iletilir.
8. **AXIOM paneli:** Seçili metin veya `// @claim` yorumları AXIOM motoruna gönderilir; 200/409/422 sonucu dürüstçe gösterilir. Studio sahte "kanıtlandı" göstermez.
9. **Uygulamalar arası iletişim:** Studio, kurulum ve çalıştırma olaylarını yalnız `desktop-ipc.ts` üzerinden yayınlar. Yeni arka plan servisi gerekmez.
10. `AGENTS.md` dosyasına Studio/`repo.write` kuralı, `roadmap.md` dosyasına Faz 5 maddeleri eklenir.

## Test ve doğrulama
- Vitest:
  - `tbapp.json` doğrulaması; bilinmeyen yetenek reddedilir.
  - /repo yazma izni: Studio kabul, diğer uygulama ret, `../` kaçışı ret.
  - Paketleyici: Wasm → data URL → `parseTbApp` gidiş-dönüşü ve imzanın doğrulanması.
  - Host `log` sınırı: 1 KB kesme, hız sınırı.
  - Derleyici worker süre sınırı (sahte worker ile).
  - Şablon projelerin geçerli olması.
- Gerçek derleme testi: Merhaba şablonu AssemblyScript ile derlenir ve çıkan Wasm `instantiateTbApp` ile çalıştırılır (Node ortamında).
- `bunx tsgo --noEmit`, tüm Vitest paketi.
- Playwright: Studio'yu aç → yeni proje → derle → çalıştır → Çıktı panelinde günlük satırı; hatalı kodda Sorunlar paneli; kaydet ve yenile sonrası dosyanın kalıcı olması.

## Sınırlar
- Studio çalışan WebOS'un kendi derlenmiş kodunu değiştiremez. "Kendini geliştirme", örnek Studio projesini düzenleyip yeniden paketlemekle sınırlıdır.
- AssemblyScript derleyicisi yaklaşık 2 MB'tır ve yalnız ilk derlemede yüklenir.

## Teknik ayrıntılar
- Bağımlılıklar: `assemblyscript`, `@codemirror/*` (view, state, lang-javascript, lang-json, lang-markdown, search).
- Yeni dosyalar:
  - `src/components/shell/apps/studio/` (StudioApp, FileTree, EditorPane, ProblemsPanel, OutputPanel, AxiomPanel)
  - `src/lib/studio/` (project.ts, templates.ts, repo-fs.ts, compiler.worker.ts, compiler.ts, packager.ts)
  - testler
- Değişecek dosyalar: `src/kernel/capabilities.ts` (`repo.write`), `src/lib/vfs/sandbox.ts`, `src/apps/tbapp.ts` (host log), `src/shell/installed.ts`, `WorkspacePanel.tsx`, `AppLauncher.tsx`, `app-icons.tsx`.
