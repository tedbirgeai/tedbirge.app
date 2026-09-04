/**
 * SİSTEM YÖNETİM PORTALI — VERİ TİPLERİ
 * ------------------------------------------------------------------
 * Portal tamamen cihazda çalışır: bu tipler yalnızca yerel depolamada
 * (IndexedDB) tutulan kayıtları tanımlar, hiçbir sunucuya gönderilmez.
 */

export type NodeStatus = "cevrimici" | "bekleme" | "cevrimdisi";

export type PortalNode = {
  id: string;
  label: string;
  region: string;
  status: NodeStatus;
  /** İşlemci yükü (%) */
  cpu: number;
  /** Bellek kullanımı (%) */
  memory: number;
  /** Gecikme (ms) */
  latency: number;
  /** Bağlantı kalitesi (%) */
  quality: number;
  lastSeen: number;
};

export type UserRole = "yonetici" | "operator" | "gozlemci";
export type LicensePlan = "community" | "pro" | "enterprise";
export type UserStatus = "etkin" | "askida" | "davetli";

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: LicensePlan;
  status: UserStatus;
  /** Lisans bitiş zamanı (ms) */
  licenseUntil: number;
  createdAt: number;
};

export type LogLevel = "bilgi" | "uyari" | "hata";

export type PortalLog = {
  id: string;
  at: number;
  level: LogLevel;
  source: string;
  message: string;
};

export type MetricSample = {
  at: number;
  cpu: number;
  memory: number;
  quality: number;
};

export const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  cevrimici: "Çevrimiçi",
  bekleme: "Beklemede",
  cevrimdisi: "Çevrimdışı",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  yonetici: "Yönetici",
  operator: "Operatör",
  gozlemci: "Gözlemci",
};

export const PLAN_LABEL: Record<LicensePlan, string> = {
  community: "Community",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  etkin: "Etkin",
  askida: "Askıda",
  davetli: "Davetli",
};

export const LOG_LEVEL_LABEL: Record<LogLevel, string> = {
  bilgi: "Bilgi",
  uyari: "Uyarı",
  hata: "Hata",
};
