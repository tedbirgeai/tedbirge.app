#!/usr/bin/env bash
# Kalıcı kurulum testi: canlı ISO'yu QEMU'da aç, diske otomatik kur, sonra
# ISO'yu çıkarıp yalnız diskten yeniden aç. Bugüne kadar eksik olan asıl test budur.
set -uo pipefail
cd "$(dirname "$0")/.."

export DEBIAN_FRONTEND=noninteractive

ISO="${1:-${TEDBIRGE_ISO:-build-iso/iso/tedbirge-webos-workstation-x86_64.iso}}"
STALL="${INSTALL_STALL:-180}"   # ilerlemesizlik siniri (saniye)
QEMU_STOP_TIMEOUT="${QEMU_STOP_TIMEOUT:-15}"

[ -s "$ISO" ] || { echo "::error::ISO yok: $ISO"; exit 1; }
command -v qemu-system-x86_64 >/dev/null || { echo "::error::qemu yok"; exit 1; }

TMP=build-iso/install-boot
rm -rf "$TMP"; mkdir -p "$TMP"
xorriso -osirrox on -indev "$ISO" -extract /live/vmlinuz "$TMP/vmlinuz" >/dev/null 2>&1 \
  || { echo "::error::ISO çekirdeği çıkarılamadı"; exit 1; }
xorriso -osirrox on -indev "$ISO" -extract /live/initrd.img "$TMP/initrd.img" >/dev/null 2>&1 \
  || { echo "::error::ISO initrd dosyası çıkarılamadı"; exit 1; }

izle() { # log, basari-deseni, hata-deseni, pid, ilerlemesizlik-siniri
  # Sabit toplam sure yerine LOG AKTIVITESI izlenir: kayit buyudugu surece
  # beklenir, yalnizca gercekten sessiz kalirsa (kilitlenme) basarisiz sayilir.
  local log="$1" ok="$2" bad="$3" pid="$4" stall="$5" i=0 sessiz=0 boy onceki=-1
  while :; do
    grep -qE "$ok" "$log" 2>/dev/null && return 0
    grep -qiE "$bad" "$log" 2>/dev/null && return 2
    kill -0 "$pid" 2>/dev/null || return 3
    boy=$(stat -c%s "$log" 2>/dev/null || echo 0)
    if [ "$boy" = "$onceki" ]; then sessiz=$((sessiz + 3)); else sessiz=0; onceki="$boy"; fi
    if [ $((i % 60)) -eq 0 ] && [ "$i" -gt 0 ]; then
      echo "... ${i}s calisiyor (ilerlemesiz ${sessiz}s, son satir: $(tail -n 1 "$log" 2>/dev/null))"
    fi
    if [ "$sessiz" -ge "$stall" ]; then
      echo "::error::${stall}s boyunca hicbir ilerleme yok — kilitlenme."
      return 1
    fi
    sleep 3; i=$((i + 3))
  done
}

qemu_temiz_kapat() { # pid, qmp-soketi, basari-bayragi-goruldu(0/1)
  local pid="$1" soket="$2" bayrak="${3:-0}" i=0 rc=0
  if ! kill -0 "$pid" 2>/dev/null; then
    wait "$pid"; rc=$?
    [ "$rc" = 0 ] || echo "::warning::QEMU kendiliginden $rc koduyla kapandi."
    return 0
  fi

  # QMP quit, emulatore kontrollu ve sifir cikis kodlu kapanis yaptirir.
  python3 - "$soket" <<'PY' 2>/dev/null || true
import socket, sys, time
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.settimeout(3)
sock.connect(sys.argv[1])
sock.recv(4096)
sock.sendall(b'{"execute":"qmp_capabilities"}\r\n')
time.sleep(0.1)
sock.sendall(b'{"execute":"quit"}\r\n')
sock.close()
PY
  while kill -0 "$pid" 2>/dev/null && [ "$i" -lt "$QEMU_STOP_TIMEOUT" ]; do
    sleep 1; i=$((i + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    if [ "$bayrak" = "1" ]; then
      # Asamanin asil olcutu (kurulum/acilis bayragi) zaten uretildi; emulatorun
      # kapanmamasi urun hatasi degildir, bu yuzden asama basarili sayilir.
      echo "::warning::QEMU ${QEMU_STOP_TIMEOUT}s icinde kapanmadi; basari bayragi uretildigi icin surec zorla sonlandirildi ve asama basarili sayildi."
      return 0
    fi
    echo "::error::QEMU kontrollu kapanisa ${QEMU_STOP_TIMEOUT}s icinde yanit vermedi."
    return 1
  fi
  wait "$pid"; rc=$?
  [ "$rc" = 0 ] || echo "::warning::QEMU kapanis kodu: $rc (basari bayragi esas alindi)."
  return 0
}


# Sessiz UEFI acilis hatalarinda diskin acilis bolumunu (ESP) disaridan okur.
esp_denetle() { # qcow2-disk
  local disk="$1" ham="build-iso/esp-denetim.raw" ofs
  command -v mdir >/dev/null 2>&1 || { echo "(ESP denetimi icin mtools yok)"; return 0; }
  qemu-img convert -f qcow2 -O raw "$disk" "$ham" 2>/dev/null || return 0
  echo "---- disk bolum tablosu ----"; sfdisk -l "$ham" 2>/dev/null || true
  ofs=$(sfdisk -J "$ham" 2>/dev/null | python3 -c '
import json,sys
try: t=json.load(sys.stdin)["partitiontable"]
except Exception: sys.exit()
s=t.get("sectorsize",512)
for p in t.get("partitions",[]):
    if "EFI" in str(p.get("name","")) or str(p.get("type","")).upper().startswith("C12A7328"):
        print(p["start"]*s); break
')
  if [ -n "${ofs:-}" ]; then
    echo "---- ESP icerigi (EFI/BOOT) ----"
    mdir -i "$ham@@$ofs" ::/EFI/BOOT 2>&1 | head -20 || true
  else
    echo "(ESP bolumu bulunamadi)"
  fi
  rm -f "$ham"
}

kurulum_senaryosu() {

  local mod="$1"; shift
  local disk="build-iso/kurulum-${mod}.qcow2"
  local log1="build-iso/kurulum-${mod}-asama1.log"
  local log2="build-iso/kurulum-${mod}-asama2.log"
  local qmp1="build-iso/kurulum-${mod}-asama1.qmp"
  local qmp2="build-iso/kurulum-${mod}-asama2.qmp"
  rm -f "$disk" "$log1" "$log2" "$qmp1" "$qmp2"
  timeout --foreground 60s stdbuf -oL -eL qemu-img create -f qcow2 "$disk" 20G >/dev/null \
    || { echo "::error::$mod test diski olusturulamadi."; return 1; }

  echo "==== $mod 1. aşama: canlı sistemden diske kurulum ===="
  stdbuf -oL -eL qemu-system-x86_64 -m 4096 -smp 4 -accel tcg,thread=multi -display none \
    -no-reboot -action shutdown=poweroff \
    -qmp unix:"$qmp1",server=on,wait=off \
    -kernel "$TMP/vmlinuz" -initrd "$TMP/initrd.img" \
    -append "boot=live components noeject rootdelay=5 live-media-timeout=20 console=ttyS0,115200 tedbirge.autoinstall=1 tedbirge.install-mode=$mod" \
    -drive if=none,id=media,format=raw,readonly=on,file="$ISO" \
    -device ahci,id=ahci -device ide-cd,bus=ahci.0,drive=media \
    -drive file="$disk",format=qcow2,if=virtio,cache=unsafe \
    -serial file:"$log1" 2>"build-iso/kurulum-${mod}-asama1.stderr.log" &
  local p1=$! rc
  izle "$log1" "TEDBIRGE_INSTALL_OK" "TEDBIRGE_INSTALL_FAIL|Kernel panic|Attempted to kill init" "$p1" "$STALL"; rc=$?
  if [ "$rc" = 0 ]; then
    qemu_temiz_kapat "$p1" "$qmp1" 1 || rc=4
  else
    qemu_temiz_kapat "$p1" "$qmp1" 0 >/dev/null 2>&1 || true
  fi

  tail -n 60 "$log1" 2>/dev/null
  [ "$rc" = 0 ] || { echo "::error::$mod diske kurulum testi başarısız (kod $rc)."; return 1; }

  echo "==== $mod 2. aşama: kurulan sistemden SATA açılışı ===="
  # Kurulumda virtio yalnızca TCG altında kopyalamayı hızlandırır. Yeniden açılış
  # gerçek dizüstü/masaüstü bilgisayarlar gibi AHCI/SATA üzerinden yapılır.
  # NOT: UEFI'de "-boot order=c,menu=on" firmware'i acilis yoneticisi ekraninda
  # sonsuz bekletebilir (seri porta tek satir bile dusmez). Bu yuzden acilis
  # sirasi yalnizca BIOS'ta verilir; UEFI'de bootindex yeterlidir.
  local BOOTARG=(-boot order=c)
  [ "$mod" = "uefi" ] && BOOTARG=()
  stdbuf -oL -eL qemu-system-x86_64 -m 4096 -smp 4 -accel tcg,thread=multi -display none \
    -no-reboot -action shutdown=poweroff "$@" \
    -qmp unix:"$qmp2",server=on,wait=off \
    ${BOOTARG[@]+"${BOOTARG[@]}"} \
    -device ahci,id=system-ahci \
    -drive if=none,id=system-disk,file="$disk",format=qcow2,cache=unsafe \
    -device ide-hd,bus=system-ahci.0,drive=system-disk,bootindex=1 \
    -debugcon file:"build-iso/kurulum-${mod}-firmware.log" -global isa-debugcon.iobase=0x402 \
    -serial file:"$log2" 2>"build-iso/kurulum-${mod}-asama2.stderr.log" &
  local p2=$!
  izle "$log2" "TEDBIRGE_BOOT_READY" "Kernel panic|Attempted to kill init|No bootable device|Operating System not found|grub rescue" "$p2" "$STALL"; rc=$?
  if [ "$rc" = 0 ]; then
    qemu_temiz_kapat "$p2" "$qmp2" 1 || rc=4
  else
    qemu_temiz_kapat "$p2" "$qmp2" 0 >/dev/null 2>&1 || true
  fi

  tail -n 60 "$log2" 2>/dev/null
  if [ "$rc" != 0 ]; then
    # Sessiz acilis hatasi bir daha kor nokta kalmasin: firmware, emulator ve
    # diskin acilis bolumu (ESP) icerigi hata ciktisina basilir.
    echo "---- $mod UEFI/BIOS firmware kaydi (son 40 satir) ----"
    tail -n 40 "build-iso/kurulum-${mod}-firmware.log" 2>/dev/null || echo "(firmware kaydi yok)"
    echo "---- $mod emulator hata kaydi (son 40 satir) ----"
    tail -n 40 "build-iso/kurulum-${mod}-asama2.stderr.log" 2>/dev/null || echo "(kayit yok)"
    esp_denetle "$disk"
    echo "::error::$mod kurulu sistem açılış testi başarısız (kod $rc)."
    return 1
  fi

  echo "✓ $mod kalıcı kurulum zinciri geçti."
}

HATA=0
kurulum_senaryosu bios || HATA=1

OVMF_CODE="${OVMF_CODE:-}"; OVMF_VARS="${OVMF_VARS:-}"
[ -n "$OVMF_CODE" ] || OVMF_CODE=$(find /usr/share -type f -name 'OVMF_CODE*.fd' -print -quit)
[ -n "$OVMF_VARS" ] || OVMF_VARS=$(find /usr/share -type f -name 'OVMF_VARS*.fd' -print -quit)
[ -r "$OVMF_CODE" ] && [ -r "$OVMF_VARS" ] || { echo "::error::UEFI firmware bulunamadı"; exit 1; }
cp "$OVMF_VARS" build-iso/kurulum-OVMF_VARS.fd
kurulum_senaryosu uefi \
  -drive if=pflash,format=raw,readonly=on,file="$OVMF_CODE" \
  -drive if=pflash,format=raw,file=build-iso/kurulum-OVMF_VARS.fd || HATA=1

# Onceden bu betik senaryolar basarisiz olsa bile 0 ile cikiyordu; hatali imaj
# yayinlanabiliyordu. Artik tek bir basarisiz senaryo bile is akisini durdurur.
if [ "$HATA" -ne 0 ]; then
  echo "::error::Kalıcı kurulum zinciri başarısız — imaj yayınlanmayacak."
  exit 1
fi

echo "Kalıcı kurulum zinciri baştan sona doğrulandı."
