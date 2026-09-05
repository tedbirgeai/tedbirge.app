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
		xorg-server xf86-input-libinput xinit setxkbmap xset
		mesa-dri-gallium mesa-va-gapi
		dbus dbus-x11
		font-dejavu ttf-dejavu
		eudev udev-init-scripts
		networkmanager networkmanager-wifi wireless-tools wpa_supplicant
		alsa-utils alsa-lib
		e2fsprogs dosfstools parted syslinux grub grub-efi efibootmgr
		curl ca-certificates tzdata
		"
	apkovl="genapkovl-tedbirge.sh"
}
