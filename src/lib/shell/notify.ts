/**
 * SİSTEM BİLDİRİMLERİ
 * ------------------------------------------------------------------
 * İşletim sistemi olayları için tek kart üretici. Tüm kabuk bileşenleri
 * `sonner`'ı doğrudan çağırmak yerine buradan geçer; böylece dil ve
 * görünüm tek yerden yönetilir.
 */

import { toast } from "sonner";

export function notify(title: string, detail?: string) {
  toast(title, detail ? { description: detail } : undefined);
}

export function notifyOk(title: string, detail?: string) {
  toast.success(title, detail ? { description: detail } : undefined);
}

export function notifyError(title: string, detail?: string) {
  toast.error(title, detail ? { description: detail } : undefined);
}
