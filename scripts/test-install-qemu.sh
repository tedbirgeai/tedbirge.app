#!/usr/bin/env bash
# Kalıcı kurulum testi: canlı ISO'yu QEMU'da aç, diske otomatik kur, sonra
# ISO'yu çıkarıp yalnız diskten yeniden aç. Bugüne kadar eksik olan asıl test budur.
set -uo pipefail
cd "$(dirname "$0")/.."

export DEBIAN_FRONTEND=noninteractive

ISO=build-iso/iso/tedbirge-webos-x86_64.iso
TIMEOUT="${INSTALL_TIMEOUT:-1500}"
QEMU_STOP_TIMEOUT="${QEMU_STOP_TIMEOUT:-30}"

[ -s "$ISO" ] || { echo "::error::ISO yok: $ISO"; exit 1; }
command -v qemu-system-x86_64 >/dev/null || { echo "::error::qemu yok"; exit 1; }

TMP=build-iso/install-boot
rm -rf "$TMP"; mkdir -p "$TMP"
xorriso -osirrox on -indev "$ISO" -extract /live/vmlinuz "$TMP/vmlinuz" >/dev/null 2>&1 \
  || { echo "::error::ISO çekirdeği çıkarılamadı"; exit 1; }
xorriso -osirrox on -indev "$ISO" -extract /live/initrd.img "$TMP/initrd.img" >/dev/null 2>&1 \
  || { echo "::error::ISO initrd dosyası çıkarılamadı"; exit 1; }

izle() { # log, basari-deseni, hata-deseni, pid, sure
  local log="$1" ok="$2" bad="$3" pid="$4" limit="$5" i=0
  while [ "$i" -lt "$limit" ]; do
    grep -qE "$ok" "$log" 2>/dev/null && return 0
    grep -qiE "$bad" "$log" 2>/dev/null && return 2
    kill -0 "$pid" 2>/dev/null || return 3
    # Uzun beklemede iş akışı kaydı sessiz kalmasın (canlı ilerleme).
    if [ $((i % 60)) -eq 0 ] && [ "$i" -gt 0 ]; then
      echo "... ${i}s bekleniyor (son satır: $(tail -n 1 "$log" 2>/dev/null))"
    fi
    sleep 3; i=$((i + 3))
  done
  return 1
}

qemu_temiz_kapat() { # pid, qmp-soketi
  local pid="$1" soket="$2" i=0 rc=0
  if ! kill -0 "$pid" 2>/dev/null; then
    wait "$pid"; rc=$?
    [ "$rc" = 0 ] || echo "::warning::QEMU kendiliginden $rc koduyla kapandi."
    return "$rc"
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
    echo "::error::QEMU kontrollu kapanisa ${QEMU_STOP_TIMEOUT}s icinde yanit vermedi."
    kill -TERM "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    return 1
  fi
  wait "$pid"; rc=$?
  [ "$rc" = 0 ] || { echo "::error::QEMU kapanis kodu: $rc"; return 1; }
  return 0
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
  qemu-system-x86_64 -m 4096 -smp 4 -accel tcg,thread=multi -display none -no-reboot \
    -qmp unix:"$qmp1",server=on,wait=off \
    -kernel "$TMP/vmlinuz" -initrd "$TMP/initrd.img" \
    -append "boot=live components noeject rootdelay=5 live-media-timeout=20 console=ttyS0,115200 tedbirge.autoinstall=1 tedbirge.install-mode=$mod" \
    -drive if=none,id=media,format=raw,readonly=on,file="$ISO" \
    -device ahci,id=ahci -device ide-cd,bus=ahci.0,drive=media \
    -drive file="$disk",format=qcow2,if=virtio,cache=unsafe \
    -serial file:"$log1" 2>"build-iso/kurulum-${mod}-asama1.stderr.log" &
  local p1=$! rc
  izle "$log1" "TEDBIRGE_INSTALL_OK" "TEDBIRGE_INSTALL_FAIL|Kernel panic|Attempted to kill init" "$p1" "$TIMEOUT"; rc=$?
  if [ "$rc" = 0 ]; then
    qemu_temiz_kapat "$p1" "$qmp1" || rc=4
  else
    qemu_temiz_kapat "$p1" "$qmp1" >/dev/null 2>&1 || true
  fi
  tail -n 60 "$log1" 2>/dev/null
  [ "$rc" = 0 ] || { echo "::error::$mod diske kurulum testi başarısız (kod $rc)."; return 1; }

  echo "==== $mod 2. aşama: kurulan sistemden SATA açılışı ===="
  # Kurulumda virtio yalnızca TCG altında kopyalamayı hızlandırır. Yeniden açılış
  # gerçek dizüstü/masaüstü bilgisayarlar gibi AHCI/SATA üzerinden yapılır.
  # Bazı OVMF sürümleri virtio diski açılış aygıtı olarak hiç görmez ve seri
  # porta tek satır yazmadan bekler; eski 15 dakikalık sahte "donma" buydu.
  qemu-system-x86_64 -m 4096 -smp 4 -accel tcg,thread=multi -display none -no-reboot "$@" \
    -qmp unix:"$qmp2",server=on,wait=off \
    -boot order=c,menu=off,strict=on \
    -device ahci,id=system-ahci \
    -drive if=none,id=system-disk,file="$disk",format=qcow2,cache=unsafe \
    -device ide-hd,bus=system-ahci.0,drive=system-disk,bootindex=0 \
    -debugcon file:"build-iso/kurulum-${mod}-firmware.log" -global isa-debugcon.iobase=0x402 \
    -serial file:"$log2" 2>"build-iso/kurulum-${mod}-asama2.stderr.log" &
  local p2=$!
  izle "$log2" "TEDBIRGE_BOOT_READY" "Kernel panic|Attempted to kill init|No bootable device|Operating System not found|grub rescue" "$p2" 300; rc=$?
  if [ "$rc" = 0 ]; then
    qemu_temiz_kapat "$p2" "$qmp2" || rc=4
  else
    qemu_temiz_kapat "$p2" "$qmp2" >/dev/null 2>&1 || true
  fi
  tail -n 60 "$log2" 2>/dev/null
  [ "$rc" = 0 ] || { echo "::error::$mod kurulu sistem açılış testi başarısız (kod $rc)."; return 1; }
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
