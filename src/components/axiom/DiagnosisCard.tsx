/**
 * TEŞHİS & TEDAVİ RAPOR KARTI
 * Sohbet akışında ve stüdyoda beliren cam/akrilik gölgeli rapor kartı.
 * Renkler yalnız --tb-* tasarım token'larından okunur.
 */

import { Activity, Pill, Search, Sparkles } from "lucide-react";

import type { DiagnosisReport } from "@/lib/studio/diagnosis";

function Row({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={{ background: "var(--tb-panel-soft)", color: "var(--tb-accent)" }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tb-muted)" }}>
          {title}
        </div>
        <div className="text-[13px] leading-relaxed" style={{ color: "var(--tb-text)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DiagnosisCard({ report }: { report: DiagnosisReport }) {
  const h = report.systemHealth;
  return (
    <article
      className="animate-fade-in rounded-2xl p-3.5 backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--tb-panel) 78%, transparent)",
        border: "1px solid var(--tb-border)",
        boxShadow: "0 18px 40px -24px color-mix(in srgb, var(--tb-accent) 40%, transparent)",
      }}
      aria-label="Teşhis ve tedavi raporu"
    >
      <header className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" style={{ color: "var(--tb-accent)" }} aria-hidden />
        <span className="text-[13px] font-semibold">{report.mode}</span>
        <span className="ml-auto text-[11px]" style={{ color: "var(--tb-muted)" }}>
          {new Date(report.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      <p className="mb-3 text-[14px] leading-relaxed" style={{ color: "var(--tb-text)" }}>
        {report.verbalResponse}
      </p>

      <div className="space-y-2.5">
        <Row icon={<Search className="h-3.5 w-3.5" />} title="Teşhis">
          {report.diagnosis}
        </Row>
        <Row icon={<Pill className="h-3.5 w-3.5" />} title="Tedavi">
          {report.treatment}
        </Row>
        <Row icon={<Sparkles className="h-3.5 w-3.5" />} title="Sistem sağlığı">
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[
              `Hakikat motoru: ${h.truthEngine}`,
              `Bağlı cihaz: ${h.peers}`,
              h.memoryShield,
              h.stability,
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ background: "var(--tb-panel-soft)", color: "var(--tb-muted)" }}
              >
                {chip}
              </span>
            ))}
          </div>
        </Row>
      </div>
    </article>
  );
}

export default DiagnosisCard;
