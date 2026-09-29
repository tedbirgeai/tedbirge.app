/**
 * AXIOM BOT — Sohbet içindeki AI asistanı.
 * Yanıtlar sunucu üzerinden akış halinde gelir; konuşma yalnız bu cihazda
 * saklanır. İddia içeren kullanıcı mesajları AXIOM motoruna gönderilir ve
 * sonucu rozetle gösterilir (motor karar veremezse "karar verilemedi").
 */

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Square, Trash2 } from "lucide-react";

import { looksLikeClaim, verdictLabel } from "@/lib/axiom-bot";
import { classifyIntent } from "@/lib/studio/intent";
import { applySystemPatch } from "@/lib/studio/system-patch";
import { openingLine, reportForPatch, type DiagnosisReport } from "@/lib/studio/diagnosis";
import { DiagnosisCard } from "@/components/axiom/DiagnosisCard";
import { notifyOk } from "@/lib/shell/notify";
import { describeNode, useNodeRuntime } from "@/lib/node-runtime";



const KEY = "tb.axiom-bot.v1";

function load(): UIMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? (v as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function textOf(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function AxiomBotPanel() {
  const [initial] = useState<UIMessage[]>(() => (typeof window === "undefined" ? [] : load()));
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "axiom-bot",
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/axiom-bot" }),
  });
  const [input, setInput] = useState("");
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<DiagnosisReport[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const node = useNodeRuntime();
  const status2 = describeNode(node);
  const box = useRef<HTMLTextAreaElement | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") {
      try {
        localStorage.setItem(KEY, JSON.stringify(messages.slice(-60)));
      } catch {
        /* depolama dolu: konuşma yalnız bellekte kalır */
      }
      box.current?.focus();
      setThinking(null);
    }
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "user" || verdicts[m.id]) continue;
      const t = textOf(m);
      if (!looksLikeClaim(t)) continue;
      setVerdicts((v) => ({ ...v, [m.id]: "…" }));
      void import("@/lib/axiom/local-kernel")
        .then(({ localVerify }) => localVerify(t))
        .then(({ result }) => setVerdicts((v) => ({ ...v, [m.id]: String(result.verdict) })))
        .catch(() => setVerdicts((v) => ({ ...v, [m.id]: "UNDECIDED" })));
    }
  }, [messages, verdicts]);

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    setThinking(openingLine(t));
    // Mod B: sistem bileşeni isteği ise yerinde uygulanır/incelenir; uygulama üretilmez.
    const intent = classifyIntent(t);
    if (intent.mode === "sistem") {
      const r = applySystemPatch(intent.patch);
      const report = reportForPatch(t, intent, r);
      setReports((prev) => [...prev.slice(-9), report]);
      setThinking(null);
      if (r.applied) notifyOk(r.component, r.summary);
      if (r.applied || r.kind === "inceleme") return;
    }
    void sendMessage({ text: t });
  };



  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-xl"
      style={{ background: "var(--tb-panel)", border: "1px solid var(--tb-border)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--tb-border)" }}
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: "var(--tb-panel-soft)", color: "var(--tb-accent)" }}
        >
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Axiom Bot</div>
          <div className="text-[11px]" style={{ color: "var(--tb-muted)" }}>
            AI asistanı · iddialar AXIOM motoruyla denetlenir · konuşma bu cihazda
          </div>
        </div>
        <button
          type="button"
          aria-label="Konuşmayı temizle"
          title="Konuşmayı temizle"
          disabled={busy || (!messages.length && !reports.length)}
          onClick={() => {
            setMessages([]);
            setVerdicts({});
            setReports([]);

            localStorage.removeItem(KEY);
          }}
          className="rounded p-1.5 disabled:opacity-40"
          style={{ color: "var(--tb-muted)" }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5 px-4 py-2 text-[11px]"
        style={{ borderBottom: "1px solid var(--tb-border)", color: "var(--tb-muted)" }}
        aria-label="Çekirdek durumu"
      >
        <span className="rounded-full px-2 py-0.5" style={{ background: "var(--tb-panel-soft)" }}>
          Bağlı cihaz: {status2.directPeers}
        </span>
        <span className="rounded-full px-2 py-0.5" style={{ background: "var(--tb-panel-soft)" }}>
          {status2.text}
        </span>
        <span className="rounded-full px-2 py-0.5" style={{ background: "var(--tb-panel-soft)" }}>
          Sırada: {status2.queued}
        </span>
        <span className="rounded-full px-2 py-0.5" style={{ background: "var(--tb-panel-soft)" }}>
          Hakikat motoru bağlı
        </span>
      </div>


      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[14px]">

        {!messages.length && !reports.length ? (
          <p style={{ color: "var(--tb-muted)" }}>
            Henüz sohbet yok. Bir soru sorun ya da "2 + 2 = 4" gibi bir iddia yazın.
          </p>
        ) : null}
        {messages.map((m) => {
          const v = verdicts[m.id];
          return m.role === "user" ? (
            <div key={m.id} className="flex flex-col items-end gap-1">
              <div
                className="max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2"
                style={{ background: "var(--tb-accent)", color: "var(--tb-bg)" }}
              >
                {textOf(m)}
              </div>
              {v ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: "var(--tb-panel-soft)", color: "var(--tb-muted)" }}
                >
                  AXIOM: {v === "…" ? "denetleniyor…" : verdictLabel(v)}
                </span>
              ) : null}
            </div>
          ) : (
            <div key={m.id} className="prose prose-sm max-w-none" style={{ color: "var(--tb-text)" }}>
              <ReactMarkdown>{textOf(m)}</ReactMarkdown>
            </div>
          );
        })}
        {reports.map((r) => (
          <DiagnosisCard key={r.id} report={r} />
        ))}
        {thinking || status === "submitted" ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--tb-muted)" }}>
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full pulse"
                  style={{ background: "var(--tb-accent)", animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </span>
            {thinking ?? "Axiom Bot yazıyor…"}
          </div>
        ) : null}

        {error ? (
          <div className="text-[13px]" style={{ color: "var(--tb-rose-400)" }}>
            {error.message || "Yanıt alınamadı."}
          </div>
        ) : null}
        <div ref={end} />
      </div>

      <div className="flex items-end gap-2 p-3" style={{ borderTop: "1px solid var(--tb-border)" }}>
        <textarea
          ref={box}
          autoFocus
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Axiom Bot'a yazın…"
          aria-label="Axiom Bot mesajı"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg px-3 py-2 text-[14px] outline-none"
          style={{ background: "var(--tb-panel-soft)", border: "1px solid var(--tb-border)" }}
        />
        <button
          type="button"
          aria-label={busy ? "Durdur" : "Gönder"}
          onClick={busy ? () => void stop() : submit}
          disabled={!busy && !input.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg disabled:opacity-40"
          style={{ background: "var(--tb-accent)", color: "var(--tb-bg)" }}
        >
          {busy ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
