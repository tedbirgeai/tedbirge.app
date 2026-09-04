/**
 * PORTAL BAŞLANGIÇ VERİSİ
 * ------------------------------------------------------------------
 * İlk açılışta cihaza yazılan gerçekçi örnek kayıtlar. Kullanıcı bir
 * kez düzenleme yaptığında kendi verisi geçerlidir; "Varsayılana dön"
 * bu listeyi yeniden yazar.
 */

import type { PortalLog, PortalNode, PortalUser } from "@/lib/portal/types";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function seedNodes(now = Date.now()): PortalNode[] {
  return [
    {
      id: "nd-sakarya-01",
      label: "Sakarya Saha Düğümü",
      region: "Sakarya / Adapazarı",
      status: "cevrimici",
      cpu: 34,
      memory: 51,
      latency: 28,
      quality: 94,
      lastSeen: now - 42_000,
    },
    {
      id: "nd-istanbul-01",
      label: "İstanbul Merkez Röle",
      region: "İstanbul / Kadıköy",
      status: "cevrimici",
      cpu: 61,
      memory: 68,
      latency: 19,
      quality: 97,
      lastSeen: now - 12_000,
    },
    {
      id: "nd-ankara-02",
      label: "Ankara Yedek Geçit",
      region: "Ankara / Çankaya",
      status: "bekleme",
      cpu: 12,
      memory: 33,
      latency: 44,
      quality: 81,
      lastSeen: now - 6 * 60_000,
    },
    {
      id: "nd-izmir-03",
      label: "İzmir Kıyı Düğümü",
      region: "İzmir / Karşıyaka",
      status: "cevrimici",
      cpu: 47,
      memory: 44,
      latency: 33,
      quality: 89,
      lastSeen: now - 90_000,
    },
    {
      id: "nd-van-01",
      label: "Van Off-Grid Düğümü",
      region: "Van / Erciş",
      status: "cevrimdisi",
      cpu: 0,
      memory: 0,
      latency: 0,
      quality: 0,
      lastSeen: now - 3 * HOUR,
    },
    {
      id: "nd-mobil-07",
      label: "Mobil Ekip Düğümü 07",
      region: "Gezici / Saha",
      status: "bekleme",
      cpu: 22,
      memory: 39,
      latency: 76,
      quality: 63,
      lastSeen: now - 18 * 60_000,
    },
  ];
}

export function seedUsers(now = Date.now()): PortalUser[] {
  return [
    {
      id: "us-0001",
      name: "Mehmet Dinç",
      email: "mehmet@tedbirge.app",
      role: "yonetici",
      plan: "enterprise",
      status: "etkin",
      licenseUntil: now + 320 * DAY,
      createdAt: now - 420 * DAY,
    },
    {
      id: "us-0002",
      name: "Elif Karaca",
      email: "elif.karaca@tedbirge.app",
      role: "operator",
      plan: "pro",
      status: "etkin",
      licenseUntil: now + 210 * DAY,
      createdAt: now - 300 * DAY,
    },
    {
      id: "us-0003",
      name: "Burak Yılmaz",
      email: "burak.yilmaz@tedbirge.app",
      role: "operator",
      plan: "pro",
      status: "askida",
      licenseUntil: now - 5 * DAY,
      createdAt: now - 260 * DAY,
    },
    {
      id: "us-0004",
      name: "Zeynep Aydın",
      email: "zeynep.aydin@tedbirge.app",
      role: "gozlemci",
      plan: "community",
      status: "etkin",
      licenseUntil: now + 40 * DAY,
      createdAt: now - 150 * DAY,
    },
    {
      id: "us-0005",
      name: "Cem Toprak",
      email: "cem.toprak@tedbirge.app",
      role: "gozlemci",
      plan: "community",
      status: "davetli",
      licenseUntil: now + 90 * DAY,
      createdAt: now - 9 * DAY,
    },
    {
      id: "us-0006",
      name: "Sema Görgülü",
      email: "sema.gorgulu@tedbirge.app",
      role: "operator",
      plan: "enterprise",
      status: "etkin",
      licenseUntil: now + 175 * DAY,
      createdAt: now - 88 * DAY,
    },
    {
      id: "us-0007",
      name: "Onur Bal",
      email: "onur.bal@tedbirge.app",
      role: "gozlemci",
      plan: "pro",
      status: "etkin",
      licenseUntil: now + 12 * DAY,
      createdAt: now - 64 * DAY,
    },
    {
      id: "us-0008",
      name: "Hatice Demir",
      email: "hatice.demir@tedbirge.app",
      role: "operator",
      plan: "community",
      status: "askida",
      licenseUntil: now - 30 * DAY,
      createdAt: now - 200 * DAY,
    },
  ];
}

export function seedLogs(now = Date.now()): PortalLog[] {
  const rows: Array<[number, PortalLog["level"], string, string]> = [
    [2 * 60_000, "bilgi", "ag", "İstanbul Merkez Röle üzerinden 128 paket aktarıldı."],
    [9 * 60_000, "uyari", "ag", "Mobil Ekip Düğümü 07 gecikmesi 76 ms üzerine çıktı."],
    [26 * 60_000, "bilgi", "lisans", "Sema Görgülü için Enterprise lisansı yenilendi."],
    [48 * 60_000, "hata", "ag", "Van Off-Grid Düğümü bağlantısı koptu."],
    [70 * 60_000, "bilgi", "sistem", "Yerel depolama bütünlük denetimi tamamlandı."],
    [2 * HOUR, "uyari", "lisans", "Burak Yılmaz lisansı süresi doldu, hesap askıya alındı."],
    [3 * HOUR, "bilgi", "kullanici", "Cem Toprak davet edildi."],
    [5 * HOUR, "bilgi", "ag", "Ankara Yedek Geçit beklemeye alındı."],
    [8 * HOUR, "uyari", "sistem", "Bellek kullanımı %70 eşiğini aştı."],
    [14 * HOUR, "bilgi", "sistem", "Günlük kayıt döngüsü çalıştırıldı."],
    [26 * HOUR, "hata", "sistem", "Yedek geçide otomatik devretme denendi."],
    [2 * DAY, "bilgi", "kullanici", "Zeynep Aydın rolü Gözlemci olarak güncellendi."],
  ];
  return rows.map(([ago, level, source, message], i) => ({
    id: `lg-${String(i + 1).padStart(4, "0")}`,
    at: now - ago,
    level,
    source,
    message,
  }));
}
