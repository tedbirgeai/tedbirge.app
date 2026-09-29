import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";

const theme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--tb-text)",
    backgroundColor: "var(--tb-panel-solid)",
    fontSize: "12.5px",
  },
  ".cm-content": {
    fontFamily: "var(--font-osmono, ui-monospace, monospace)",
    caretColor: "var(--tb-accent)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--tb-panel-solid)",
    color: "var(--tb-muted)",
    borderRight: "1px solid var(--tb-border)",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--tb-accent) 8%, transparent)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--tb-accent) 25%, transparent)",
  },
});

function lang(path: string) {
  if (path.endsWith(".json") || path.endsWith(".tbapp")) return json();
  if (path.endsWith(".md")) return markdown();
  return javascript({ typescript: true });
}

export type EditorHandle = { goto: (line: number, col: number) => void; selection: () => string };

export function EditorPane({
  path,
  value,
  onChange,
  onSave,
  handleRef,
}: {
  path: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  handleRef?: React.MutableRefObject<EditorHandle | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const cb = useRef({ onChange, onSave });
  cb.current = { onChange, onSave };

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle),
          lang(path),
          theme,
          keymap.of([
            { key: "Mod-s", preventDefault: true, run: () => (cb.current.onSave(), true) },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    if (handleRef) {
      handleRef.current = {
        goto(line, col) {
          const doc = v.state.doc;
          const l = doc.line(Math.max(1, Math.min(line, doc.lines)));
          const pos = Math.min(l.to, l.from + Math.max(0, col - 1));
          v.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
          v.focus();
        },
        selection() {
          const r = v.state.selection.main;
          return v.state.sliceDoc(r.from, r.to);
        },
      };
    }
    return () => {
      v.destroy();
      view.current = null;
    };
    // Dosya değişince editör yeniden kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <div ref={host} className="h-full min-h-0 overflow-auto" aria-label={`${path} düzenleyici`} />
  );
}
