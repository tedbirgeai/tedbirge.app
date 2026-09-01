/**
 * SİSTEM BİLDİRİMLERİ
 * ------------------------------------------------------------------
 * İşletim sistemi olayları için tek kart üretici. Tüm kabuk bileşenleri
 * `sonner`'ı doğrudan çağırmak yerine buradan geçer; böylece dil ve
 * görünüm tek yerden yönetilir. Her kart ayrıca bildirim merkezine
 * (üst bardaki zil) düşer.
 */

import { toast } from "sonner";

import { pushNotice } from "@/lib/shell/notifications";

export function notify(title: string, detail?: string) {
  toast(title, detail ? { description: detail } : undefined);
  pushNotice("info", title, detail);
}

export function notifyOk(title: string, detail?: string) {
  toast.success(title, detail ? { description: detail } : undefined);
  pushNotice("ok", title, detail);
}

export function notifyError(title: string, detail?: string) {
  toast.error(title, detail ? { description: detail } : undefined);
  pushNotice("error", title, detail);
}
