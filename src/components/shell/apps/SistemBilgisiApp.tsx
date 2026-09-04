/**
 * SİSTEM BİLGİSİ UYGULAMASI
 * ------------------------------------------------------------------
 * Kurumsal künye, sürüm, protokol katmanları, enerji ve mevzuat
 * içeriklerinin tek pencerede toplandığı bilgi uygulaması. Eski
 * /kurumsal, /protokol, /mevzuat, /enerji, /dokumanlar rotalarının
 * yerini alır.
 */

import { useCallback, useEffect, useState } from "react";

import { WindowShell } from "@/components/shell/WindowShell";
import { OS_LAYERS, RAAS_TIERS } from "@/lib/os-layers";
import { readRuntimeLog, clearRuntimeLog, type RuntimeLogEntry } from "@/lib/error-reporting";
import { BUILD_ID } from "@/lib/build-id";
import { SITE_URL } from "@/lib/site";
import { PanelEnergy } from "@/components/site/PanelEnergy";
import { openPath } from "@/components/shell/OsLink";

type TabId = "kurumsal" | "katmanlar" | "paketler" | "enerji" | "kayitlar" | "yasal";

const TABS: { id: TabId; label: string }[] = [
  { id: "kurumsal", label: "Kurumsal" },
  { id: "katmanlar", label: "Mimari Katmanlar" },
  { id: "paketler", label: "Paketler" },
  { id: "enerji", label: "Enerji" },
  { id: "kayitlar", label: "Kayıtlar" },
  { id: "yasal", label: "Yasal" },
];

const LEGAL_DOCS = [
  { href: "/gizlilik", label: "Gizlilik Bildirimi" },
  { href: "/kosullar", label: "Kullanım Koşulları" },
  { href: "/iade", label: "İade ve Cayma Hakkı" },
  { href: "/ihracat-uyum", label: "İhracat Uyumu" },
  { href: "/yasal", label: "Yasal Bilgiler" },
];

export function SistemBilgisiApp() {
  const [tab, setTab] = useState<TabId>("kurumsal");

  return (
    <WindowShell title="Sistem Bilgisi" subtitle="Tedbirge® WebOS" padded={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--tb-border)] px-3 py-2"
          aria-label="Sistem bilgisi bölümleri"
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
          {tab === "kurumsal" && <CorporateTab />}
          {tab === "katmanlar" && <LayersTab />}
          {tab === "paketler" && <TiersTab />}
          {tab === "enerji" && <PanelEnergy />}
          {tab === "kayitlar" && <LogsTab />}
          {tab === "yasal" && <LegalTab />}
        </div>
      </div>
    </WindowShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--tb-border)] py-2 text-[13px]">
      <span className="text-[var(--tb-muted)]">{k}</span>
      <span className="font-osmono text-[12px] text-[var(--tb-text)]">{v}</span>
    </div>
  );
}

function CorporateTab() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[var(--tb-muted)]">
        Tedbirge® WebOS; taşıyıcı-bağımsız, sıfır-bilgi ilkesine dayanan bir ağ işletim sistemidir.
        İnternet kesildiğinde de cihazlar arasında doğrudan haberleşme sürer.
      </p>
      <div>
        <Row k="Ürün" v="Tedbirge® WebOS" />
        <Row k="Satıcı" v="Mehmet DİNÇ (Tedbirge® WebOS)" />
        <Row k="Sürüm" v={BUILD_ID} />
        <Row k="Adres" v={SITE_URL} />
        <Row k="İletişim" v="tedbirge34@gmail.com" />
      </div>
    </div>
  );
}

function LayersTab() {
  return (
    <ul className="space-y-3">
      {OS_LAYERS.map((l) => (
        <li key={l.n} className="rounded-2xl border border-[var(--tb-border)] p-4">
          <p className="font-osmono text-[11px] uppercase tracking-[0.2em] text-[var(--tb-muted)]">
            Katman {l.n}
          </p>
          <h3 className="mt-1 text-[14px] font-semibold text-[var(--tb-text)]">{l.name}</h3>
          <p className="mt-1 text-[12px] text-[var(--tb-muted)]">{l.tagline}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--tb-text)]">{l.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {l.badges.map((b) => (
              <span
                key={b}
                className="rounded-full border border-[var(--tb-border)] px-3 py-1 font-osmono text-[11px] text-[var(--tb-muted)]"
              >
                {b}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openPath(l.action.to)}
            className="mt-3 min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-[12px] text-[var(--tb-text)]"
          >
            {l.action.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function LogsTab() {
  const [rows, setRows] = useState<RuntimeLogEntry[]>([]);

  const yenile = useCallback(() => setRows(readRuntimeLog()), []);
  useEffect(yenile, [yenile]);

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-[var(--tb-muted)]">
        Bu cihazda oluşan son sistem hataları burada tutulur. Diske kurulu sürümde aynı kayıtlar
        <span className="font-osmono"> /var/log/tedbirge/ </span>
        klasörüne de yazılır ve günlük olarak arşivlenir.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={yenile}
          className="min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-[12px] text-[var(--tb-text)]"
        >
          Yenile
        </button>
        <button
          type="button"
          onClick={() => {
            clearRuntimeLog();
            yenile();
          }}
          className="min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-[12px] text-[var(--tb-muted)]"
        >
          Kayıtları temizle
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--tb-border)] p-4 text-[13px] text-[var(--tb-muted)]">
          Kayıt yok — sistem sorunsuz çalışıyor.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={`${r.at}-${i}`}
              className="rounded-2xl border border-[var(--tb-border)] p-3 text-[12px]"
            >
              <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
                {new Date(r.at).toLocaleString("tr-TR")}
                {r.where ? ` · ${r.where}` : ""}
              </p>
              <p className="mt-1 break-words text-[13px] text-[var(--tb-text)]">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TiersTab() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {RAAS_TIERS.map((t) => (
        <li key={t.key} className="rounded-2xl border border-[var(--tb-border)] p-4">
          <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">{t.name}</h3>
          <p className="mt-1 font-osmono text-[12px] text-[var(--tb-accent)]">{t.price} · {t.note}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--tb-muted)]">{t.for}</p>
          <ul className="mt-3 space-y-1 text-[12px] text-[var(--tb-text)]">
            {t.points.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function LegalTab() {
  return (
    <ul className="space-y-2">
      {LEGAL_DOCS.map((d) => (
        <li key={d.href}>
          <a
            href={d.href}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-between rounded-xl border border-[var(--tb-border)] px-4 text-[13px] text-[var(--tb-text)]"
          >
            {d.label}
            <span aria-hidden className="font-osmono text-[11px] text-[var(--tb-muted)]">
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
