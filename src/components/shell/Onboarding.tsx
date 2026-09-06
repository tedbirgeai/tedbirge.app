/**
 * İLK AÇILIŞ REHBERİ (Nielsen #10 — Yardım ve Dokümantasyon)
 * ------------------------------------------------------------------
 * Üç adımlık kısa tanıtım: dokunma hareketleri, alt çubuk ve klavye
 * kısayolları. Yalnızca ilk açılışta gösterilir, Ayarlar'dan yeniden
 * açılabilir (`tedbirge:show-tour` olayı).
 */

import { useEffect, useState } from "react";

const TOUR_KEY = "tbos.tour.done";

const STEPS = [
  {
    title: "Uygulamaları açın",
    body: "Ana ekranda simgeye dokunun. Bilgisayarda çift tıklayın. Sağa sola kaydırarak diğer sayfaları görün.",
  },
  {
    title: "Alt çubuk her zaman yanınızda",
    body: "Sol alttaki ev düğmesi tüm açık pencereleri toplar. Yanındaki üç uygulamayı basılı tutup sürükleyerek değiştirebilirsiniz.",
  },
  {
    title: "Hızlı erişim",
    body: "Bilgisayarda Ctrl + K ile arama açılır, Ctrl + Z son işlemi geri alır. Telefonda ekranın üstünden aşağı çekince hızlı ayarlar gelir.",
  },
];

export function Onboarding() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY) !== "1") setStep(0);
    } catch {
      /* depolama kapalı olabilir */
    }
    const show = () => setStep(0);
    window.addEventListener("tedbirge:show-tour", show);
    return () => window.removeEventListener("tedbirge:show-tour", show);
  }, []);

  if (step === null) return null;
  const current = STEPS[step];
  if (!current) return null;

  const finish = () => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* yoksay */
    }
    setStep(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tanıtım"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div className="tbos-glass-card w-full max-w-sm rounded-2xl p-5">
        <p className="font-osmono text-[11px] tracking-wide text-[var(--tb-muted)] uppercase">
          {step + 1} / {STEPS.length}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--tb-text)]">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--tb-muted)]">{current.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="wa-press min-h-12 rounded-xl px-3 font-osmono text-[12px] text-[var(--tb-muted)]"
          >
            Geç
          </button>
          <button
            type="button"
            onClick={() => (step + 1 < STEPS.length ? setStep(step + 1) : finish())}
            className="wa-press min-h-12 rounded-xl bg-[var(--tb-accent)] px-5 text-[14px] font-semibold text-[var(--tb-bg)]"
          >
            {step + 1 < STEPS.length ? "Devam" : "Başla"}
          </button>
        </div>
      </div>
    </div>
  );
}
