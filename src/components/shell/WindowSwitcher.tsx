/**
 * KISAYOL KATMANI + PENCERE GEÇİŞ OVERLAY'İ
 * ------------------------------------------------------------------
 * Alt + Tab görsel geçiş, Super + Ok pencere hizalama, Super + D
 * masaüstünü göster ve Ctrl + Z geri alma tek yerde toplanır.
 * Klavye dinleyicisi kabukta tek örnektir.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { announce } from "@/lib/shell/announce";
import { notify, notifyOk } from "@/lib/shell/notify";
import { keyboardSnapBox } from "@/lib/shell/shortcuts";
import { popUndo, pushUndo } from "@/lib/shell/undo-stack";
import {
  activeWindow,
  focusWindow,
  getWindows,
  minimizeAll,
  placeWindow,
  restoreMany,
  restoreWindow,
  toggleMaximize,
  useWindows,
} from "@/shell/windows";

export function WindowSwitcher({ surface }: { surface: { current: HTMLElement | null } }) {
  const windows = useWindows();
  const [switcher, setSwitcher] = useState<{ ids: string[]; index: number } | null>(null);
  const hidden = useRef<string[]>([]);

  const area = useCallback(() => {
    const el = surface.current;
    if (!el) return { width: 1280, height: 800 };
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }, [surface]);

  const snap = useCallback(
    (half: "left" | "right" | "full") => {
      const win = activeWindow();
      if (!win) return;
      if (half === "full") {
        if (!win.maximized) toggleMaximize(win.id);
        announce(`${win.title} tam ekran yapıldı`);
        return;
      }
      const box = keyboardSnapBox(half, area());
      placeWindow(win.id, box.x, box.y, box.w, box.h);
      announce(`${win.title} ${half === "left" ? "sola" : "sağa"} yaslandı`);
    },
    [area],
  );

  const showDesktop = useCallback(() => {
    if (hidden.current.length) {
      restoreMany(hidden.current);
      announce("Pencereler geri getirildi");
      hidden.current = [];
      return;
    }
    const ids = minimizeAll();
    hidden.current = ids;
    if (ids.length) announce("Masaüstü gösteriliyor");
  }, []);

  const undo = useCallback(() => {
    const entry = popUndo();
    if (!entry) {
      notify("Geri alınacak işlem yok");
      return;
    }
    void Promise.resolve(entry.undo())
      .then(() => {
        notifyOk("Geri alındı", entry.label);
        announce(`Geri alındı: ${entry.label}`);
      })
      .catch(() => notify("Geri alınamadı", entry.label));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Alt + Tab: görsel geçiş.
      if (e.altKey && e.key === "Tab") {
        const list = getWindows();
        if (list.length < 2) return;
        e.preventDefault();
        const ordered = [...list].sort((a, b) => b.z - a.z).map((w) => w.id);
        setSwitcher((prev) => {
          if (!prev) return { ids: ordered, index: 1 % ordered.length };
          const step = e.shiftKey ? -1 : 1;
          const next = (prev.index + step + prev.ids.length) % prev.ids.length;
          return { ...prev, index: next };
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "z") {
        const target = e.target as HTMLElement | null;
        const editable =
          target &&
          (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (editable) return;
        e.preventDefault();
        undo();
        return;
      }
      // Super (Meta) tabanlı pencere hizalama — Ctrl basılıyken devre dışı.
      if (e.metaKey && !e.ctrlKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          snap("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          snap("right");
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          snap("full");
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          showDesktop();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Alt") return;
      setSwitcher((prev) => {
        if (prev) {
          const id = prev.ids[prev.index];
          if (id) {
            restoreWindow(id);
            focusWindow(id);
            const win = getWindows().find((w) => w.id === id);
            if (win) announce(`${win.title} penceresine geçildi`);
          }
        }
        return null;
      });
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [snap, showDesktop, undo]);

  if (!switcher) return null;
  const items = switcher.ids
    .map((id) => windows.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));
  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[130] grid place-items-center"
      role="dialog"
      aria-label="Pencere geçişi"
    >
      <ul className="flex max-w-[92vw] flex-wrap justify-center gap-2 rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel)]/95 p-3 shadow-2xl">
        {items.map((w, i) => (
          <li
            key={w.id}
            aria-current={i === switcher.index}
            className={`min-h-12 min-w-[140px] rounded-xl px-3 py-2 text-left font-osmono text-[12px] ${
              i === switcher.index
                ? "bg-[var(--tb-accent)] text-[var(--tb-bg)]"
                : "text-[var(--tb-muted)]"
            }`}
          >
            <span className="block truncate">{w.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pencere kapatmayı geri alınabilir kılmak için ortak yardımcı. */
export function rememberClosedWindow(win: { id: string; title: string }, restore: () => void) {
  pushUndo({ label: `${win.title} kapatıldı`, undo: restore });
}
