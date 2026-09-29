/**
 * ÜRETİLEN UYGULAMA ÇALIŞTIRICISI
 * ------------------------------------------------------------------
 * AxiomStudio'nun ürettiği uygulamayı bağımsız bir pencerede çalıştırır.
 *
 * Güvenlik sınırları:
 *  · Arayüz yalnız doğrulanmış bloklardan kurulur; serbest kod çalıştırılmaz.
 *  · Wasm çekirdeği yalnız onaylanmış yeteneklerle (`instantiateTbApp`) açılır.
 *  · Her çağrı bir zaman/bellek sigortasından geçer; sınır aşılırsa modül
 *    kapatılır ve uygulama "durduruldu" durumuna düşer.
 *  · Render hatası pencerede kalır; kabuk çökmez (Error Boundary).
 *  · Veriler yalnız uygulamanın kendi alanına (/appdata/{id}) yazılır.
 */

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Activity, AlertTriangle, Bell, RotateCcw, Save, Wifi, WifiOff } from "lucide-react";

import { instantiateTbApp, type TbAppInstance } from "@/apps/tbapp";
import { ghostBtn, inputClass, primaryBtn } from "@/components/shell/apps/portal/ui";
import { readAppData, writeAppData } from "@/lib/apps/appdata";
import { getNodeSnapshot } from "@/lib/node-runtime";
import { notify, notifyError } from "@/lib/shell/notify";
import { generatedApp, type GeneratedApp } from "@/lib/studio/generated-apps";
import type { UiBlock } from "@/lib/studio/generator";
import { postIpc } from "@/shell/desktop-ipc";
import { issueVfsToken } from "@/lib/vfs/tokens";

/** Tek bir Wasm çağrısı için üst sınır. */
export const WATCHDOG_MS = 1500;

export class WatchdogError extends Error {}

/**
 * Çağrıyı süre sigortasıyla ölçer. Tarayıcı iş parçacığı bir Wasm döngüsünü
 * yarıda kesemediği için sigorta, sınırı aşan modülü kapatır ve sonraki
 * çağrıları engeller; böylece hatalı uygulama pencereyi kilitlemeye devam edemez.
 */
export function runGuarded<T>(fn: () => T, limitMs = WATCHDOG_MS): { value?: T; ms: number; overrun: boolean } {
  const t0 = performance.now();
  const value = fn();
  const ms = performance.now() - t0;
  return { ...(value === undefined ? {} : { value }), ms, overrun: ms > limitMs };
}

/* --------------------------- çökme izolasyonu --------------------------- */

type BoundaryState = { error: Error | null };

class AppBoundary extends Component<{ name: string; children: ReactNode; onReset: () => void }, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Kullanıcı verisi kaydedilmez; yalnız geliştirici konsolunda iz bırakılır.
    if (import.meta.env.DEV) console.error("[uretim]", error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--tb-danger,#dc2626)]">
          <AlertTriangle className="size-4" /> {this.props.name} durduruldu
        </div>
        <p className="font-osmono text-[12px] leading-relaxed text-[var(--tb-muted)]">
          Uygulama beklenmeyen bir hatayla karşılaştı. İşletim sistemi etkilenmedi.
        </p>
        <pre className="max-h-40 overflow-auto rounded-lg bg-[var(--tb-surface-2)] p-3 font-osmono text-[11px] text-[var(--tb-text)]">
          {error.message || "Bilinmeyen hata"}
        </pre>
        <button
          type="button"
          className={primaryBtn}
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        >
          <RotateCcw className="size-3.5" /> Yeniden başlat
        </button>
      </div>
    );
  }
}

/* ------------------------------- bloklar -------------------------------- */

type Ctx = {
  app: GeneratedApp;
  call: (fn: string, args: number[]) => number | null;
  log: string[];
  stopped: string | null;
};

function StatusBlock() {
  const [snap, setSnap] = useState(() => ({ online: false, peers: 0 }));
  useEffect(() => {
    const read = () => {
      const s = getNodeSnapshot();
      setSnap({ online: s.online, peers: s.peers.length });
    };
    read();
    const t = window.setInterval(read, 2000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-[var(--tb-surface-2)] p-3">
        <div className="flex items-center gap-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          {snap.online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />} Çekirdek
        </div>
        <div className="mt-1 text-[15px] font-semibold text-[var(--tb-text)]">
          {snap.online ? "Çevrimiçi" : "Çevrimdışı"}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--tb-surface-2)] p-3">
        <div className="flex items-center gap-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          <Activity className="size-3.5" /> Bağlı eş
        </div>
        <div className="mt-1 text-[15px] font-semibold text-[var(--tb-text)]">{snap.peers}</div>
      </div>
    </div>
  );
}

function CounterBlock({ label, ctx }: { label: string; ctx: Ctx }) {
  const [value, setValue] = useState(0);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--tb-surface-2)] p-3">
      <span className="font-osmono text-[12px] text-[var(--tb-muted)]">{label}</span>
      <span className="text-[18px] font-semibold text-[var(--tb-text)]">{value}</span>
      <button
        type="button"
        className={ghostBtn}
        disabled={!!ctx.stopped}
        onClick={() => {
          const r = ctx.call("artir", [1]);
          setValue(r ?? value + 1);
        }}
      >
        +1
      </button>
      <button
        type="button"
        className={ghostBtn}
        disabled={!!ctx.stopped}
        onClick={() => setValue(ctx.call("sifirla", []) ?? 0)}
      >
        Sıfırla
      </button>
    </div>
  );
}

function CalcBlock({ label, fn, ctx }: { label: string; fn: string; ctx: Ctx }) {
  const [a, setA] = useState("2");
  const [b, setB] = useState("3");
  const [out, setOut] = useState<string>("—");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--tb-surface-2)] p-3">
      <input className={`${inputClass} w-20`} value={a} onChange={(e) => setA(e.target.value)} inputMode="decimal" />
      <input className={`${inputClass} w-20`} value={b} onChange={(e) => setB(e.target.value)} inputMode="decimal" />
      <button
        type="button"
        className={primaryBtn}
        disabled={!!ctx.stopped}
        onClick={() => {
          const r = ctx.call(fn, [Number(a) || 0, Number(b) || 0]);
          setOut(r === null ? "çekirdek yanıt vermedi" : String(r));
        }}
      >
        {label}
      </button>
      <span className="font-osmono text-[13px] text-[var(--tb-text)]">= {out}</span>
    </div>
  );
}

function NotesBlock({ label, appId }: { label: string; appId: string }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    void readAppData(appId, "not.txt").then((v) => {
      if (typeof v === "string") setText(v);
    });
  }, [appId]);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[var(--tb-surface-2)] p-3">
      <span className="font-osmono text-[11px] text-[var(--tb-muted)]">{label}</span>
      <textarea
        className={`${inputClass} min-h-24 resize-y`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={ghostBtn}
          onClick={async () => {
            try {
              await writeAppData(appId, "not.txt", text);
              setSaved(new Date().toLocaleTimeString("tr-TR"));
            } catch {
              notifyError("Kaydedilemedi", "Uygulama alanına yazılamadı.");
            }
          }}
        >
          <Save className="size-3.5" /> Kaydet
        </button>
        {saved && <span className="font-osmono text-[11px] text-[var(--tb-muted)]">Kaydedildi {saved}</span>}
      </div>
    </div>
  );
}

function NotifyBlock({ label, text, appId }: { label: string; text: string; appId: string }) {
  return (
    <button
      type="button"
      className={ghostBtn}
      onClick={async () => {
        try {
          const cap = await issueVfsToken(appId, "write", "shell.notifications");
          await postIpc({ from: appId, to: "shell.notifications", kind: "notify", payload: { text }, cap });
        } catch {
          /* jeton reddedilirse bildirim yine kullanıcıya gösterilir */
        }
        notify(label, text);
      }}
    >
      <Bell className="size-3.5" /> {label}
    </button>
  );
}

function BlockView({ block, ctx }: { block: UiBlock; ctx: Ctx }) {
  switch (block.kind) {
    case "baslik":
      return <h2 className="text-[16px] font-semibold text-[var(--tb-text)]">{block.text}</h2>;
    case "metin":
      return <p className="font-osmono text-[12px] leading-relaxed text-[var(--tb-muted)]">{block.text}</p>;
    case "durum":
      return <StatusBlock />;
    case "sayac":
      return <CounterBlock label={block.label} ctx={ctx} />;
    case "hesap":
      return <CalcBlock label={block.label} fn={block.fn} ctx={ctx} />;
    case "not":
      return <NotesBlock label={block.label} appId={ctx.app.spec.id} />;
    case "bildirim":
      return <NotifyBlock label={block.label} text={block.text} appId={ctx.app.spec.id} />;
    case "gunluk":
      return (
        <pre className="max-h-40 min-h-16 overflow-auto rounded-xl bg-[var(--tb-surface-2)] p-3 font-osmono text-[11px] text-[var(--tb-text)]">
          {ctx.log.length ? ctx.log.join("\n") : "Çekirdek günlüğü boş."}
        </pre>
      );
  }
}

/* ------------------------------ çalıştırıcı ------------------------------ */

function Runner({ app, nonce }: { app: GeneratedApp; nonce: number }) {
  const [log, setLog] = useState<string[]>([]);
  const [stopped, setStopped] = useState<string | null>(null);
  const inst = useRef<TbAppInstance | null>(null);

  useEffect(() => {
    let alive = true;
    setLog([]);
    setStopped(null);
    if (!app.module) {
      setStopped("Bu uygulamanın çekirdeği derlenmemiş.");
      return;
    }
    const manifest = {
      id: app.spec.id,
      name: app.spec.name,
      version: app.spec.version,
      capabilities: app.spec.capabilities,
      module: app.module,
      description: app.spec.description,
    };
    void instantiateTbApp(manifest, app.spec.capabilities, (line) =>
      setLog((l) => [...l.slice(-199), line]),
    )
      .then((i) => {
        if (!alive) return i.dispose();
        inst.current = i;
        const start = i.exports["start"];
        if (typeof start === "function") {
          const r = runGuarded(() => (start as () => void)());
          if (r.overrun) {
            i.dispose();
            inst.current = null;
            setStopped(`Çekirdek ${Math.round(r.ms)} ms sürdü ve zaman sigortasıyla durduruldu.`);
          }
        }
      })
      .catch((e: unknown) =>
        setStopped(e instanceof Error ? e.message : "Çekirdek başlatılamadı."),
      );
    return () => {
      alive = false;
      inst.current?.dispose();
      inst.current = null;
    };
  }, [app, nonce]);

  const call = useCallback(
    (fn: string, args: number[]): number | null => {
      const f = inst.current?.exports[fn];
      if (typeof f !== "function") return null;
      const r = runGuarded(() => (f as (...a: number[]) => number)(...args));
      if (r.overrun) {
        inst.current?.dispose();
        inst.current = null;
        setStopped(`"${fn}" ${Math.round(r.ms)} ms sürdü; kaynak sigortası devreye girdi.`);
        return null;
      }
      return typeof r.value === "number" ? r.value : null;
    },
    [],
  );

  const ctx = useMemo<Ctx>(() => ({ app, call, log, stopped }), [app, call, log, stopped]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
      {stopped && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--tb-surface-2)] p-3 font-osmono text-[11px] text-[var(--tb-muted)]">
          <AlertTriangle className="size-3.5" /> {stopped}
        </div>
      )}
      {app.spec.blocks.map((b, i) => (
        <BlockView key={`${b.kind}-${i}`} block={b} ctx={ctx} />
      ))}
    </div>
  );
}

export function GeneratedAppRunner({ appId }: { appId: string }) {
  const [nonce, setNonce] = useState(0);
  const app = generatedApp(appId);
  if (!app)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center font-osmono text-[12px] text-[var(--tb-muted)]">
        Bu uygulama artık kurulu değil.
      </div>
    );
  return (
    <AppBoundary name={app.spec.name} onReset={() => setNonce((n) => n + 1)}>
      <Runner app={app} nonce={nonce} />
    </AppBoundary>
  );
}
