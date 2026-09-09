# Tedbirge® WebOS — Kabuk, Terminal Çekirdeği ve Uygulama Derinleştirme

## Bugünkü durum (kontrol edildi)

Masaüstü kabuğu, sağ tık menüleri, seçim kutusu, ızgara hizalama, ofis takımı (Writer, Sheets, Slides, PDF Stüdyo, Notlar, Ajanda), Dosyalar, Cihazım, Ayarlar, Mağaza, Profil ve Sohbet/Arama panelleri zaten kurulu ve çalışıyor. PDF motoru pakete gömülü.

Geriye kalan gerçek boşluklar:

1. Terminal şu an 8 komutluk basit bir konsol (156 satır) — görev emrindeki komut mimarisinin çok altında.
2. Medya ve Müzik oynatıcıları temel seviyede: çalma listesi, kuyruk, dalga formu ve görselleştirici yok.
3. Belge şeması sürüm etiketi taşımıyor; eski kayıtların ileriye taşınması dosya bazında yapılıyor.

Plan bu üç boşluğu kapatır, kurulu olanları bozmaz.

## Aşama 1 — Terminal çekirdeği (ana iş)

Yeni bir kabuk çekirdeği katmanı: girdi ayrıştırma, çalışma dizini, komut kaydı.

- Ayrıştırıcı: tırnak içi boşluklu argümanlar, `|` boru hattı, `>` ve `>>` yönlendirmesi (çıktı VFS'e yazılır).
- Geçmiş: son 50 komut, yukarı/aşağı gezinme, cihazda saklama.
- `Tab` ile komut ve VFS dosya/klasör adı tamamlama.
- Alias haritası: `dir`, `cls`, `type`, `del`, `erase`, `md`, `copy`, `move`.
- Renkli çıktı (ANSI benzeri sınıflar, tüm renkler `--tb-*` değişkenlerinden), hatalı komutta "Bunu mu demek istediniz?" önerisi.

## Aşama 2 — Komut seti

- Dosya: `ls`/`dir` (`-l`, `-a`), `cd`, `pwd`, `cat`, `touch`, `mkdir`, `rm`/`rmdir` (`-r`), `cp`, `mv`, `grep` (eşleşme vurgulu).
- Sistem: `status`, `sysinfo`, `neofetch` (ASCII logo, RAM, WebGPU), `ps`, `kill <PID>`, `open <uygulama> [dosya]`, `logs`/`journalctl -n`, `env`, `export`.
- Ağ: `mesh`/`netstat` (kanallar, düğümler, gecikme, bant genişliği), `ping <düğüm>`.
- Güvenlik: `vault lock` / `vault unlock`, `keypair gen`, `key export`.
- Teşhis: `wasm status` (heap/bellek havuzu), `gpu info` (hat + FPS), `ipc bus`, `events [-f]`.
- `run <dosya.js|wasm>` yalıtılmış worker içinde çalışır; ağ erişimi yoktur.
- `yardim`/`help` kategorili ve renkli.

Ölçülemeyen değerler uydurulmaz, "ölçülemiyor" yazılır. `ps`/`kill` gerçek pencere yöneticisine bağlanır; `mesh`/`ping` gerçek P2P katmanından okur.

## Aşama 3 — Medya, Müzik ve şema

- Müzik: çalma listeleri, kuyruk, dalga formu, Canvas görselleştirici, arka planda oynatma.
- Medya: altyazı desteği, kuyruk, tam ekran denetimleri.
- `src/lib/office/documents.ts` sürümlü şemaya taşınır; eski belgeler açılışta sessizce yükseltilir.

## Aşama 4 — Doğrulama

`bunx vitest run`, `scripts/verify-office-bundle.sh`, derleme ve tip kontrolü. Terminal ayrıştırıcısı ve komutları için birim testleri eklenir. Sonunda durum raporu sunulur.

## Teknik notlar

- `src/lib/vfs/store.ts` API'si değişmez; terminal yalnız mevcut fonksiyonları çağırır.
- Yeni çekirdek `src/lib/terminal/` altında (lexer, komut kayıt defteri, akışlar) toplanır; arayüz `TerminalApp.tsx` yalnız görüntüleme yapar.
- Dış ağ/CDN bağımlılığı eklenmez; sabit renk kodu yazılmaz.
- Sanal dizin ağacı, VFS'in mevcut sabit klasör modeli üzerine kurulur.
