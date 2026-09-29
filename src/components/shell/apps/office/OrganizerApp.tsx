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
export type Priority = "dusuk" | "orta" | "yuksek" | "kritik";
type Card = { id: string; title: string; column: Column; due: string; priority: Priority; note: string };

export const PRIORITIES: Array<{ id: Priority; label: string; color: string }> = [
  { id: "dusuk", label: "Düşük", color: "var(--tb-brand-google-green)" },
  { id: "orta", label: "Orta", color: "var(--tb-accent)" },
  { id: "yuksek", label: "Yüksek", color: "var(--tb-brand-google-yellow)" },
  { id: "kritik", label: "Kritik", color: "var(--tb-brand-google-red)" },
];
const prioColor = (p: Priority) => PRIORITIES.find((x) => x.id === p)?.color ?? "var(--tb-accent)";
type Agenda = { v: 2; cards: Card[] };

const COLUMNS: Array<{ id: Column; label: string }> = [
  { id: "yapilacak", label: "Yapılacaklar" },
  { id: "devam", label: "Devam Edenler" },
  { id: "tamam", label: "Tamamlananlar" },
];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function parseAgenda(text: string): Agenda {
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
          priority: "orta" as Priority,
          note: "",
        })),
      };
    if (Array.isArray(data?.cards))
      return {
        v: 2,
        cards: data.cards.map((c) => ({ ...c, priority: c.priority ?? "orta", note: c.note ?? "" })),
      };
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

  const [modal, setModal] = useState<Card | null>(null);
  const addCard = (column: Column, due = "") =>
    setModal({ id: "", title: "", column, due, priority: "orta", note: "" });
  const saveModal = () => {
    if (!modal || !modal.title.trim()) return;
    const card = { ...modal, title: modal.title.trim() };
    write(
      card.id
        ? agenda.cards.map((c) => (c.id === card.id ? card : c))
        : [...agenda.cards, { ...card, id: uid() }],
    );
    setModal(null);
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
              onClick={() => setModal(c)}
              className="block cursor-pointer truncate rounded-md px-1.5 py-0.5 text-[11px] text-[var(--tb-text)]"
              style={{
                background: `color-mix(in srgb, ${prioColor(c.priority)} 22%, transparent)`,
                borderLeft: `3px solid ${prioColor(c.priority)}`,
              }}
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
      <div className="relative min-h-0 flex-1 overflow-auto p-3">
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
                        <button
                          type="button"
                          onClick={() => setModal(c)}
                          className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--tb-text)]"
                        >
                          {c.title}
                        </button>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[var(--tb-text)]"
                          style={{ background: `color-mix(in srgb, ${prioColor(c.priority)} 30%, transparent)` }}
                        >
                          {PRIORITIES.find((p) => p.id === c.priority)?.label}
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

      {modal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--tb-bg)_60%,transparent)] p-4"
          onPointerDown={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label={modal.id ? "Kartı düzenle" : "Yeni kart"}
            onSubmit={(e) => {
              e.preventDefault();
              saveModal();
            }}
            onKeyDown={(e) => e.key === "Escape" && setModal(null)}
            className="w-full max-w-md space-y-3 rounded-2xl bg-[var(--tb-panel-solid)] p-4 text-[13px] text-[var(--tb-text)] shadow-2xl"
            style={{ border: "1px solid var(--border)" }}
          >
            <h3 className="text-[15px] font-semibold">{modal.id ? "Kartı düzenle" : "Yeni kart"}</h3>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--tb-muted)]">Başlık</span>
              <input
                autoFocus
                required
                value={modal.title}
                onChange={(e) => setModal({ ...modal, title: e.target.value })}
                className="w-full rounded-lg bg-transparent px-2 py-1.5 outline-none"
                style={{ border: "1px solid var(--border)" }}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--tb-muted)]">Tarih</span>
                <input
                  type="date"
                  value={modal.due}
                  onChange={(e) => setModal({ ...modal, due: e.target.value })}
                  className="w-full rounded-lg bg-transparent px-2 py-1.5 outline-none"
                  style={{ border: "1px solid var(--border)" }}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--tb-muted)]">Sütun</span>
                <select
                  value={modal.column}
                  onChange={(e) => setModal({ ...modal, column: e.target.value as Column })}
                  className="w-full rounded-lg bg-[var(--tb-panel-solid)] px-2 py-1.5 outline-none"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[var(--tb-muted)]">Öncelik</span>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={modal.priority === p.id}
                    onClick={() => setModal({ ...modal, priority: p.id })}
                    className="flex-1 rounded-lg px-2 py-1 text-[12px]"
                    style={{
                      border: `1px solid ${modal.priority === p.id ? p.color : "var(--border)"}`,
                      background: modal.priority === p.id ? `color-mix(in srgb, ${p.color} 25%, transparent)` : "transparent",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--tb-muted)]">Not</span>
              <textarea
                rows={3}
                value={modal.note}
                onChange={(e) => setModal({ ...modal, note: e.target.value })}
                className="w-full resize-none rounded-lg bg-transparent px-2 py-1.5 outline-none"
                style={{ border: "1px solid var(--border)" }}
              />
            </label>
            <div className="flex justify-end gap-2">
              {modal.id ? (
                <button
                  type="button"
                  onClick={() => {
                    write(agenda.cards.filter((c) => c.id !== modal.id));
                    setModal(null);
                  }}
                  className="mr-auto rounded-lg px-3 py-1.5 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                >
                  Sil
                </button>
              ) : null}
              <button type="button" onClick={() => setModal(null)} className="rounded-lg px-3 py-1.5 text-[var(--tb-muted)]">
                Vazgeç
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--tb-accent)] px-3 py-1.5 font-medium text-[var(--tb-bg)]"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </OfficeShell>
  );
}
