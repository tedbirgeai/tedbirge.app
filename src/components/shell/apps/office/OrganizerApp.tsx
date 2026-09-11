/**
 * TEDBIRGE ORGANIZER — takvim ve görev panosu
 * ------------------------------------------------------------------
 * Aylık/haftalık/günlük takvim matrisi ile Kanban panosu tek belgede
 * durur. Tarihi olan kartlar takvimde de görünür. Kayıtlar şifreli VFS
 * katmanındadır; paylaşım yalnız eşler arası kanaldan yapılır.
 */

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Columns3, Plus, Trash2 } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";

type Column = "yapilacak" | "devam" | "tamam";
type Card = { id: string; title: string; column: Column; due: string };
type Agenda = { v: 2; cards: Card[] };

const COLUMNS: Array<{ id: Column; label: string }> = [
  { id: "yapilacak", label: "Yapılacaklar" },
  { id: "devam", label: "Devam Edenler" },
  { id: "tamam", label: "Tamamlananlar" },
];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function parseAgenda(text: string): Agenda {
  try {
    const data = JSON.parse(text) as
      | Agenda
      | Array<{ text?: string; due?: string; done?: boolean }>;
    if (Array.isArray(data))
      return {
        v: 2,
        cards: data.map((t) => ({
          id: uid(),
          title: t.text ?? "",
          due: t.due ?? "",
          column: t.done ? "tamam" : "yapilacak",
        })),
      };
    if (Array.isArray(data?.cards)) return { v: 2, cards: data.cards };
  } catch {
    /* bozuk belge: boş ajanda */
  }
  return { v: 2, cards: [] };
}

type View = "ay" | "hafta" | "gun" | "pano";

export function OrganizerApp() {
  const editor = useOfficeEditor("organizer");
  const agenda = useMemo(() => parseAgenda(editor.text), [editor.text]);
  const [view, setView] = useState<View>("ay");
  const [cursor, setCursor] = useState(() => new Date());
  const [drag, setDrag] = useState<string | null>(null);

  const write = useCallback(
    (cards: Card[]) => editor.setText(JSON.stringify({ v: 2, cards })),
    [editor],
  );

  const addCard = (column: Column, due = "") => {
    const title = window.prompt("Kart başlığı");
    if (!title) return;
    write([...agenda.cards, { id: uid(), title, column, due }]);
  };

  const cardsOn = (day: string) => agenda.cards.filter((c) => c.due === day);

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const shift = (n: number) => {
    const d = new Date(cursor);
    if (view === "ay") d.setMonth(d.getMonth() + n);
    else if (view === "hafta") d.setDate(d.getDate() + 7 * n);
    else d.setDate(d.getDate() + n);
    setCursor(d);
  };

  const tabs = [
    {
      id: "giris",
      label: "Giriş",
      content: (
        <>
          <RibbonGroup label="Görünüm">
            <ToolButton
              onClick={() => setView("ay")}
              label="Aylık"
              active={view === "ay"}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <ToolButton
              onClick={() => setView("hafta")}
              label="Haftalık"
              active={view === "hafta"}
            />
            <ToolButton onClick={() => setView("gun")} label="Günlük" active={view === "gun"} />
            <ToolButton
              onClick={() => setView("pano")}
              label="Pano"
              active={view === "pano"}
              icon={<Columns3 className="h-4 w-4" />}
            />
          </RibbonGroup>
          <RibbonGroup label="Zaman">
            <ToolButton onClick={() => shift(-1)} label="Önceki" />
            <ToolButton onClick={() => setCursor(new Date())} label="Bugün" />
            <ToolButton onClick={() => shift(1)} label="Sonraki" />
          </RibbonGroup>
          <RibbonGroup label="Kayıt">
            <ToolButton
              onClick={() => addCard("yapilacak", iso(cursor))}
              icon={<Plus className="h-4 w-4" />}
              label="Kart ekle"
            />
          </RibbonGroup>
        </>
      ),
    },
  ];

  const dayCell = (d: Date, tall: boolean) => {
    const key = iso(d);
    const inMonth = d.getMonth() === cursor.getMonth();
    return (
      <div
        key={key}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (!drag) return;
          write(agenda.cards.map((c) => (c.id === drag ? { ...c, due: key } : c)));
          setDrag(null);
        }}
        className={`min-h-0 overflow-hidden rounded-lg p-1.5 ${tall ? "min-h-32" : "min-h-20"}`}
        style={{
          border: "1px solid var(--border)",
          background:
            key === iso(new Date())
              ? "color-mix(in srgb, var(--tb-accent) 14%, transparent)"
              : "transparent",
          opacity: inMonth || view !== "ay" ? 1 : 0.45,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-osmono text-[11px] text-[var(--tb-muted)]">{d.getDate()}</span>
          <button
            type="button"
            aria-label={`${key} için kart ekle`}
            onClick={() => addCard("yapilacak", key)}
            className="text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-1 space-y-1">
          {cardsOn(key).map((c) => (
            <span
              key={c.id}
              draggable
              onDragStart={() => setDrag(c.id)}
              className="block truncate rounded-md px-1.5 py-0.5 text-[11px] text-[var(--tb-text)]"
              style={{ background: "color-mix(in srgb, var(--tb-accent) 22%, transparent)" }}
            >
              {c.title}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <OfficeShell
      kind="organizer"
      editor={editor}
      tabs={tabs}
      sidebar={false}
      status={<span>{agenda.cards.filter((c) => c.column !== "tamam").length} açık kart</span>}
    >
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <h2 className="mb-2 text-[15px] font-semibold text-[var(--tb-text)]">
          {view === "pano"
            ? "Görev Panosu"
            : cursor.toLocaleDateString("tr-TR", {
                month: "long",
                year: "numeric",
                ...(view === "gun" ? { day: "numeric" } : {}),
              })}
        </h2>

        {view === "ay" ? (
          <div className="grid grid-cols-7 gap-1.5">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
              <span
                key={d}
                className="px-1 font-osmono text-[10px] text-[var(--tb-muted)] uppercase"
              >
                {d}
              </span>
            ))}
            {monthDays.map((d) => dayCell(d, false))}
          </div>
        ) : null}

        {view === "hafta" ? (
          <div className="grid grid-cols-7 gap-1.5">{weekDays.map((d) => dayCell(d, true))}</div>
        ) : null}

        {view === "gun" ? <div className="max-w-xl">{dayCell(cursor, true)}</div> : null}

        {view === "pano" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!drag) return;
                  write(agenda.cards.map((c) => (c.id === drag ? { ...c, column: col.id } : c)));
                  setDrag(null);
                }}
                className="rounded-xl p-2"
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-osmono text-[11px] tracking-wide text-[var(--tb-muted)] uppercase">
                    {col.label}
                  </span>
                  <button
                    type="button"
                    aria-label={`${col.label} sütununa kart ekle`}
                    onClick={() => addCard(col.id)}
                    className="text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {agenda.cards
                    .filter((c) => c.column === col.id)
                    .map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDrag(c.id)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                        style={{
                          border: "1px solid var(--border)",
                          background: "color-mix(in srgb, var(--tb-text) 5%, transparent)",
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--tb-text)]">
                          {c.title}
                        </span>
                        {c.due ? (
                          <span className="font-osmono text-[10px] text-[var(--tb-muted)]">
                            {c.due}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label="Kartı sil"
                          onClick={() => write(agenda.cards.filter((x) => x.id !== c.id))}
                          className="text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </OfficeShell>
  );
}
