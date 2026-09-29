/**
 * Mesaj yazma alanı. Taslak bu bileşenin kendi durumudur; üst bileşen
 * yeniden çizildiğinde giriş alanı yeniden oluşturulmaz ve odak kaybolmaz.
 */

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";

import { EmojiPicker } from "./EmojiPicker";

export type ComposerHandle = { focus: () => void };

export const Composer = forwardRef<
  ComposerHandle,
  { onSend: (text: string) => void; onAttach: () => void }
>(function Composer({ onSend, onAttach }, ref) {
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);

  const insert = (e: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + e + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + e.length, start + e.length);
    });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setEmoji(false);
    onSend(text);
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative flex shrink-0 items-center gap-2 px-3 py-3"
      style={{ borderTop: "1px solid var(--tb-border)" }}
    >
      {emoji ? <EmojiPicker onPick={insert} /> : null}
      <button
        type="button"
        aria-label="Emoji ekle"
        aria-expanded={emoji}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setEmoji((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-lg"
        style={{ color: emoji ? "var(--tb-accent)" : "var(--tb-muted)" }}
      >
        <Smile className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Dosya ekle"
        onClick={onAttach}
        className="grid h-9 w-9 place-items-center rounded-lg"
        style={{ color: "var(--tb-muted)" }}
      >
        <Paperclip className="h-4 w-4" />
      </button>
      <input
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEmoji(false);
        }}
        placeholder="Mesaj yazın…"
        aria-label="Mesaj"
        className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[14px] outline-none"
        style={{
          background: "var(--tb-panel-soft)",
          border: "1px solid var(--tb-border)",
          color: "var(--tb-text)",
        }}
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium disabled:opacity-40"
        style={{ background: "var(--tb-accent)", color: "var(--tb-bg)" }}
      >
        <Send className="h-4 w-4" /> Gönder
      </button>
    </form>
  );
});
