/**
 * TEDBIRGE NOTES — hızlı not defteri
 * Notlar cihazdaki şifreli VFS katmanına yazılır; senkron için harici
 * bir hesap veya bulut gerekmez.
 */

import { OfficeFrame, ToolButton, useOfficeEditor } from "./OfficeFrame";

export function NotesApp() {
  const editor = useOfficeEditor("notes");

  const stamp = () => {
    const now = new Date().toLocaleString("tr-TR");
    editor.setText(`${editor.text}${editor.text ? "\n" : ""}[${now}] `);
  };

  return (
    <OfficeFrame
      kind="notes"
      editor={editor}
      toolbar={<ToolButton onClick={stamp} label="Zaman damgası" />}
    >
      <textarea
        value={editor.text}
        onChange={(e) => editor.setText(e.target.value)}
        aria-label="Not içeriği"
        placeholder="Notunuzu yazın…"
        className="min-h-0 flex-1 resize-none bg-transparent p-4 text-[14px] leading-7 text-[var(--tb-text)] outline-none"
      />
      <p
        className="border-t p-2 text-[11px] text-[var(--tb-muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        Notlar yalnız bu cihazda saklanır.
      </p>
    </OfficeFrame>
  );
}
