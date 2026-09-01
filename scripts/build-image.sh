#!/usr/bin/env bash
# FAZ 5 — Gerçek önyüklenebilir Tedbirge OS imajı (x86_64)
# ------------------------------------------------------------------
# Katmanlar:
#   1. Linux çekirdeği (ana makineden ya da KERNEL= ile verilen bzImage)
#   2. initramfs        (busybox tabanlı, /init → /opt/tedbirge/boot.sh)
#   3. squashfs kök     (kabuk paketi + yerel kabuk ikilisi)
#   4. Hibrit önyükleme (isolinux → Legacy BIOS, grub-efi → UEFI)
# Çıktı: .iso (hibrit, dd ile USB'ye de yazılır) ve ham .img
#
# Kullanım (kök yetkili Linux ana makine):
#   sudo bash scripts/build-image.sh
#   KERNEL=/boot/vmlinuz-6.6 ARCH=x86_64 bash scripts/build-image.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ARCH=${ARCH:-$(uname -m)}
case "$ARCH" in
  x86_64|amd64) ARCH=x86_64 ;;
  aarch64|arm64) ARCH=aarch64 ;;
  riscv64) ARCH=riscv64 ;;
  *) echo "! Desteklenmeyen mimari: $ARCH"; exit 1 ;;
esac

OUT=${OUT:-build/image/$ARCH}
STAGE=$OUT/root
BOOT=$OUT/boot
NAME=tedbirge-webos-$ARCH

need() { command -v "$1" >/dev/null 2>&1; }
warn() { echo "! $*"; }

echo "› Hedef mimari: $ARCH"
rm -rf "$OUT"; mkdir -p "$STAGE" "$BOOT" "$OUT"

# ---------------------------------------------------------------- 1) kök ağaç
case "$ARCH" in
  x86_64)  bash scripts/build-native.sh ;;
  aarch64) bash scripts/build-arm64.sh ;;
  riscv64) bash scripts/build-riscv64.sh ;;
esac

BIN=$(ls -1 crates/tedbirge-shell-native/target/*/release/tedbirge-shell \
        crates/tedbirge-shell-native/target/release/tedbirge-shell 2>/dev/null | head -n1 || true)
mkdir -p "$STAGE/opt/tedbirge" "$STAGE/etc" "$STAGE/var/tedbirge"
cp -r dist "$STAGE/opt/tedbirge/dist"
[ -n "$BIN" ] && cp "$BIN" "$STAGE/opt/tedbirge/tedbirge-shell"

cat > "$STAGE/opt/tedbirge/boot.sh" <<'BOOT'
#!/bin/sh
# Kiosk ya da başsız röle: görüntüleyici yoksa düğüm ağdan erişilir.
set -e
MODE=${TEDBIRGE_MODE:-auto}
/opt/tedbirge/tedbirge-shell --root /opt/tedbirge/dist --port 8377 \
  --mesh-port 7946 --state /var/tedbirge ${TEDBIRGE_HEADLESS:+--headless} &
[ "$MODE" = "headless" ] && { wait; exit 0; }
if command -v tedbirge-compositor >/dev/null 2>&1; then
  exec tedbirge-compositor --shell http://127.0.0.1:8377/
elif command -v cog >/dev/null 2>&1; then
  exec cog --enable-developer-extras=false http://127.0.0.1:8377/
elif command -v chromium >/dev/null 2>&1; then
  exec chromium --kiosk --no-sandbox --app=http://127.0.0.1:8377/
else
  echo "Tedbirge kabugu hazir: http://127.0.0.1:8377/"
  wait
fi
BOOT
chmod +x "$STAGE/opt/tedbirge/boot.sh"

cat > "$STAGE/etc/tedbirge-release" <<REL
NAME="Tedbirge® WebOS"
VARIANT="Layer 1 · bare-metal"
ARCH=$ARCH
SHELL_PORT=8377
MESH_PORT=7946
BUILD=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REL

# ------------------------------------------------------- 2) squashfs katmanı
if need mksquashfs; then
  mksquashfs "$STAGE" "$BOOT/tedbirge.squashfs" -comp zstd -noappend >/dev/null
  echo "✓ squashfs: $BOOT/tedbirge.squashfs"
else
  warn "mksquashfs yok — kök ağaç sıkıştırılmadan kullanılacak ($STAGE)"
fi

# -------------------------------------------------------------- 3) initramfs
IRD=$OUT/initramfs
mkdir -p "$IRD"/{bin,dev,proc,sys,mnt,newroot}
if need busybox; then
  cp "$(command -v busybox)" "$IRD/bin/busybox"
  ( cd "$IRD/bin" && for a in sh mount switch_root mkdir modprobe losetup; do ln -sf busybox $a; done )
else
  warn "busybox yok — initramfs üretilmiyor (KERNEL boot doğrudan kök diskten yapılmalı)"
fi

cat > "$IRD/init" <<'INIT'
#!/bin/sh
# Tedbirge initramfs: squashfs kökü bağla, gerçek köke geç.
/bin/mount -t proc none /proc
/bin/mount -t sysfs none /sys
/bin/mount -t devtmpfs none /dev 2>/dev/null || true
for d in /dev/sr0 /dev/sda1 /dev/mmcblk0p1 /dev/nvme0n1p1; do
  [ -b "$d" ] && /bin/mount -o ro "$d" /mnt 2>/dev/null && break
done
if [ -f /mnt/tedbirge.squashfs ]; then
  /bin/mount -t squashfs -o loop /mnt/tedbirge.squashfs /newroot
else
  /bin/mount --bind /mnt /newroot
fi
exec /bin/switch_root /newroot /opt/tedbirge/boot.sh
INIT
chmod +x "$IRD/init"

if need cpio && need gzip; then
  ( cd "$IRD" && find . | cpio -o -H newc 2>/dev/null | gzip -9 ) > "$BOOT/initramfs.img"
  echo "✓ initramfs: $BOOT/initramfs.img"
else
  warn "cpio/gzip yok — initramfs paketlenmedi"
fi

# ---------------------------------------------------------- 4) Linux çekirdeği
KERNEL=${KERNEL:-}
if [ -z "$KERNEL" ]; then
  for k in /boot/vmlinuz-linux /boot/vmlinuz /boot/bzImage; do [ -f "$k" ] && KERNEL=$k && break; done
fi
if [ -n "$KERNEL" ] && [ -f "$KERNEL" ]; then
  cp "$KERNEL" "$BOOT/vmlinuz"; echo "✓ çekirdek: $KERNEL"
else
  warn "Linux çekirdeği bulunamadı — KERNEL=/yol/bzImage ile verin (imaj çekirdeksiz üretilir)"
fi

# ------------------------------------------------- 5) hibrit önyükleyiciler
# 5a. Legacy BIOS — isolinux
mkdir -p "$BOOT/isolinux"
cat > "$BOOT/isolinux/isolinux.cfg" <<'CFG'
DEFAULT tedbirge
PROMPT 0
TIMEOUT 30
LABEL tedbirge
  MENU LABEL Tedbirge WebOS (bare-metal)
  KERNEL /vmlinuz
  APPEND initrd=/initramfs.img quiet console=tty1
LABEL headless
  MENU LABEL Tedbirge WebOS (bassiz role)
  KERNEL /vmlinuz
  APPEND initrd=/initramfs.img quiet TEDBIRGE_MODE=headless
CFG
for f in isolinux.bin ldlinux.c32; do
  src=$(ls /usr/lib/ISOLINUX/$f /usr/lib/syslinux/modules/bios/$f 2>/dev/null | head -n1 || true)
  [ -n "$src" ] && cp "$src" "$BOOT/isolinux/" || warn "$f yok (syslinux paketi gerekli)"
done

# 5b. UEFI — grub-efi
mkdir -p "$BOOT/EFI/BOOT" "$BOOT/boot/grub"
cat > "$BOOT/boot/grub/grub.cfg" <<'GRUB'
set timeout=3
set default=0
menuentry "Tedbirge WebOS (bare-metal)" {
  linux /vmlinuz quiet console=tty1
  initrd /initramfs.img
}
menuentry "Tedbirge WebOS (bassiz role)" {
  linux /vmlinuz quiet TEDBIRGE_MODE=headless
  initrd /initramfs.img
}
menuentry "Tedbirge Installer" {
  linux /vmlinuz quiet TEDBIRGE_MODE=installer
  initrd /initramfs.img
}
GRUB
if need grub-mkstandalone; then
  case "$ARCH" in
    x86_64) EFI_T=x86_64-efi; EFI_N=BOOTX64.EFI ;;
    aarch64) EFI_T=arm64-efi; EFI_N=BOOTAA64.EFI ;;
    riscv64) EFI_T=riscv64-efi; EFI_N=BOOTRISCV64.EFI ;;
  esac
  grub-mkstandalone -O "$EFI_T" -o "$BOOT/EFI/BOOT/$EFI_N" \
    "boot/grub/grub.cfg=$BOOT/boot/grub/grub.cfg" >/dev/null 2>&1 \
    && echo "✓ UEFI yükleyici: EFI/BOOT/$EFI_N" || warn "grub-mkstandalone başarısız"
else
  warn "grub-mkstandalone yok — UEFI yükleyici üretilmedi"
fi

# ------------------------------------------------------------- 6) paketleme
if need xorriso; then
  ISOARGS=(-as mkisofs -V TEDBIRGE -o "$OUT/$NAME.iso")
  [ -f "$BOOT/isolinux/isolinux.bin" ] && ISOARGS+=(-b isolinux/isolinux.bin -c isolinux/boot.cat \
      -no-emul-boot -boot-load-size 4 -boot-info-table)
  [ -f "$BOOT/EFI/BOOT/BOOTX64.EFI" ] && ISOARGS+=(-eltorito-alt-boot -e EFI/BOOT/BOOTX64.EFI -no-emul-boot)
  xorriso "${ISOARGS[@]}" "$BOOT" >/dev/null
  echo "✓ $OUT/$NAME.iso (hibrit BIOS+UEFI)"
else
  warn "xorriso yok — .iso üretilmedi"
fi

# Ham .img: dd ile doğrudan diske/USB'ye yazılabilir tek dosya.
if need dd && need mkfs.vfat && need mcopy; then
  SIZE_MB=$(( $(du -sm "$BOOT" | cut -f1) + 64 ))
  dd if=/dev/zero of="$OUT/$NAME.img" bs=1M count=$SIZE_MB status=none
  mkfs.vfat -n TEDBIRGE "$OUT/$NAME.img" >/dev/null
  ( cd "$BOOT" && for e in *; do mcopy -s -i "../$NAME.img" "$e" ::/ ; done )
  echo "✓ $OUT/$NAME.img (ham flash imajı, $SIZE_MB MB)"
else
  warn "dd/mkfs.vfat/mcopy yok — ham .img üretilmedi"
fi

echo
echo "Kök ağaç : $STAGE"
echo "Boot ağacı: $BOOT"
echo "USB'ye yazma: sudo dd if=$OUT/$NAME.img of=/dev/sdX bs=4M status=progress conv=fsync"
