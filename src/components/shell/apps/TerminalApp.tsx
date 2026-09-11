/**
 * TEDBİRGE TERMİNAL — sistem kabuğu
 * ------------------------------------------------------------------
 * POSIX/DOS uyumlu komut çekirdeğinin (src/lib/terminal) görsel yüzü.
 * Tüm komutlar cihazda çalışır; hiçbir istek ağa çıkmaz.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { browserHost } from "@/lib/terminal/browser-host";
import type { Line } from "@/lib/terminal/commands";
import { TerminalShell } from "@/lib/terminal/shell";

const BANNER: Line[] = [
  { text: "Tedbirge(R) WebOS — sistem kabuğu", tone: "accent" },
  { text: "Komut rehberi için: yardim · Tamamlama: Tab · Geçmiş: ↑ ↓", tone: "dim" },
  { text: "" },
];

const TONE: Record<string, string> = {
  ok: "text-[var(--tb-ok)]",
  err: "text-[var(--tb-danger)]",
  warn: "text-[var(--tb-warn)]",
  dim: "opacity-60",
  accent: "text-[var(--tb-accent)]",
  out: "",
};

export function TerminalApp() {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState(-1);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shell = useMemo(
    () => new TerminalShell({ host: browserHost, onClear: () => setLines([]) }),
    [],
  );
  const [cwd, setCwd] = useState(shell.path());

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  // Evrensel arama bir komut seçtiğinde giriş satırına hazır yazılır.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const cmd = (e as CustomEvent<{ command?: string }>).detail?.command;
      if (!cmd) return;
      setInput(cmd);
      inputRef.current?.focus();
    };
    window.addEventListener("tedbirge:terminal-prefill", onPrefill);
    return () => window.removeEventListener("tedbirge:terminal-prefill", onPrefill);
  }, []);

  const submit = useCallback(
    async (raw: string) => {
      setLines((l) => [...l, { text: `${cwd} $ ${raw}`, tone: "accent" }]);
      setBusy(true);
      try {
        const res = await shell.execute(raw);
        if (res.lines.length) setLines((l) => [...l, ...res.lines]);
      } catch (err) {
        setLines((l) => [...l, { text: `kabuk hatası: ${String(err)}`, tone: "err" }]);
      } finally {
        setBusy(false);
        setCwd(shell.path());
      }
    },
    [cwd, shell],
  );

  const onKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hist = shell.history();
    if (e.key === "Enter") {
      const line = input;
      setInput("");
      setCursor(-1);
      await submit(line);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { value, options } = await shell.complete(input);
      setInput(value);
      if (options.length > 1) setLines((l) => [...l, { text: options.join("   "), tone: "dim" }]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(hist.length - 1, cursor + 1);
      setCursor(next);
      setInput(hist[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(-1, cursor - 1);
      setCursor(next);
      setInput(next < 0 ? "" : (hist[next] ?? ""));
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setLines((l) => [...l, { text: `${cwd} $ ${input}^C`, tone: "dim" }]);
      setInput("");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-0 flex-1 cursor-text flex-col p-3 text-left font-osmono text-[12.5px] leading-6 text-[var(--tb-text)]"
      style={{ background: "color-mix(in srgb, var(--tb-bg) 88%, black)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words">
        {lines.map((l, i) => (
          <div key={i} className={TONE[l.tone ?? "out"]}>
            {l.text || "\u00a0"}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="shrink-0 text-[var(--tb-accent)]">{cwd} $</span>
        <input
          ref={inputRef}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => void onKey(e)}
          aria-label="Komut satırı"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none disabled:opacity-50"
        />
      </div>
    </button>
  );
}
