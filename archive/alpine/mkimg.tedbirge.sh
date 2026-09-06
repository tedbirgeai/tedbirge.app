#!/bin/sh
# Tedbirge(R) WebOS — Alpine mkimage profili (canlı kiosk + diske kurulum)
# aports/scripts içine kopyalanıp `mkimage.sh --profile tedbirge` ile çağrılır.

profile_tedbirge() {
	profile_standard
	title="Tedbirge WebOS"
	desc="Tedbirge(R) WebOS · canli kiosk ve kalici kurulum"
	profile_abbrev="tedbirge"
	image_ext="iso"
	arch="x86_64"
	output_format="iso"
	# Acilis satiri tek kaynaktir: alpine/boot altinda ikinci bir menu dosyasi tutulmaz.
	# TEDBIRGE_WEBOS etiketi alpine/ci-build.sh icindeki -volid yamasi ile birebir aynidir.
	# DIKKAT: unionfs_size/tmpfs_size ile kok dosya sistemi SINIRLANMAZ. Canli kok
	# bellekte kurulur; 512M gibi bir tavan paket kurulumunu yarida keser ve
	# /sbin/init olusmadigi icin cekirdek "Attempted to kill init" ile durur.
	#
	# modules= bir IZIN LISTESIDIR: initramfs yalnizca burada yazan surucuyu
	# yukler. SATA (ahci/ata_piix), NVMe, CD-ROM (sr_mod), eski USB (uhci) ve
	# sanal disk surucusu listede yoksa acilis ortami bulunamaz, kok yarim kalir
	# ve cekirdek switch_root sirasinda "Attempted to kill init" verir.
	#
	# rootflags=size=90%: canli kok RAM'de kurulur. Varsayilan tavan RAM'in
	# yarisidir; masaustu paketleri bu tavana sigmayinca kurulum yarida kesilir.
	kernel_cmdline="modules=loop,squashfs,sd-mod,ahci,libata,ata_piix,ata_generic,pata_acpi,sr_mod,cdrom,nvme,mmc_block,sdhci,sdhci_pci,usb-storage,uas,xhci_hcd,ehci_hcd,ohci_hcd,uhci_hcd,virtio_pci,virtio_blk,virtio_scsi,iso9660,overlay,vfat,ext4 alpine_dev=LABEL=TEDBIRGE_WEBOS rootflags=size=90% waitusb=10 rootwait rootdelay=7 console=tty0 console=ttyS0,115200"
	syslinux_serial=""
	kernel_flavors="lts"
	kernel_addons=""
	initfs_features="ata base bootchart cdrom squashfs ext4 f2fs mmc nvme raid scsi usb virtio kms network keymap"
	grub_mod="all_video disk part_gpt part_msdos linux normal configfile search search_label efi_gop fat iso9660 cat echo ls test true help gzio"
	boot_addons=""
	# Bu liste ISO icindeki paket deposunu olusturur: hem canli sistem hem de
	# diske kurulum (setup-disk) internet olmadan yalniz buradan beslenir.
	# Surucu yazilimlari (linux-firmware) mkimage tarafindan modloop icine
	# ayrica konur; kok dosya sistemine ikinci kez kurulmaz.
	apks="$apks
		alpine-base alpine-conf openrc busybox-suid
		nginx
		chromium
		xorg-server xf86-input-libinput xf86-video-fbdev xinit setxkbmap xset xrandr
		mesa mesa-dri-gallium mesa-egl mesa-gl mesa-gles mesa-gbm
		mesa-vulkan-intel mesa-vulkan-swrast vulkan-loader
		libva libdrm

		dbus dbus-x11 acpid
		font-dejavu
		eudev udev-init-scripts
		networkmanager networkmanager-wifi networkmanager-cli
		wireless-tools wpa_supplicant iw ethtool
		bluez bluez-openrc
		alsa-utils alsa-lib alsa-ucm-conf pipewire pipewire-alsa pipewire-pulse wireplumber
		nvme-cli util-linux blkid lsblk findmnt sfdisk
		e2fsprogs e2fsprogs-extra f2fs-tools exfatprogs ntfs-3g dosfstools parted
		syslinux grub grub-efi grub-bios efibootmgr
		linux-lts mkinitfs linux-firmware-none
		zram-init logrotate
		curl ca-certificates tzdata pciutils usbutils
		"

	apkovl="genapkovl-tedbirge.sh"
}
