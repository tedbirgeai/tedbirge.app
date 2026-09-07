#!/usr/bin/env python3
"""Paket listelerini Debian depolarına karşı doğrular.

Yanlış yazılmış ya da yanlış depoya işaret eden tek bir paket, saatler süren
imaj derlemesinin ortasında "Unable to locate package" ile çöker. Bu denetim
aynı hatayı saniyeler içinde ve paket adını söyleyerek yakalar.

Kullanım: verify-packages.py <liste dosyası> [<liste dosyası> ...]
Satır biçimi: "paket" veya "paket/depo" (ör. linux-image-amd64/bookworm-backports)
"""

from __future__ import annotations

import lzma
import sys
import urllib.request

SUITES = ["bookworm", "bookworm-backports"]
AREAS = ["main", "contrib", "non-free", "non-free-firmware"]


def depo_dizini() -> dict[str, set[str]]:
    index: dict[str, set[str]] = {}
    for suite in SUITES:
        for area in AREAS:
            url = (
                f"http://deb.debian.org/debian/dists/{suite}/{area}"
                "/binary-amd64/Packages.xz"
            )
            try:
                raw = urllib.request.urlopen(url, timeout=120).read()
            except Exception as exc:  # ağ hatası denetimi engellememeli
                print(f"-- uyarı: {suite}/{area} dizini okunamadı ({exc})")
                continue
            for line in lzma.decompress(raw).decode("utf8", "replace").split("\n"):
                if line.startswith("Package: "):
                    index.setdefault(line[9:].strip(), set()).add(suite)
    return index


def main(yollar: list[str]) -> int:
    index = depo_dizini()
    if not index:
        print("-- uyarı: depo dizinleri okunamadı, ön denetim atlandı")
        return 0

    sorunlar: list[str] = []
    for path in yollar:
        with open(path, encoding="utf8") as dosya:
            for satir in dosya:
                satir = satir.split("#")[0].strip()
                if not satir:
                    continue
                ad, _, depo = satir.partition("/")
                yerler = index.get(ad)
                if not yerler:
                    sorunlar.append(f"{path}: '{ad}' hiçbir depoda yok")
                elif depo and depo not in yerler:
                    sorunlar.append(
                        f"{path}: '{ad}' '{depo}' deposunda yok "
                        f"(var: {', '.join(sorted(yerler))})"
                    )
    for sorun in sorunlar:
        print(f"! {sorun}")
    if sorunlar:
        return 1
    print("✓ Tüm paketler Debian depolarında bulundu.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
