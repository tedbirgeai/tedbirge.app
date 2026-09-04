# Tedbirge® WebOS — Kurulum İmajı (.iso)

Bilgisayarınızda hiçbir şey derlemenize gerek yok. Yapmanız gereken üç şey var:

1. **İndir** — Uygulamadaki “Kurulum İmajını İndir (.iso)” düğmesine basın.
   Doğrudan yayınlanmış hazır imaj iner.
2. **USB'ye yaz** — Boş bir USB bellek takın ve şu araçlardan birini kullanın:
   - **Rufus** (Windows): imajı seçin → bölüm şeması GPT/UEFI → Başlat
   - **BalenaEtcher** (Windows/macOS/Linux): Flash from file → hedefi seçin → Flash
   - **Ventoy**: `.iso` dosyasını Ventoy USB'sine kopyalamanız yeterli
3. **Başlat** — Bilgisayarı USB'den açın (açılışta genelde F12, F9, Esc veya Del).

## Açılış menüsü

| Seçenek | Ne yapar |
| --- | --- |
| **Tedbirge® WebOS (Canlı — Live Kiosk)** | Sistemi RAM üzerinden çalıştırır. Diskinize hiç dokunmaz; USB'yi çıkardığınızda iz kalmaz. |
| **Tedbirge® WebOS (Diske Kur — Otomatik Kurulum)** | Türkçe kurulum sihirbazını açar; hedef diski seçip onayladıktan sonra sistemi kalıcı olarak kurar. |
| **Kurtarma konsolu** | Sorun giderme için basit komut ekranı. |

Kurulum sihirbazı, siz büyük harflerle `EVET` yazana kadar hiçbir diske yazmaz.

## Notlar

- Bazı bilgisayarlarda USB'den açılış için BIOS/UEFI ayarlarından **Secure Boot** kapatılmalıdır.
- Sistem açıldığında arayüz tam ekran kiosk modunda gelir; ağdaki diğer cihazlar da
  `http://<cihaz-ip>/` adresinden erişebilir.
- Wi‑Fi ve ağ ayarları arayüz içindeki Ayarlar bölümünden yapılır.

## İmaj nasıl üretiliyor (teknik)

İmaj GitHub Actions üzerinde otomatik derlenir: `.github/workflows/build-iso.yml`
→ `alpine/ci-build.sh` → Alpine `mkimage` profili (`alpine/mkimg.tedbirge.sh`) +
overlay (`alpine/genapkovl-tedbirge.sh`). Çıktı GitHub Releases alanına yüklenir ve
`/api/public/iso` rotası her zaman en güncel dosyaya yönlendirir.
Depo: **tedbirgeai/tedbirge.app** — https://github.com/tedbirgeai/tedbirge.app/releases/latest

Denemek için sanal makine:

```
qemu-system-x86_64 -m 2048 -enable-kvm -cdrom tedbirge-webos-x86_64.iso
```
