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
	kernel_cmdline="unionfs_size=512M console=tty0 quiet"
	syslinux_serial=""
	kernel_flavors="lts"
	kernel_addons=""
	initfs_features="ata base bootchart cdrom squashfs ext4 f2fs mmc nvme scsi usb virtio kms network"
	grub_mod="all_video disk part_gpt part_msdos linux normal configfile search search_label efi_gop fat iso9660 cat echo ls test true help gzio"
	boot_addons=""
	apks="$apks
		alpine-base alpine-conf openrc busybox-initscripts
		nginx
		chromium
		xorg-server xf86-input-libinput xf86-video-fbdev xinit setxkbmap xset xrandr
		mesa mesa-dri-gallium mesa-egl mesa-gl mesa-gles mesa-gbm mesa-va-gapi mesa-vdpau-gallium
		mesa-vulkan-intel mesa-vulkan-ati mesa-vulkan-swrast vulkan-loader vulkan-tools
		libva libva-utils libdrm
		linux-firmware-i915 linux-firmware-amdgpu linux-firmware-nvidia
		dbus dbus-x11 acpid
		font-dejavu ttf-dejavu
		eudev udev-init-scripts
		networkmanager networkmanager-wifi networkmanager-cli
		wireless-tools wpa_supplicant iw ethtool
		linux-firmware-iwlwifi linux-firmware-ath9k_htc linux-firmware-ath10k
		linux-firmware-ath11k linux-firmware-rtlwifi linux-firmware-rtw88
		linux-firmware-rtw89 linux-firmware-brcm linux-firmware-mediatek
		linux-firmware-rtl_nic linux-firmware-other
		bluez bluez-openrc
		alsa-utils alsa-lib alsa-ucm-conf pipewire pipewire-alsa pipewire-pulse wireplumber
		nvme-cli util-linux blkid lsblk findmnt
		e2fsprogs f2fs-tools exfatprogs ntfs-3g dosfstools parted
		syslinux grub grub-efi efibootmgr
		zram-init util-linux-misc
		curl ca-certificates tzdata pciutils usbutils
		"
	apkovl="genapkovl-tedbirge.sh"
}
