/** Bağımlılıksız emoji seçici — kategoriler, arama, son kullanılanlar. */

import { useMemo, useState } from "react";

export const EMOJI_CATEGORIES: Record<string, Array<[string, string]>> = {
  "Yüzler": [["😀", "gülümseme"], ["😂", "kahkaha"], ["😊", "mutlu"], ["😍", "aşk"], ["🤔", "düşünce"], ["😢", "üzgün"], ["😡", "kızgın"], ["😎", "havalı"], ["😴", "uykulu"], ["🥳", "kutlama"], ["😅", "terleme"], ["🙃", "ters"]],
  "Eller": [["👍", "onay beğen"], ["👎", "ret"], ["👏", "alkış"], ["🙏", "rica teşekkür"], ["👋", "selam"], ["✌️", "zafer"], ["🤝", "anlaşma"], ["💪", "güç"]],
  "Semboller": [["❤️", "kalp"], ["🔥", "ateş"], ["✅", "tamam"], ["❌", "hata"], ["⚠️", "uyarı"], ["⭐", "yıldız"], ["💯", "yüz"], ["🎉", "parti"]],
  "Nesneler": [["📍", "konum"], ["📞", "telefon"], ["📷", "kamera"], ["💡", "fikir"], ["🔒", "kilit"], ["📎", "ek"], ["⏰", "saat"], ["🚨", "acil"]],
};

const RECENT_KEY = "tedbirge.emoji.recent";

export function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
}

export function pushRecent(list: string[], e: string): string[] {
  return [e, ...list.filter((x) => x !== e)].slice(0, 16);
}

export function searchEmoji(q: string): string[] {
  const n = q.trim().toLocaleLowerCase("tr");
  const all = Object.values(EMOJI_CATEGORIES).flat();
  return (n ? all.filter(([, k]) => k.includes(n)) : all).map(([e]) => e);
}

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  const results = useMemo(() => (q ? searchEmoji(q) : null), [q]);

  const pick = (e: string) => {
    const next = pushRecent(recent, e);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* depolama dolu */
    }
    onPick(e);
  };

  const grid = (list: string[]) => (
    <div className="grid grid-cols-8 gap-0.5">
      {list.map((e) => (
        <button
          key={e}
          type="button"
          // Yazma alanının odağı kaybolmasın diye fare basışı engellenir.
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => pick(e)}
          aria-label={`Emoji ${e}`}
          className="rounded-md py-1 text-lg hover:bg-[color-mix(in_srgb,var(--tb-text)_8%,transparent)]"
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label="Emoji seçici"
      className="absolute bottom-14 left-2 z-20 w-72 rounded-xl p-2 shadow-xl"
      style={{ background: "var(--tb-panel-solid)", border: "1px solid var(--tb-border)" }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Emoji ara…"
        aria-label="Emoji ara"
        className="mb-2 w-full rounded-md bg-transparent px-2 py-1 text-[12px] text-[var(--tb-text)] outline-none"
        style={{ border: "1px solid var(--tb-border)" }}
      />
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {results ? (
          results.length ? grid(results) : <p className="p-2 text-[12px] text-[var(--tb-muted)]">Sonuç yok</p>
        ) : (
          <>
            {recent.length ? (
              <section>
                <h4 className="px-1 text-[10px] uppercase text-[var(--tb-muted)]">Son kullanılanlar</h4>
                {grid(recent)}
              </section>
            ) : null}
            {Object.entries(EMOJI_CATEGORIES).map(([name, list]) => (
              <section key={name}>
                <h4 className="px-1 text-[10px] uppercase text-[var(--tb-muted)]">{name}</h4>
                {grid(list.map(([e]) => e))}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
