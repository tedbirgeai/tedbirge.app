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
	kernel_cmdline="modules=loop,squashfs,sd-mod,usb-storage,uas,xhci_hcd,ehci_hcd,ohci_hcd,iso9660,overlay,vfat,ext4 alpine_dev=LABEL=TEDBIRGE_WEBOS waitusb=10 rootwait rootdelay=7 console=tty0 console=ttyS0,115200"
	syslinux_serial=""
	kernel_flavors="lts"
	kernel_addons=""
	initfs_features="ata base bootchart cdrom squashfs ext4 f2fs mmc nvme scsi usb virtio kms network keymap"
	grub_mod="all_video disk part_gpt part_msdos linux normal configfile search search_label efi_gop fat iso9660 cat echo ls test true help gzio"
	boot_addons=""
	apks="$apks
		alpine-base alpine-conf openrc
		nginx
		chromium
		xorg-server xf86-input-libinput xf86-video-fbdev xinit setxkbmap xset xrandr
		mesa mesa-dri-gallium mesa-egl mesa-gl mesa-gles mesa-gbm
		mesa-vulkan-swrast vulkan-loader
		libva libdrm
		linux-firmware-i915 linux-firmware-amdgpu

		dbus dbus-x11 acpid
		font-dejavu
		eudev udev-init-scripts
		networkmanager networkmanager-wifi networkmanager-cli
		wireless-tools wpa_supplicant iw ethtool
		linux-firmware-intel linux-firmware-ath9k_htc linux-firmware-ath10k
		linux-firmware-ath11k linux-firmware-rtlwifi linux-firmware-rtw88
		linux-firmware-rtw89 linux-firmware-brcm linux-firmware-mediatek
		linux-firmware-rtl_nic
		bluez bluez-openrc
		alsa-utils alsa-lib alsa-ucm-conf pipewire pipewire-alsa pipewire-pulse wireplumber
		nvme-cli util-linux blkid lsblk findmnt
		e2fsprogs f2fs-tools exfatprogs ntfs-3g dosfstools parted
		syslinux grub grub-efi efibootmgr
		zram-init
		curl ca-certificates tzdata pciutils usbutils
		"
	apkovl="genapkovl-tedbirge.sh"
}
