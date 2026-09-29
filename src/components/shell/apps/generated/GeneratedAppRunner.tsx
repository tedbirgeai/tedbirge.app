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

import { ghostBtn, inputClass, primaryBtn } from "@/components/shell/apps/portal/ui";
import { readAppData, removeAppData, writeAppData } from "@/lib/apps/appdata";
import { getNodeSnapshot } from "@/lib/node-runtime";
import { notifyError } from "@/lib/shell/notify";
import { faultTitle, reportFault, startAppRuntime, WATCHDOG_MS, type AppFault, type AppRuntime } from "@/lib/studio/app-runtime";
import { generatedApp, type GeneratedApp } from "@/lib/studio/generated-apps";
import { CALC_ERRORS, CALC_OPS, COUNTER_LIMIT, type UiBlock } from "@/lib/studio/generator";
import { postIpc } from "@/shell/desktop-ipc";
import { issueVfsToken } from "@/lib/vfs/tokens";

export { WATCHDOG_MS };

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
  call: (fn: string, args: number[]) => Promise<number | null>;
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

const panel =
  "rounded-xl bg-[var(--tb-surface-2)] p-3 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--tb-accent)]";
const key =
  "rounded-lg bg-[var(--tb-surface)] px-2 py-2 font-osmono text-[13px] text-[var(--tb-text)] transition-colors hover:bg-[var(--tb-accent)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tb-accent)] active:scale-[0.97] disabled:opacity-50";

function saturate(v: number): number {
  return Math.max(-COUNTER_LIMIT, Math.min(COUNTER_LIMIT, Math.trunc(v)));
}

function CounterBlock({ label, ctx }: { label: string; ctx: Ctx }) {
  const appId = ctx.app.spec.id;
  const [value, setValue] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const valueRef = useRef(0);

  useEffect(() => {
    void readAppData(appId, "sayac.json").then((raw) => {
      const n = raw ? Number(JSON.parse(raw)) : 0;
      if (Number.isFinite(n)) {
        valueRef.current = saturate(n);
        setValue(valueRef.current);
      }
    }).catch(() => setErr("Kayıtlı sayaç okunamadı; sıfırdan başlandı."));
  }, [appId]);

  const commit = useCallback(
    (next: number) => {
      valueRef.current = next;
      setValue(next);
      writeAppData(appId, "sayac.json", JSON.stringify(next)).catch(() =>
        setErr("Sayaç kaydedilemedi."),
      );
    },
    [appId],
  );

  const step = useCallback(
    async (by: number) => {
      setErr(null);
      const r = await ctx.call("sayac_adim", [valueRef.current, by]);
      commit(r === null ? saturate(valueRef.current + by) : r);
      if (Math.abs(valueRef.current) >= COUNTER_LIMIT) setErr("Güvenli sınıra ulaşıldı.");
    },
    [ctx, commit],
  );

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${label}: ${value}. Yukarı/aşağı ok ile değiştir, Escape ile sıfırla.`}
      className={`${panel} flex flex-wrap items-center gap-3`}
      onKeyDown={(e) => {
        if (ctx.stopped) return;
        if (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "+") {
          e.preventDefault();
          void step(e.shiftKey ? 10 : 1);
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "-") {
          e.preventDefault();
          void step(e.shiftKey ? -10 : -1);
        } else if (e.key === "Escape" || e.key === "0") {
          e.preventDefault();
          commit(0);
        }
      }}
    >
      <span className="font-osmono text-[12px] text-[var(--tb-muted)]">{label}</span>
      <span aria-live="polite" className="min-w-12 text-[20px] font-semibold tabular-nums text-[var(--tb-text)]">
        {value.toLocaleString("tr-TR")}
      </span>
      <div className="flex gap-1.5">
        <button type="button" className={key} disabled={!!ctx.stopped} onClick={() => void step(-1)} aria-label="Bir azalt">−1</button>
        <button type="button" className={key} disabled={!!ctx.stopped} onClick={() => void step(1)} aria-label="Bir artır">+1</button>
        <button type="button" className={key} disabled={!!ctx.stopped} onClick={() => void step(10)} aria-label="On artır">+10</button>
        <button type="button" className={key} disabled={!!ctx.stopped} onClick={() => commit(0)}>Sıfırla</button>
      </div>
      {err && <span className="w-full font-osmono text-[11px] text-[var(--tb-danger,var(--tb-muted))]">{err}</span>}
    </div>
  );
}

type Op = (typeof CALC_OPS)[number];
const OP_LABEL: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "mod" };

function localCalc(a: number, b: number, op: Op): { value: number; code: number } {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { value: 0, code: 2 };
  if ((op === "/" || op === "%") && b === 0) return { value: 0, code: 1 };
  const r = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a % b;
  if (!Number.isFinite(r)) return { value: 0, code: 2 };
  if (Math.abs(r) > 1e15) return { value: 0, code: 3 };
  return { value: r, code: 0 };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(12)));
}

function CalcBlock({ label, fn, ctx }: { label: string; fn: string; ctx: Ctx }) {
  const appId = ctx.app.spec.id;
  const [entry, setEntry] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void readAppData(appId, "hesap-gecmisi.json")
      .then((raw) => {
        const list = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(list)) setHistory(list.filter((x): x is string => typeof x === "string").slice(-20));
      })
      .catch(() => setHistory([]));
  }, [appId]);

  const compute = useCallback(
    async (a: number, b: number, o: Op): Promise<number | null> => {
      const opCode = CALC_OPS.indexOf(o);
      const r = await ctx.call(fn, [a, b, opCode]);
      const code = r === null ? null : await ctx.call("hata_kodu", []);
      // Eski modüller (hata_kodu yok) aynı korumalarla yerelde hesaplanır.
      const res = r === null || code === null ? localCalc(a, b, o) : { value: r, code };
      if (res.code !== 0) {
        setError(CALC_ERRORS[res.code] ?? "Hesaplanamadı.");
        return null;
      }
      return res.value;
    },
    [ctx, fn],
  );

  const digit = (d: string) => {
    setError(null);
    setEntry((cur) => {
      if (fresh) return d === "." ? "0." : d;
      if (d === "." && cur.includes(".")) return cur;
      if (cur.replace(/[-.]/g, "").length >= 15) return cur;
      return cur === "0" && d !== "." ? d : cur + d;
    });
    setFresh(false);
  };

  const backspace = () => {
    if (fresh) return;
    setEntry((cur) => (cur.length <= 1 || (cur.length === 2 && cur.startsWith("-")) ? "0" : cur.slice(0, -1)));
  };

  const clearAll = () => {
    setEntry("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
    setError(null);
  };

  const pushHistory = (line: string) => {
    setHistory((h) => {
      const next = [...h, line].slice(-20);
      writeAppData(appId, "hesap-gecmisi.json", JSON.stringify(next)).catch(() =>
        notifyError("Kaydedilemedi", "Hesap geçmişi uygulama alanına yazılamadı."),
      );
      return next;
    });
  };

  const chooseOp = async (next: Op) => {
    if (busy || ctx.stopped) return;
    const b = Number(entry);
    if (acc !== null && op && !fresh) {
      setBusy(true);
      const r = await compute(acc, b, op);
      setBusy(false);
      if (r === null) return;
      setAcc(r);
      setEntry(fmt(r));
    } else {
      setAcc(b);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = async () => {
    if (busy || ctx.stopped || acc === null || !op) return;
    const b = Number(entry);
    setBusy(true);
    const r = await compute(acc, b, op);
    setBusy(false);
    if (r === null) return;
    pushHistory(`${fmt(acc)} ${OP_LABEL[op]} ${fmt(b)} = ${fmt(r)}`);
    setEntry(fmt(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let handled = true;
    if (/^[0-9]$/.test(k)) digit(k);
    else if (k === "." || k === ",") digit(".");
    else if ((CALC_OPS as readonly string[]).includes(k)) void chooseOp(k as Op);
    else if (k === "x" || k === "X") void chooseOp("*");
    else if (k === "Enter" || k === "=") void equals();
    else if (k === "Backspace") backspace();
    else if (k === "Escape" || k === "Delete") clearAll();
    else handled = false;
    if (handled) e.preventDefault();
  };

  const keys: Array<{ l: string; a: () => void; wide?: boolean; accent?: boolean }> = [
    { l: "C", a: clearAll },
    { l: "⌫", a: backspace },
    { l: "mod", a: () => void chooseOp("%") },
    { l: "÷", a: () => void chooseOp("/") },
    ...["7", "8", "9"].map((d) => ({ l: d, a: () => digit(d) })),
    { l: "×", a: () => void chooseOp("*") },
    ...["4", "5", "6"].map((d) => ({ l: d, a: () => digit(d) })),
    { l: "−", a: () => void chooseOp("-") },
    ...["1", "2", "3"].map((d) => ({ l: d, a: () => digit(d) })),
    { l: "+", a: () => void chooseOp("+") },
    { l: "0", a: () => digit("0"), wide: true },
    { l: ",", a: () => digit(".") },
    { l: "=", a: () => void equals(), accent: true },
  ];

  return (
    <div
      tabIndex={0}
      role="application"
      aria-label={`${label}. Rakamlar, + − × ÷, Enter, Backspace ve Escape desteklenir.`}
      className={`${panel} flex flex-col gap-2`}
      onKeyDown={onKey}
    >
      <div className="rounded-lg bg-[var(--tb-surface)] px-3 py-2 text-right">
        <div className="h-4 font-osmono text-[11px] text-[var(--tb-muted)]">
          {acc !== null && op ? `${fmt(acc)} ${OP_LABEL[op]}` : label}
        </div>
        <div aria-live="polite" className="truncate text-[22px] font-semibold tabular-nums text-[var(--tb-text)]">
          {busy ? "…" : entry.replace(".", ",")}
        </div>
        {error && <div role="alert" className="font-osmono text-[11px] text-[var(--tb-danger,var(--tb-muted))]">{error}</div>}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <button
            key={k.l}
            type="button"
            tabIndex={-1}
            disabled={!!ctx.stopped || busy}
            onClick={k.a}
            className={`${key} ${k.wide ? "col-span-2" : ""} ${k.accent ? "bg-[var(--tb-accent)] text-[var(--tb-accent-foreground,var(--tb-text))] hover:bg-[var(--tb-accent)]" : ""}`}
          >
            {k.l}
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between font-osmono text-[10px] text-[var(--tb-muted)]">
            <span>Geçmiş</span>
            <button
              type="button"
              className="hover:text-[var(--tb-text)] focus-visible:outline-none focus-visible:underline"
              onClick={() => {
                setHistory([]);
                removeAppData(appId, "hesap-gecmisi.json");
              }}
            >
              Temizle
            </button>
          </div>
          {history.slice(-5).reverse().map((h, i) => (
            <div key={`${h}-${i}`} className="text-right font-osmono text-[11px] tabular-nums text-[var(--tb-muted)]">{h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesBlock({ label, appId }: { label: string; appId: string }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const lastSaved = useRef("");

  useEffect(() => {
    void readAppData(appId, "not.txt")
      .then((v) => {
        if (typeof v === "string") {
          setText(v);
          lastSaved.current = v;
        }
      })
      .finally(() => setLoaded(true));
  }, [appId]);

  const save = useCallback(
    async (value: string) => {
      try {
        await writeAppData(appId, "not.txt", value);
        lastSaved.current = value;
        setSavedAt(new Date().toLocaleTimeString("tr-TR"));
        setState("saved");
      } catch {
        setState("error");
        notifyError("Kaydedilemedi", "Uygulama alanına yazılamadı.");
      }
    },
    [appId],
  );

  // Otomatik kayıt: yazmayı bıraktıktan 800 ms sonra.
  useEffect(() => {
    if (!loaded || text === lastSaved.current) return;
    setState("dirty");
    const t = window.setTimeout(() => void save(text), 800);
    return () => window.clearTimeout(t);
  }, [text, loaded, save]);

  return (
    <div className={`${panel} flex flex-col gap-2`}>
      <label className="font-osmono text-[11px] text-[var(--tb-muted)]" htmlFor={`not-${appId}`}>
        {label}
      </label>
      <textarea
        id={`not-${appId}`}
        className={`${inputClass} min-h-24 resize-y`}
        value={text}
        disabled={!loaded}
        maxLength={20000}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            void save(text);
          } else if (e.key === "Escape") {
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button type="button" className={ghostBtn} onClick={() => void save(text)}>
          <Save className="size-3.5" /> Kaydet
        </button>
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]">
          {state === "dirty" && "Kaydediliyor…"}
          {state === "saved" && savedAt && `Kaydedildi ${savedAt}`}
          {state === "error" && "Kayıt başarısız"}
          {state === "idle" && "Ctrl+S ile kaydet · otomatik kayıt açık"}
        </span>
        <span className="ml-auto font-osmono text-[10px] text-[var(--tb-muted)]">{text.length}/20000</span>
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
          notifyError("Bildirim reddedildi", "Uygulamanın bildirim yetkisi doğrulanamadı.");
        }
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

function Runner({ app, nonce, onRestart }: { app: GeneratedApp; nonce: number; onRestart: () => void }) {
  const [log, setLog] = useState<string[]>([]);
  const [fault, setFault] = useState<AppFault | null>(null);
  const rt = useRef<AppRuntime | null>(null);

  useEffect(() => {
    setLog([]);
    setFault(null);
    if (!app.module) {
      setFault({ appId: app.spec.id, reason: "load", message: "Bu uygulamanın çekirdeği derlenmemiş.", ms: 0 });
      return;
    }
    const runtime = startAppRuntime({
      appId: app.spec.id,
      module: app.module,
      status: () => {
        const s = getNodeSnapshot();
        return { online: s.online, peers: s.peers.length };
      },
      onLog: (line) => setLog((l) => [...l.slice(-199), line]),
      onFault: (f) => {
        setFault(f);
        void reportFault(f, app.spec.name);
      },
    });
    rt.current = runtime;
    void runtime.call("start", []).catch(() => {});
    return () => {
      runtime.dispose();
      if (rt.current === runtime) rt.current = null;
    };
  }, [app, nonce]);

  const call = useCallback(async (fn: string, args: number[]): Promise<number | null> => {
    const r = rt.current;
    if (!r || r.dead) return null;
    try {
      return await r.call(fn, args);
    } catch {
      return null;
    }
  }, []);

  const stopped = fault ? fault.message : null;
  const ctx = useMemo<Ctx>(() => ({ app, call, log, stopped }), [app, call, log, stopped]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
      {fault && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl bg-[var(--tb-surface-2)] p-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--tb-danger,#dc2626)]">
            <AlertTriangle className="size-4" /> {faultTitle(app.spec.name, fault.reason)}
          </div>
          <p className="font-osmono text-[12px] text-[var(--tb-text)]">{fault.message}</p>
          <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
            {fault.ms ? `Süre: ${fault.ms} ms · ` : ""}Masaüstü ve diğer uygulamalar etkilenmedi.
          </p>
          <div className="flex gap-2">
            <button type="button" className={primaryBtn} onClick={onRestart}>
              <RotateCcw className="size-3.5" /> Yeniden başlat
            </button>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => void navigator.clipboard?.writeText([fault.message, ...log].join("\n")).catch(() => {})}
            >
              Günlüğü kopyala
            </button>
          </div>
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
      <Runner app={app} nonce={nonce} onRestart={() => setNonce((n) => n + 1)} />
    </AppBoundary>
  );
}
