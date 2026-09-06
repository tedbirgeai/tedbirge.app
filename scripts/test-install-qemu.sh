#!/usr/bin/env bash
# Kalıcı kurulum testi: canlı ISO'yu QEMU'da aç, diske otomatik kur, sonra
# ISO'yu çıkarıp yalnız diskten yeniden aç. Bugüne kadar eksik olan asıl test budur.
set -uo pipefail
cd "$(dirname "$0")/.."

ISO=build-iso/iso/tedbirge-webos-x86_64.iso
DISK=build-iso/kurulum-testi.qcow2
LOG1=build-iso/kurulum-asama1.log
LOG2=build-iso/kurulum-asama2.log
TIMEOUT="${INSTALL_TIMEOUT:-1500}"

[ -s "$ISO" ] || { echo "::error::ISO yok: $ISO"; exit 1; }
command -v qemu-system-x86_64 >/dev/null || { echo "::error::qemu yok"; exit 1; }

rm -f "$DISK" "$LOG1" "$LOG2"
qemu-img create -f qcow2 "$DISK" 20G >/dev/null

izle() { # log, basari-deseni, hata-deseni, pid, sure
  local log="$1" ok="$2" bad="$3" pid="$4" limit="$5" i=0
  while [ "$i" -lt "$limit" ]; do
    grep -qE "$ok" "$log" 2>/dev/null && return 0
    grep -qiE "$bad" "$log" 2>/dev/null && return 2
    kill -0 "$pid" 2>/dev/null || return 3
    sleep 3; i=$((i + 3))
  done
  return 1
}

echo "==== 1. aşama: canlı sistemden diske kurulum ===="
# tedbirge.autoinstall=1 çekirdek parametresi kurulum aracını gözetimsiz çalıştırır.
qemu-system-x86_64 -m 4096 -smp 2 -display none -no-reboot \
  -drive if=none,id=media,format=raw,readonly=on,file="$ISO" \
  -device ahci,id=ahci -device ide-cd,bus=ahci.0,drive=media \
  -drive file="$DISK",format=qcow2,if=virtio \
  -serial file:"$LOG1" 2>build-iso/kurulum-asama1.stderr.log &
P1=$!

izle "$LOG1" "TEDBIRGE_INSTALL_OK" "TEDBIRGE_INSTALL_FAIL|Kernel panic|Attempted to kill init" "$P1" "$TIMEOUT"
RC=$?
kill -9 "$P1" 2>/dev/null; wait "$P1" 2>/dev/null
tail -n 60 "$LOG1" 2>/dev/null
case "$RC" in
  0) echo "Kurulum tamamlandı." ;;
  2) echo "::error::Diske kurulum başarısız."; exit 1 ;;
  3) echo "::error::Kurulum sanal makinesi beklenmedik şekilde sonlandı."; exit 1 ;;
  *) echo "::error::Kurulum ${TIMEOUT}s içinde tamamlanmadı."; exit 1 ;;
esac

echo "==== 2. aşama: kurulan sistemden açılış (ISO çıkarıldı) ===="
qemu-system-x86_64 -m 4096 -smp 2 -display none -no-reboot \
  -drive file="$DISK",format=qcow2,if=virtio \
  -serial file:"$LOG2" 2>build-iso/kurulum-asama2.stderr.log &
P2=$!

izle "$LOG2" "TEDBIRGE_BOOT_READY" "Kernel panic|Attempted to kill init|No bootable device|Operating System not found" "$P2" 900
RC=$?
kill -9 "$P2" 2>/dev/null; wait "$P2" 2>/dev/null
tail -n 60 "$LOG2" 2>/dev/null
case "$RC" in
  0) echo "✓ Kurulan sistem diskten açıldı." ;;
  2) echo "::error::Kurulan sistem açılamadı."; exit 1 ;;
  3) echo "::error::Kurulan sistem sanal makinesi sonlandı."; exit 1 ;;
  *) echo "::error::Kurulan sistem 900s içinde hazır sinyali vermedi."; exit 1 ;;
esac

echo "Kalıcı kurulum zinciri baştan sona doğrulandı."
