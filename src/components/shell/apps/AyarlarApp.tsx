/**
 * AYARLAR UYGULAMASI
 * ------------------------------------------------------------------
 * Eski /giris, /kayit, /izinler, /guvenlik ve görünüm sayfalarının tek
 * pencerede birleşmiş hâli. URL değişmez; tüm bölümler sekmedir.
 */

import { useState } from "react";

import { WindowShell } from "@/components/shell/WindowShell";
import { SecurityPanel } from "@/components/shell/SecurityPanel";
import { NodeSettingsPanel } from "@/components/shell/NodeSettingsPanel";
import { WallpaperSettingsApp } from "@/components/shell/apps/WallpaperSettingsApp";
import { AuthPanel } from "@/components/shell/apps/AuthPanel";
import { useDeviceScopeLabel } from "@/hooks/use-device-label";
import { SHELL_SHORTCUTS } from "@/lib/shell/shortcuts";

type TabId = "sistem" | "guvenlik" | "gorunum" | "hesap" | "gizlilik" | "kisayol";

const TABS: { id: TabId; label: string }[] = [
  { id: "sistem", label: "Sistem" },
  { id: "guvenlik", label: "Güvenlik" },
  { id: "gorunum", label: "Görünüm" },
  { id: "hesap", label: "Hesap" },
  { id: "gizlilik", label: "Gizlilik" },
  { id: "kisayol", label: "Kısayollar" },
];

export function AyarlarApp() {
  const [tab, setTab] = useState<TabId>("sistem");
  const device = useDeviceScopeLabel();

  return (
    <WindowShell title="Ayarlar" subtitle={device} padded={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--tb-border)] px-3 py-2"
          aria-label="Ayarlar bölümleri"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              className={`min-h-12 shrink-0 rounded-xl px-4 font-osmono text-[12px] ${
                tab === t.id
                  ? "bg-[var(--tb-accent)] text-[var(--tb-bg)]"
                  : "border border-[var(--tb-border)] text-[var(--tb-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24">
          {tab === "sistem" && <NodeSettingsPanel />}
          {tab === "guvenlik" && <SecurityPanel />}
          {tab === "gorunum" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <WallpaperSettingsApp />
            </div>
          )}
          {tab === "hesap" && <AuthPanel />}
          {tab === "gizlilik" && <PrivacyTab />}
          {tab === "kisayol" && <ShortcutsTab />}
        </div>
      </div>
    </WindowShell>
  );
}

const LEGAL_DOCS = [
  { href: "/gizlilik", label: "Gizlilik Bildirimi", hint: "KVKK / GDPR veri işleme esasları" },
  { href: "/kosullar", label: "Kullanım Koşulları", hint: "Hizmet ve lisans şartları" },
  { href: "/iade", label: "İade ve Cayma", hint: "Abonelik iptali ve iade" },
  { href: "/ihracat-uyum", label: "İhracat Uyumu", hint: "Kullanım ve ülke sınırları" },
  { href: "/yasal", label: "Yasal Bilgiler", hint: "Satıcı ve kurumsal künye" },
];

function PrivacyTab() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[var(--tb-muted)]">
        Tedbirge sıfır-bilgi ilkesiyle çalışır: mesaj içeriği hiçbir sunucuda saklanmaz, yalnızca
        cihazınızda kalır. Aşağıdaki belgeler yasal zorunluluk gereği ayrı adreslerde de yayınlanır.
      </p>
      <ul className="space-y-2">
        {LEGAL_DOCS.map((d) => (
          <li key={d.href}>
            <a
              href={d.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--tb-border)] px-4 text-[13px] text-[var(--tb-text)]"
            >
              <span>
                {d.label}
                <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
                  {d.hint}
                </span>
              </span>
              <span aria-hidden className="font-osmono text-[11px] text-[var(--tb-muted)]">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Klavye kısayolları: tek kaynaktan (shortcuts.ts) listelenir. */
function ShortcutsTab() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--tb-text)]">Klavye kısayolları</h2>
      <p className="text-[13px] leading-5 text-[var(--tb-muted)]">
        Deneyimli kullanıcılar için hızlandırıcılar. Super tuşu Windows klavyelerinde ⊞, Mac
        klavyelerinde ⌘ tuşudur.
      </p>
      <ul className="divide-y divide-[var(--tb-border)] rounded-xl border border-[var(--tb-border)]">
        {SHELL_SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
            <span className="text-[13px] text-[var(--tb-text)]">{s.label}</span>
            <kbd className="shrink-0 rounded-md border border-[var(--tb-border)] px-2 py-1 font-osmono text-[11px] text-[var(--tb-muted)]">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </section>
  );
}
