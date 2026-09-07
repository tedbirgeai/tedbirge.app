# Kurulum takılmasının gerçek nedeni ve tek hamlede çözümü

Kayıtlar tek bir yeri gösteriyor: "Açılış diski güncelleniyor" adımı 295 saniye boyunca "ilerlemesiz" sayılıp öldürülüyor, ama süreç aslında **çalışıyordu**.

`image/install/tedbirge-kur` içindeki kilitlenme denetimi (`surec_ilerlemesi`) yalnızca **ana sürecin** CPU ve disk sayaçlarına bakıyor. Oysa `update-initramfs` işi kendisi yapmaz; alt süreç başlatır (kayıtta görünen `alt surec: 1382`) ve kendisi `sigsuspend` ile bekler. Bekleyen ana sürecin sayaçları hiç artmaz, bu yüzden denetim gerçek çalışmayı "kilitlenme" sanıp sağlıklı kurulumu iptal ediyor. Yani hata initramfs'te değil, bizim izleme mantığımızda.

## Yapılacaklar

### 1. İlerleme ölçümü tüm süreç ağacına yayılacak
- `surec_ilerlemesi` artık ana sürecin **tüm alt/torun süreçlerini** dolaşıp CPU ve okuma/yazma baytlarını toplayacak.
- Ek ölçüt: hedef diskin (`/boot` ve kök bölüm) yazılan blok sayacı; alt süreçler okunamasa bile diske yazma sürdükçe adım kesilmeyecek.
- Bu üç sinyalden **herhangi biri** ilerlediği sürece adım asla öldürülmeyecek.

### 2. Sert süre sınırları gerçekçi hale gelecek
- `update-initramfs` dış sınırı 300s → 1800s (emülasyonda MODULES=most yavaştır); asıl koruma ilerleme denetimi.
- `update-grub` 120s → 600s, `grub-install` 300s → 900s.
- İlerlemesizlik eşiği 300s olarak kalacak, ama artık doğru ölçüme dayanacak.

### 3. Teşhis ve raporlama netleşecek
- Kilitlenme gerçekten olursa: alt süreç ağacı, her birinin `wchan` durumu ve son initramfs günlüğü hata çıktısına basılacak.
- `TEDBIRGE_INSTALL_FAIL` satırının iki kez yazılması (konsol + seri port çiftlemesi) tekilleştirilecek.

### 4. Gerçek zamanlı otomasyon (istenen "tek hamle")
- `scripts/test-install-qemu.sh` her aşamada canlı ilerleme özeti yazacak; sessiz kalma durumunda seri + firmware günlüğünün son satırlarını dökecek.
- `scripts/check-image-config.sh` yeni değişmezleri denetleyecek: ilerleme ölçümü süreç ağacını kapsıyor mu, sert sınırlar minimum değerlerin üstünde mi, `|| true` ile yutulan açılış adımı kalmış mı.
- Değişiklikten sonra `bash -n`, yapılandırma denetimi ve paket doğrulaması çalıştırılacak; CI iki sürüm (workstation + touch) × BIOS/UEFI matrisinde yeniden koşacak.

## Teknik not

Dokunulacak dosyalar: `image/install/tedbirge-kur` (ana düzeltme), `scripts/test-install-qemu.sh`, `scripts/check-image-config.sh`. Davranış değişikliği: watchdog artık `pgrep -P` ile özyinelemeli süreç ağacı üzerinden `utime+stime` ve `read_bytes+write_bytes` toplayacak, ayrıca `/sys/block/<disk>/stat` yazma sayacını izleyecek.
