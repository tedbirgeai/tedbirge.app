# Hata Temizliği + Yerel Mod Katılımcı UX

## Mevcut durum (doğrulandı)
- `bunx tsgo --noEmit` çıktısı boş, derleme günlüğü `build OK` — şu an tip/derleme hatası yok, yine de iş sonunda tekrar doğrulanacak.
- Katılımcılar paneli `src/components/Messenger.tsx` içinde `hidden ... xl:flex` sınıfıyla sarılı: geniş olmayan ekranlarda (ve dolayısıyla çoğu Yerel Mod ekran görüntüsünde) hiç görünmüyor.
- Yerel Modda liste yalnızca kendi cihazımızı gösteriyor; bekleme bilgisi yok.
- `/chat` üst barında ana sayfaya giden bir "ev" ikonu var; sol ok (geri) ikonu yok.

## Yapılacaklar

### 1. Katılımcılar paneli her ekranda görünür
- `hidden ... xl:flex` yerine her zaman render edilen bir sütun: geniş ekranda sağ kolon, dar ekranda sohbetin altında yığılmış kart.
- Panel eş sayısından bağımsız görünür kalır (Yerel Mod dahil).

### 2. Eş bekleme rozeti + animasyon
- Kendi cihaz satırının hemen altına, yalnızca tek katılımcı varken görünen bilgi rozeti:
  "İkinci bir cihaz ağa girdiğinde otomatik listelenecek".
- Rozetin solunda hafif nabız (pulse) animasyonlu nokta; renkler `--tb-*` değişkenlerinden okunur, sabit hex yok.
- Aynı bilgi "Ekip" sekmesindeki mevcut metinle tutarlı tutulur.

### 3. Sohbet üst barına geri butonu
- `src/components/chat/ChatApp.tsx` üst barının en soluna `ArrowLeft` ikonlu, `/` rotasına giden `Link`.
- `aria-label` / `title`: "Ana sayfaya dön". Mevcut ev ikonu korunur ya da sadeleştirmek için geri butonuyla birleştirilir (tek yönlendirme kalır).

### 4. Doğrulama
- `bunx tsgo --noEmit` 0 hata.
- Derleme günlüğü temiz; `/chat` ve ana sayfa önizlemede kontrol edilir.

## Teknik notlar
- Değişiklikler yalnızca sunum katmanında: `src/components/Messenger.tsx` ve `src/components/chat/ChatApp.tsx`.
- Mesh/telemetri mantığına, katılımcı türetme koduna dokunulmaz.
