#!/bin/sh
# Tedbirge(R) WebOS — okunabilir kurtarma ekrani uretir.
# Masaustu iki kademede de cizilemezse kullanici siyah/beyaz bos ekran yerine
# Turkce tani ekrani gorur.
set -u
HEDEF=/var/www/tedbirge/kurtarma.html
mkdir -p /var/www/tedbirge /var/log/tedbirge

EKRAN=$(cat /run/tedbirge-ekran 2>/dev/null || echo "bilinmiyor")
CEKIRDEK=$(uname -r 2>/dev/null || echo "?")
KOK=$(findmnt -n -o SOURCE / 2>/dev/null || echo "?")
GPU=$([ -e /dev/dri/renderD128 ] && echo "var" || echo "yok")
WEB=$(curl -fsS -o /dev/null --max-time 3 http://127.0.0.1/ 2>/dev/null && echo "yanit veriyor" || echo "yanit vermiyor")
SON=$(tail -n 25 /var/log/tedbirge/kiosk.log 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g')

cat > "$HEDEF" <<EOF
<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tedbirge® WebOS — Kurtarma</title>
<style>
 body{margin:0;background:#0b1220;color:#e8eef8;font:16px/1.6 system-ui,sans-serif;padding:32px}
 h1{font-size:24px;margin:0 0 8px} h2{font-size:17px;margin:24px 0 8px;color:#8fd4ff}
 .k{display:grid;grid-template-columns:200px 1fr;gap:6px 16px;max-width:820px}
 .k div:nth-child(odd){color:#9fb3cd}
 pre{background:#0f1a2b;border:1px solid #1d2c45;border-radius:10px;padding:12px;overflow:auto;max-height:38vh;font-size:13px}
 ol{max-width:820px}
</style></head><body>
<h1>Tedbirge® WebOS — Kurtarma Ekrani</h1>
<p>Sistem acildi, ancak masaustu cizilemedi. Asagidaki bilgi sorunun kaynagini gosterir.</p>
<h2>Sistem durumu</h2>
<div class="k">
 <div>Cekirdek</div><div>$CEKIRDEK</div>
 <div>Kok bolum</div><div>$KOK</div>
 <div>Ekran</div><div>$EKRAN</div>
 <div>Donanim ekran surucusu</div><div>$GPU</div>
 <div>Yerel web sunucusu</div><div>$WEB</div>
</div>
<h2>Ne yapmalisiniz?</h2>
<ol>
 <li>Bilgisayari yeniden baslatin ve acilis menusunden <b>Guvenli goruntu (nomodeset)</b> secin.</li>
 <li>Sorun surerse <b>Metin / kurtarma kipi</b> ile acip <code>/var/log/tedbirge/</code> kayitlarini alin.</li>
 <li>Ikinci bir ekran/kablo bagli ise cikarip tek ekranla deneyin.</li>
</ol>
<h2>Son kayitlar</h2>
<pre>$SON</pre>
</body></html>
EOF
exit 0
