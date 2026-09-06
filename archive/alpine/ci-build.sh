#!/bin/sh
# CI içinde (alpine konteynerinde) çalışır. Yerel makinede çalıştırmak gerekmez.
# Girdi : /work/build-iso/web (kurulum imajına özel derlenmiş arayüz)
# Çıktı : /work/build-iso/iso/tedbirge-webos-<sürüm>-x86_64.iso
set -eu

VERSION="${TEDBIRGE_VERSION:-1.0.0}"
WORK=/work
OUT="$WORK/build-iso/iso"

echo "== Tedbirge(R) WebOS ISO derlemesi · $VERSION =="

# Kurulum imajı derlemesi arayüzü build-iso/web altına yazar; yayın çıktısı
# (dist/client) yalnızca geriye dönük yedek olarak kabul edilir.
if [ -f "$WORK/build-iso/web/index.html" ]; then
  WEBROOT="$WORK/build-iso/web"
elif [ -f "$WORK/dist/client/index.html" ]; then
  WEBROOT="$WORK/dist/client"
elif [ -f "$WORK/dist/index.html" ]; then
  WEBROOT="$WORK/dist"
else
  echo "! Web paketi bulunamadı: build-iso/web/index.html yok."
  echo "  Önce 'bun run build:iso' çalıştırın (ön-render açılış sayfasını üretir)."
  exit 1
fi

if [ ! -s "$WEBROOT/kernel/tedbirge_kernel.wasm" ]; then
  echo "! $WEBROOT/kernel/tedbirge_kernel.wasm yok — çekirdeksiz imaj yayınlanmaz."
  echo "  Önce 'bash scripts/build-kernel.sh' çalıştırın."
  exit 1
fi

echo "-- Web paketi kaynağı: $WEBROOT"

apk update
apk add --no-cache \
  alpine-sdk alpine-conf busybox-static apk-tools-static \
  xorriso squashfs-tools syslinux grub grub-efi mtools dosfstools \
  git bash coreutils tar doas

# abuild yardımcıları doas ile ayrıcalık yükseltir; konteynerde kural yoksa
# "doas: not found / not permitted" hatası verir. Kuralı biz tanımlıyoruz.
mkdir -p /etc/doas.d
echo 'permit nopass :abuild' > /etc/doas.d/abuild.conf
echo 'permit nopass root' >> /etc/doas.d/abuild.conf

adduser -D -G abuild builder 2>/dev/null || true
addgroup builder abuild 2>/dev/null || true
mkdir -p /var/cache/distfiles
chmod a+w /var/cache/distfiles

# İmza anahtarı: kurulum adımını (-i) root olarak biz yapıyoruz ki
# abuild-keygen ayrıcalık yükseltmeye muhtaç olmasın.
su builder -c 'abuild-keygen -a -n'
mkdir -p /etc/apk/keys
for k in /home/builder/.abuild/*.rsa.pub; do
  [ -e "$k" ] || continue
  cp "$k" /etc/apk/keys/
done
ls -l /etc/apk/keys


# aports (mkimage altyapısı)
# GitLab bazen 418 döndürüyor; yansılar sırayla denenir.
APORTS_BRANCH="${APORTS_BRANCH:-3.20-stable}"
CLONED=0
for repo in \
  "https://github.com/alpinelinux/aports.git" \
  "https://gitlab.alpinelinux.org/alpine/aports.git" \
  "https://git.alpinelinux.org/aports"
do
  for try in 1 2 3; do
    echo "-- aports kaynağı deneniyor: $repo ($try)"
    rm -rf /home/builder/aports
    if git clone --depth 1 --branch "$APORTS_BRANCH" "$repo" /home/builder/aports 2>/dev/null \
      || git clone --depth 1 "$repo" /home/builder/aports; then
      CLONED=1
      break
    fi
    sleep 5
  done
  [ "$CLONED" = 1 ] && break
done

if [ "$CLONED" != 1 ]; then
  echo "! aports kaynağı indirilemedi (tüm yansılar başarısız)."
  exit 1
fi

echo "-- aports kaynağı hazır: $repo"

# ISO9660 birim etiketi (volid) en fazla 32 karakter olabilir. Varsayılan
# "alpine-<profil> <sürüm> <mimari>" bizim sürüm damgamızla 32'yi aşıyor ve
# xorriso "Metin çok uzun" hatasıyla duruyor. Sabit kısa etikete çeviriyoruz.
sed -i 's|-volid "alpine-${profile_abbrev:-$PROFILE} $RELEASE $ARCH"|-volid "TEDBIRGE_WEBOS"|g' \
  /home/builder/aports/scripts/mkimg.base.sh
if grep -q 'volid "alpine-' /home/builder/aports/scripts/mkimg.base.sh; then
  echo "! volid yaması uygulanamadı (mkimg.base.sh beklenenden farklı)."
  exit 1
fi
echo "-- ISO birim etiketi: TEDBIRGE_WEBOS"

# Etiket senkronizasyonu: acilis satiri ile imaj etiketi ayrisirsa canli ortam
# "Mounting boot media failed" ile kurtarma kabuguna duser. Bu yuzden zorunlu kontrol.
if ! grep -q 'alpine_dev=LABEL=TEDBIRGE_WEBOS' "$WORK/alpine/mkimg.tedbirge.sh"; then
  echo "! Acilis satirindaki etiket ile ISO etiketi ayrisik (alpine_dev=LABEL=TEDBIRGE_WEBOS yok)."
  exit 1
fi
if [ -d "$WORK/alpine/boot" ]; then
  echo "! alpine/boot ikinci bir acilis menusu tanimliyor; tek kaynak mkimg.tedbirge.sh olmali."
  exit 1
fi
if grep -qE 'unionfs_size=|tmpfs_size=' "$WORK/alpine/mkimg.tedbirge.sh"; then
  echo "! Acilis satirinda kok dosya sistemi tavani var (unionfs_size/tmpfs_size)."
  echo "  Bu tavan canli kok kurulumunu yarida keser: /sbin/init olusmaz ve"
  echo "  cekirdek 'Attempted to kill init' ile durur. Parametreyi kaldirin."
  exit 1
fi
# modules= bir izin listesidir. Depolama denetleyicisi eksikse acilis ortami
# bulunamaz, kok yarim kalir ve switch_root "Attempted to kill init" verir.
for m in ahci ata_piix nvme sr_mod mmc_block uhci_hcd virtio_blk virtio_scsi; do
  grep -q "modules=[^\" ]*[,=]$m[,\" ]" "$WORK/alpine/mkimg.tedbirge.sh" || {
    echo "! Acilis satirindaki modules= listesinde '$m' yok."
    echo "  SATA/IDE/NVMe/eMMC/CD-ROM veya sanal disk denetleyicisi yuklenmez;"
    echo "  eski masaustu ve dizustulerde acilis kernel panic ile durur."
    exit 1
  }
done
if ! grep -q 'rootflags=size=' "$WORK/alpine/mkimg.tedbirge.sh"; then
  echo "! Canli kok icin rootflags=size= tanimli degil; varsayilan yarim RAM"
  echo "  tavani masaustu paketlerinde kurulumu yarida keser."
  exit 1
fi
echo "-- acilis satiri etiketi, surucu listesi ve kok alani dogrulandi"

# Canli sistemin gercek paket listesini yalniz world heredoc'undan oku. Tum
# dosyada grep yapmak, yorumdaki bir paket adini yanlislikla gecerli sayabilir.
WORLD_PKGS=$(awk '
  /makefile root:root 0644 .*\/etc\/apk\/world.*<<.EOF./ { inside=1; next }
  inside && /^EOF$/ { exit }
  inside { print }
' "$WORK/alpine/genapkovl-tedbirge.sh")
[ -n "$WORLD_PKGS" ] || {
  echo "! Canli sistem paket listesi okunamadi." >&2
  exit 1
}
for p in alpine-base openrc nginx chromium xorg-server xinit linux-lts mkinitfs grub-bios grub-efi; do
  printf '%s\n' "$WORLD_PKGS" | grep -qx "$p" || {
    echo "! Canli sistem paket listesinde (world) '$p' yok; sistem paketsiz acilir." >&2
    exit 1
  }
done
echo "-- canli sistem paket listesi dogrulandi"

# Donanim yoneticisi tek yigin olmalidir. NetworkManager ile eudev kullanilir;
# mdev ve udev ayni anda acilirsa aygit olaylari yarisa girer.
for service in udev udev-trigger udev-settle; do
  grep -q "rc_add $service sysinit" "$WORK/alpine/genapkovl-tedbirge.sh" || {
    echo "! eudev servisi etkin degil: $service" >&2; exit 1;
  }
done
if grep -qE 'rc_add (mdev|hwdrivers) sysinit' "$WORK/alpine/genapkovl-tedbirge.sh"; then
  echo "! mdev ve eudev ayni imajda etkinlestirilemez." >&2
  exit 1
fi

# modules= listesi kadar initramfs ozellikleri de depolama yollarini tasimali.
for feature in ata cdrom mmc nvme scsi usb virtio; do
  FEATURES=$(sed -n 's/^[[:space:]]*initfs_features="\([^"]*\)".*/\1/p' "$WORK/alpine/mkimg.tedbirge.sh")
  printf '%s\n' "$FEATURES" | tr ' ' '\n' | grep -qx "$feature" || {
    echo "! initramfs ozelliklerinde '$feature' yok." >&2; exit 1;
  }
done


chown -R builder:abuild /home/builder/aports



# Tedbirge profili + apkovl üreticisi
cp "$WORK/alpine/mkimg.tedbirge.sh" /home/builder/aports/scripts/
cp "$WORK/alpine/genapkovl-tedbirge.sh" /home/builder/aports/scripts/
chmod +x /home/builder/aports/scripts/mkimg.tedbirge.sh /home/builder/aports/scripts/genapkovl-tedbirge.sh

# Web paketi + açılış menüsü + kurulum sihirbazı overlay'e taşınır
mkdir -p /home/builder/tedbirge
tar -czf /home/builder/tedbirge/htdocs.tar.gz -C "$WEBROOT" .
cp -r "$WORK/alpine/install" /home/builder/tedbirge/install
cp "$WORK/scripts/setup-tedbirge-disk.sh" /home/builder/tedbirge/install/setup-tedbirge-disk.sh
chmod +x /home/builder/tedbirge/install/*.sh

# Guc koprusu ikilisi (varsa) overlay'e tasinir; yoksa apkovl kabuk yedegini kurar.
if [ -s "$WORK/build-iso/payload/bin/tedbirge-sysbridge" ]; then
  mkdir -p /home/builder/tedbirge/bin
  cp "$WORK/build-iso/payload/bin/tedbirge-sysbridge" /home/builder/tedbirge/bin/
  chmod +x /home/builder/tedbirge/bin/tedbirge-sysbridge
  echo "-- guc koprusu ikilisi paketlendi"
else
  echo "-- guc koprusu ikilisi yok; kabuk yedegi kullanilacak"
fi
chown -R builder:abuild /home/builder/tedbirge

mkdir -p "$OUT" /home/builder/iso
chown -R builder:abuild /home/builder/iso

# Paket listesi on-dogrulamasi: mkimage'a girmeden once olmayan paketleri bildir.
# `apk policy` bilinmeyen paket icin de sifir cikis kodu verebildiginden burada
# kullanilmaz. Tam adla `apk search -x` gercek depo kaydini zorunlu kilar.
PKGS=$(sed -n '/apks="\$apks/,/^[[:space:]]*"[[:space:]]*$/p' \
  /home/builder/aports/scripts/mkimg.tedbirge.sh \
  | sed -e '1d' -e '$d' -e 's/"//g')
[ -n "$PKGS" ] || {
  echo "HATA: profil paket listesi cikartilamadi; bos imaj uretilmeyecek." >&2
  exit 1
}
MISSING=""
for p in $PKGS; do
  apk search -x "$p" 2>/dev/null | grep -q . || MISSING="$MISSING $p"
done
if [ -n "$MISSING" ]; then
  echo "HATA: su paketler Alpine v3.20 depolarinda yok:$MISSING" >&2
  exit 1
fi
echo "-- paket listesi dogrulandi ($(echo "$PKGS" | wc -w) paket)"

# Donanim yetenekleri profil ile birlikte ve gercek depoya karsi denetlenir.
# Boylece is akisi ile imaj profili zaman icinde birbirinden kopamaz.
# Not: surucu yazilimlari (linux-firmware) mkimage tarafindan modloop icine
# konur; kok dosya sistemine ikinci kez kurulmaz.
for p in mesa-vulkan-intel acpid zram-init pipewire nvme-cli linux-lts mkinitfs grub-bios sfdisk; do
  echo "$PKGS" | tr -s '[:space:]' '\n' | grep -qx "$p" || {
    echo "HATA: zorunlu donanim/kurulum paketi profilde yok: $p" >&2
    exit 1
  }
done
echo "-- donanim paketleri dogrulandi"



su builder -c "cd /home/builder/aports/scripts && \
  TEDBIRGE_VERSION='$VERSION' TEDBIRGE_PAYLOAD=/home/builder/tedbirge \
  sh mkimage.sh \
    --tag '$VERSION' \
    --outdir /home/builder/iso \
    --arch x86_64 \
    --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/main \
    --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/community \
    --profile tedbirge"

set -- /home/builder/iso/*.iso
[ -e "$1" ] || {
  echo "HATA: mkimage tamamlandi ancak ISO dosyasi olusmadi." >&2
  exit 1
}

for f in /home/builder/iso/*.iso; do
  [ -e "$f" ] || continue
  cp "$f" "$OUT/tedbirge-webos-$VERSION-x86_64.iso"
done

ls -lh "$OUT"
