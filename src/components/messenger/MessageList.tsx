/**
 * Mesaj geçmişi — gün ayırıcıları, ardışık gönderen gruplaması,
 * yukarı kaydırılmışken korunan konum ve "yeni mesajlar" düğmesi.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ListMessage = { id: string; from: string; at: string; text: string; self?: boolean; day?: string };

export type MessageGroup = { key: string; day: string; from: string; self: boolean; items: ListMessage[] };

/** Saf gruplama: gün değişince yeni ayırıcı, gönderen değişince yeni grup. */
export function groupMessages(list: ListMessage[]): MessageGroup[] {
  const out: MessageGroup[] = [];
  for (const m of list) {
    const day = m.day ?? "";
    const last = out[out.length - 1];
    if (last && last.day === day && last.from === m.from && last.self === !!m.self) last.items.push(m);
    else out.push({ key: m.id, day, from: m.from, self: !!m.self, items: [m] });
  }
  return out;
}

const dayLabel = (d: string) => {
  const today = new Date().toDateString();
  const y = new Date(Date.now() - 86_400_000).toDateString();
  return d === today ? "Bugün" : d === y ? "Dün" : d ? new Date(d).toLocaleDateString("tr-TR") : "";
};

export function MessageList({ messages, selfLabel }: { messages: ListMessage[]; selfLabel: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const prevLen = useRef(messages.length);

  useLayoutEffect(() => {
    const added = messages.length - prevLen.current;
    prevLen.current = messages.length;
    const el = box.current;
    if (!el || added <= 0) return;
    if (pinned || messages[messages.length - 1]?.self) {
      el.scrollTop = el.scrollHeight;
      setUnseen(0);
    } else setUnseen((n) => n + added);
  }, [messages, pinned]);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const groups = groupMessages(messages);
  let lastDay = "";

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          setPinned(atBottom);
          if (atBottom) setUnseen(0);
        }}
        className="h-full space-y-3 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label="Mesaj geçmişi"
      >
        {messages.length === 0 ? (
          <p className="pt-10 text-center text-[13px]" style={{ color: "var(--tb-muted)" }}>
            Henüz mesaj yok. Eş bağlandığında konuşma burada görünür.
          </p>
        ) : null}
        {groups.map((g) => {
          const sep = g.day !== lastDay ? dayLabel(g.day) : "";
          lastDay = g.day;
          return (
            <div key={g.key}>
              {sep ? (
                <div className="my-2 text-center text-[10.5px] uppercase tracking-wide" style={{ color: "var(--tb-muted)" }}>
                  {sep}
                </div>
              ) : null}
              <div className={`flex flex-col gap-0.5 ${g.self ? "items-end" : "items-start"}`}>
                <span className="px-1 text-[11px] font-medium" style={{ color: "var(--tb-muted)" }}>
                  {g.self ? `Siz · ${selfLabel}` : g.from}
                </span>
                {g.items.map((m) => (
                  <p
                    key={m.id}
                    className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-[14px]"
                    style={{
                      background: m.self
                        ? "color-mix(in srgb, var(--tb-accent) 18%, transparent)"
                        : "var(--tb-panel-soft)",
                      border: "1px solid var(--tb-border)",
                      color: "var(--tb-text)",
                    }}
                  >
                    {m.text}
                    <span className="ml-2 align-bottom text-[10px]" style={{ color: "var(--tb-muted)" }}>
                      {m.at}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {unseen > 0 ? (
        <button
          type="button"
          onClick={() => {
            const el = box.current;
            if (el) el.scrollTop = el.scrollHeight;
            setUnseen(0);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] shadow"
          style={{ background: "var(--tb-accent)", color: "var(--tb-bg)" }}
        >
          {unseen} yeni mesaj ↓
        </button>
      ) : null}
    </div>
  );
}
