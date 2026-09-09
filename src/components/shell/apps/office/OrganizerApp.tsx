/**
 * TEDBIRGE P2P ORGANIZER — görev ve randevu ajandası
 * Kayıtlar şifreli VFS katmanında tutulur; paylaşım yalnız kullanıcı
 * istediğinde eşler arası aktarım penceresinden yapılır.
 */

import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { OfficeFrame, useOfficeEditor } from "./OfficeFrame";

type Task = { id: string; text: string; due: string; done: boolean };

function parse(text: string): Task[] {
  try {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data))
      return data.map((t, i) => ({
        id: String((t as Task)?.id ?? i),
        text: String((t as Task)?.text ?? ""),
        due: String((t as Task)?.due ?? ""),
        done: Boolean((t as Task)?.done),
      }));
  } catch {
    /* bozuk belge: boş ajanda */
  }
  return [];
}

export function OrganizerApp() {
  const editor = useOfficeEditor("organizer");
  const tasks = useMemo(() => parse(editor.text), [editor.text]);
  const [draft, setDraft] = useState("");
  const [due, setDue] = useState("");

  const write = (next: Task[]) => editor.setText(JSON.stringify(next));

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    write([...tasks, { id: `${Date.now()}`, text: t, due, done: false }]);
    setDraft("");
    setDue("");
  };

  const open = tasks.filter((t) => !t.done).length;

  return (
    <OfficeFrame kind="organizer" editor={editor}>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Görev veya randevu"
            aria-label="Yeni görev"
            className="min-w-40 flex-1 rounded-lg bg-black/20 px-3 py-2 text-sm text-[var(--tb-text)] outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Tarih"
            className="rounded-lg bg-black/20 px-3 py-2 text-sm text-[var(--tb-text)] outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <button
            type="button"
            onClick={add}
            className="wa-press flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[13px] text-emerald-300"
          >
            <Plus className="h-4 w-4" /> Ekle
          </button>
        </div>

        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {tasks.length === 0 && (
            <li className="p-3 text-[13px] text-[var(--tb-muted)]">Henüz kayıt yok.</li>
          )}
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg px-2 py-2"
              style={{ border: "1px solid var(--border)" }}
            >
              <button
                type="button"
                aria-label={t.done ? "Tamamlanmadı işaretle" : "Tamamlandı işaretle"}
                onClick={() => write(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                className={`flex h-6 w-6 items-center justify-center rounded-md ${
                  t.done ? "bg-emerald-500/20 text-emerald-300" : "text-[var(--tb-muted)]"
                }`}
                style={{ border: "1px solid var(--border)" }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <span
                className={`flex-1 text-[13px] ${t.done ? "text-[var(--tb-muted)] line-through" : "text-[var(--tb-text)]"}`}
              >
                {t.text}
              </span>
              {t.due && <span className="text-[11px] text-[var(--tb-muted)]">{t.due}</span>}
              <button
                type="button"
                aria-label="Kaydı sil"
                onClick={() => write(tasks.filter((x) => x.id !== t.id))}
                className="text-[var(--tb-muted)] hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <p className="pt-2 text-[11px] text-[var(--tb-muted)]">
          {open} açık kayıt · paylaşım yalnız eşler arası kanaldan yapılır
        </p>
      </div>
    </OfficeFrame>
  );
}
