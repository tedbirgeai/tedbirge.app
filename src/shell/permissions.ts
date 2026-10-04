/**
 * YETKİ KAYDI (Permissions)
 * ------------------------------------------------------------------
 * Faz C: kullanıcı bir uygulamaya hangi yetenekleri verdiğini kendisi
 * onaylar. Onay cihazda saklanır; bulut kopyası yoktur (sıfır-bilgi).
 * Yerleşik uygulamalar kayıtlı manifestolarıyla gelir, dışarıdan
 * yüklenen (.tbapp) uygulamalar yalnız onaylanan yeteneklerle çalışır.
 */

import type { Capability } from "@/kernel/capabilities";

const KEY = "tedbirge.shell.permissions";

type Store = Record<string, Capability[]>;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(s: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

/** Uygulamaya daha önce verilmiş yetenekler. */
export function grantedCapabilities(appId: string): Capability[] {
  return read()[appId] ?? [];
}

/** Kullanıcı onayını kaydeder (yalnız istenen yeteneklerin alt kümesi). */
export function grantCapabilities(appId: string, caps: readonly Capability[]) {
  const s = read();
  s[appId] = [...new Set(caps)];
  write(s);
}

/** Onayı tamamen geri alır — uygulama bir sonraki açılışta yeniden sorar. */
export function revokeCapabilities(appId: string) {
  const s = read();
  delete s[appId];
  write(s);
}

/** İstenen yeteneklerin tamamı onaylı mı? */
export function hasAllCapabilities(appId: string, caps: readonly Capability[]) {
  const g = grantedCapabilities(appId);
  return caps.every((c) => g.includes(c));
}

/** Arayüzde gösterilecek sade Türkçe açıklamalar (jargon yok). */
export const CAPABILITY_LABELS: Record<Capability, { title: string; detail: string }> = {
  "mesh.send": {
    title: "Mesaj gönderme",
    detail: "Uygulama sizin adınıza uçtan uca şifreli paket gönderebilir.",
  },
  "mesh.receive": {
    title: "Mesaj alma",
    detail: "Uygulama size gelen paketleri okuyabilir.",
  },
  "mesh.route": {
    title: "Ağ komşularını görme",
    detail: "Yakındaki doğrulanmış düğümleri ve yolu sorgulayabilir.",
  },
  "identity.read": {
    title: "Kimlik özeti",
    detail: "Yalnız görünen kimliğinizi okur; gizli anahtarınız asla verilmez.",
  },
  "status.read": {
    title: "Bağlantı durumu",
    detail: "Çevrimiçi/çevrimdışı durumunu ve kuyruk sayısını okur.",
  },
  "files.read": {
    title: "Kendi dosyalarını okuma",
    detail: "Yalnız uygulamanın kendi alanındaki dosyaları okur; diğer alanlar kapalıdır.",
  },
  "files.write": {
    title: "Kendi alanına kaydetme",
    detail: "Uygulama kendi alanına dosya kaydedebilir; sistem alanına yazamaz.",
  },
  "files.delete": {
    title: "Kendi dosyalarını silme",
    detail: "Uygulama yalnız kendi kaydettiği dosyaları silebilir.",
  },
  "status.write": { title: "Durum değiştirme", detail: "Uygulama cihaz durumunu güncelleyebilir." },
  "fs.read": { title: "Dosya okuma", detail: "Uygulama izin verilen dosyaları okuyabilir." },
  "fs.write": { title: "Dosya yazma", detail: "Uygulama izin verilen yerlere dosya yazabilir." },
  "vfs.appdata": { title: "Uygulama verisi", detail: "Uygulama kendi veri alanında ayarlarını saklayabilir." },
  "limen.p2p.sync": { title: "Cihazlar arası eşitleme", detail: "Uygulama verisini bağlı cihazlarınızla eşitleyebilir." },
  "compiler.wasm": { title: "Çekirdek derleme", detail: "Uygulama hızlı çalışan çekirdek modülleri derleyebilir." },
  "compiler.ui": { title: "Arayüz derleme", detail: "Uygulama kendi ekranlarını hazırlayabilir." },
};
