import { useSyncExternalStore, useState, type ReactNode } from "react";
import { GitBranch, GitMerge, Github, Network, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  flushLimen,
  getLimenSnapshot,
  stageLimenChange,
  subscribeLimen,
  type LimenMirrorMode,
} from "@/lib/limen/sync";
import { notifyOk } from "@/lib/shell/notify";

const MODES: { id: LimenMirrorMode; label: string }[] = [
  { id: "p2p", label: "P2P Mesh" },
  { id: "github", label: "GitHub Ayna" },
  { id: "local", label: "Yerel" },
];

export function LimenApp() {
  const snap = useSyncExternalStore(subscribeLimen, getLimenSnapshot, getLimenSnapshot);
  const [name, setName] = useState("Tedbirge Paket Katmanı");
  const [mode, setMode] = useState<LimenMirrorMode>("p2p");
  const [busy, setBusy] = useState(false);

  const stage = () => {
    const value = name.trim();
    if (!value) return;
    stageLimenChange(value, mode);
    notifyOk("LIMEN değişikliği kuyruğa alındı", value);
  };

  const flush = () => {
    setBusy(true);
    void flushLimen()
      .then((next) => notifyOk("LIMEN eşitlendi", `${next.sent} delta gönderildi`))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--tb-bg)] text-[var(--tb-fg)]">
      <header className="border-b border-[var(--tb-border)] bg-[var(--tb-panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
              LIMEN
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--tb-text)]">
              P2P Git ve sentez çalışma alanı
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-osmono text-[11px]">
            <Metric label="Düğüm" value={snap.node.slice(-6).toUpperCase()} />
            <Metric label="Eş" value={String(snap.peers)} />
            <Metric label="Kuyruk" value={String(snap.pending)} />
          </div>
        </div>
      </header>

      <section className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-4 shadow-[var(--tb-shadow)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-sm text-[var(--tb-muted)]">
              Çalışma alanı
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] px-3 text-sm text-[var(--tb-text)] outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={mode === m.id ? "default" : "outline"}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            <Button type="button" onClick={stage}>
              <GitBranch className="h-4 w-4" /> Delta ekle
            </Button>
            <Button type="button" variant="secondary" onClick={flush} disabled={busy}>
              <GitMerge className="h-4 w-4" /> Eşitle
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {snap.records.map((record) => (
              <article
                key={record.id}
                className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[var(--tb-text)]">
                      {record.name}
                    </h2>
                    <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
                      {record.branch} · {record.mode}
                    </p>
                  </div>
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--tb-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] px-2 py-1 font-osmono text-[10px] text-[var(--tb-accent)]">
                    {record.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-3">
          <StatusCard
            icon={<Network className="h-4 w-4" />}
            title="WebRTC Mesh"
            text={snap.online ? "P2P kanal hazır" : "Çevrimdışı kuyruk aktif"}
          />
          <StatusCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="AXIOM Düğümleri"
            text="Doğrulama deltaları çekirdekle eşleniyor"
          />
          <StatusCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Güvenli Sentez"
            text="Önizleme yerel VFS üzerinde hazırlanıyor"
          />
          <StatusCard
            icon={<Github className="h-4 w-4" />}
            title="Yetkili GitHub Ayna"
            text="Bağlantı izni olmadan dışa yazım yapılmaz"
          />
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] px-3 py-2">
      <span className="block text-[var(--tb-muted)]">{label}</span>
      <strong className="block text-[var(--tb-text)]">{value}</strong>
    </span>
  );
}

function StatusCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-4 shadow-[var(--tb-shadow)]">
      <div className="flex items-center gap-2 text-[var(--tb-accent)]">
        {icon}
        <span className="font-semibold text-[var(--tb-text)]">{title}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--tb-muted)]">{text}</p>
    </div>
  );
}
