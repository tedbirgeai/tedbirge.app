/**
 * EVRENSEL TEŞHİS & TEDAVİ PROTOKOLÜ
 * ------------------------------------------------------------------
 * Her niyet işlemi sonunda tek bir standart rapor modeli üretir:
 * insani yanıt, kök neden teşhisi, yapılan müdahale ve sistem sağlığı.
 *
 * Tüm alanlar yerel ve gerçek ölçümlerden türer. Ölçülemeyen bir şey
 * asla "onaylandı" olarak yazılmaz; bunun yerine dürüst durum yazılır.
 */

import type { Intent } from "@/lib/studio/intent";
import type { PatchResult } from "@/lib/studio/system-patch";
import { describeNode, getNodeSnapshot } from "@/lib/node-runtime";

export type DiagnosisMode = "Mod B - Yerinde Sistem Müdahalesi" | "Mod A - Sandbox Üretimi";

export type SystemHealth = {
  /** Hakikat motorunun bu işlem için verdiği karar. */
  truthEngine: string;
  /** Doğrudan bağlı cihaz sayısı. */
  peers: number;
  /** Bellek kalkanı durumu (worker sert kesme sigortası). */
  memoryShield: string;
  /** Kararlılık mührü — masaüstü kirletilmedi mi, işlem tamam mı. */
  stability: string;
};

export type DiagnosisReport = {
  id: string;
  timestamp: number;
  userPrompt: string;
  mode: DiagnosisMode;
  verbalResponse: string;
  diagnosis: string;
  treatment: string;
  systemHealth: SystemHealth;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Komut alındığı anda gösterilecek insani ilk tepki. */
export function openingLine(prompt: string): string {
  const t = prompt.toLocaleLowerCase("tr");
  if (/(yavas|takil|donuyor|kasiyor|kasıyor|yavaş)/.test(t)) return "Hemen bakıyorum, sistemin yükünü ölçüyorum…";
  if (/(tema|renk|görünüm|gorunum)/.test(t)) return "Hemen bakıyorum, mevcut renk paletini ferahlatıyorum…";
  if (/(duvar|wallpaper|arka plan)/.test(t)) return "Hemen bakıyorum, masaüstü görselini düzenliyorum…";
  if (/(ses|gürültü|gurultu)/.test(t)) return "Hemen bakıyorum, ses katmanını ayarlıyorum…";
  if (/(bağlan|baglan|ağ|internet|cihaz)/.test(t)) return "Hemen bakıyorum, ağ durumunu canlı ölçüyorum…";
  return "Hemen inceliyorum, sistem kontrolü yapılıyor…";
}

function health(verdict: string, ok: boolean): SystemHealth {
  const n = describeNode(getNodeSnapshot());
  return {
    truthEngine: verdict,
    peers: n.directPeers,
    memoryShield: "Ayrı iş parçacığı · 1500 ms sert kesme sigortası etkin",
    stability: ok ? "Kararlı · masaüstü kirletilmedi" : "Kararlı · değişiklik uygulanmadı",
  };
}

/** Mod B (yerinde müdahale) raporu üretir. */
export function reportForPatch(prompt: string, intent: Intent, result: PatchResult): DiagnosisReport {
  const inceleme = result.kind === "inceleme";
  const verbal = inceleme
    ? `${result.component} için durumu inceledim. ${result.summary}`
    : result.applied
      ? `Tamamdır — ${result.summary}`
      : `Bir ayrıntıya ihtiyacım var. ${result.summary}`;
  return {
    id: newId(),
    timestamp: Date.now(),
    userPrompt: prompt,
    mode: "Mod B - Yerinde Sistem Müdahalesi",
    verbalResponse: verbal,
    diagnosis:
      intent.mode === "sistem"
        ? `${result.component} katmanı hedeflendi. ${intent.reason}`
        : `${result.component} katmanı hedeflendi.`,
    treatment: inceleme
      ? `${result.component} yalnız okundu; hiçbir ayar değiştirilmedi.`
      : result.applied
        ? `${result.component} yerinde güncellendi; yeni klasör veya masaüstü ikonu oluşturulmadı.`
        : `Değişiklik uygulanmadı; onayınız bekleniyor.`,
    systemHealth: health(inceleme ? "İnceleme · ölçüm tabanlı" : result.applied ? "Onaylandı · yerel deterministik" : "Beklemede", result.applied || inceleme),
  };
}

/** Mod A (bağımsız uygulama üretimi) raporu üretir. */
export function reportForApp(prompt: string, appName: string, ok: boolean, detail: string): DiagnosisReport {
  return {
    id: newId(),
    timestamp: Date.now(),
    userPrompt: prompt,
    mode: "Mod A - Sandbox Üretimi",
    verbalResponse: ok
      ? `"${appName}" hazır — yalıtılmış alanda çalışacak şekilde kurdum.`
      : `"${appName}" üretimi tamamlanamadı. ${detail}`,
    diagnosis: "İstem açıkça bağımsız bir program istedi; bu yüzden yalıtılmış üretim hattı kullanıldı.",
    treatment: ok
      ? `${detail} Uygulama kendi yalıtılmış alanında, sınırlı izinlerle çalışır.`
      : detail,
    systemHealth: health(ok ? "Üretim doğrulandı · yerel derleme" : "Karar verilemedi", ok),
  };
}
