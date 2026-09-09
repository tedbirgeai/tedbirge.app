/**
 * TEDBIRGE WRITER — gömülü yazı işlemcisi
 * Dış ağ bağımlılığı yoktur; belgeler şifreli VFS katmanında durur.
 */

import { useMemo } from "react";

import { OfficeFrame, ToolButton, useOfficeEditor } from "./OfficeFrame";

function markup(src: string): string {
  return src
    .split(/\n{2,}/)
    .map((block) => {
      const line = block.trim();
      if (!line) return "";
      if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
      if (/^[-*] /.test(line)) {
        const items = line
          .split("\n")
          .map((l) => `<li>${inline(l.replace(/^[-*] /, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(line).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function WriterApp() {
  const editor = useOfficeEditor("writer");
  const html = useMemo(() => markup(editor.text), [editor.text]);
  const words = editor.text.trim() ? editor.text.trim().split(/\s+/).length : 0;

  const insert = (token: string) => editor.setText(`${editor.text}${token}`);

  return (
    <OfficeFrame
      kind="writer"
      editor={editor}
      toolbar={
        <>
          <ToolButton onClick={() => insert("\n\n# Başlık\n\n")} label="Başlık" />
          <ToolButton onClick={() => insert("**kalın**")} label="Kalın" />
          <ToolButton onClick={() => insert("\n- madde")} label="Liste" />
        </>
      }
    >
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-0 lg:grid-cols-2 lg:grid-rows-1">
        <textarea
          value={editor.text}
          onChange={(e) => editor.setText(e.target.value)}
          aria-label="Belge metni"
          placeholder="Yazmaya başlayın…"
          className="min-h-0 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-[var(--tb-text)] outline-none"
        />
        <div
          className="tb-doc min-h-0 overflow-y-auto border-t p-4 text-[14px] leading-7 text-[var(--tb-text)] lg:border-t-0 lg:border-l"
          style={{ borderColor: "var(--border)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <p className="border-t p-2 text-[11px] text-[var(--tb-muted)]" style={{ borderColor: "var(--border)" }}>
        {words} kelime · {editor.text.length} karakter · çevrimdışı çalışır
      </p>
    </OfficeFrame>
  );
}
