import { useEffect, useMemo, useState } from "react";

import { SECTIONS } from "./content";

function currentHashId(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const id = window.location.hash.replace("#", "");
  return SECTIONS.some((s) => s.id === id) ? id : fallback;
}

export function App() {
  const [active, setActive] = useState(() => currentHashId(SECTIONS[0]!.id));
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onHash = () => setActive(currentHashId(SECTIONS[0]!.id));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLocaleLowerCase("tr").includes(q) ||
        s.summary.toLocaleLowerCase("tr").includes(q),
    );
  }, [query]);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]!;

  useEffect(() => {
    document.title = `${section.title} — Tedbirge® WebOS Geliştirici Portalı`;
  }, [section.title]);

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Doküman bölümleri">
        <div className="brand">Tedbirge® WebOS</div>
        <div className="brand-sub">Geliştirici ve SDK portalı</div>
        <input
          className="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bölümlerde ara"
          aria-label="Bölümlerde ara"
        />
        <div className="nav">
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={s.id === section.id ? "page" : undefined}
              onClick={() => {
                setActive(s.id);
                window.location.hash = s.id;
                window.scrollTo({ top: 0 });
              }}
            >
              {s.title}
            </button>
          ))}
          {visible.length === 0 && <p className="lead">Eşleşen bölüm yok.</p>}
        </div>
      </nav>

      <main className="content">
        <h1>{section.title}</h1>
        <p className="lead">{section.summary}</p>
        {section.body}
        <p className="footer">
          Satıcı ve lisans veren: Mehmet DİNÇ (Tedbirge® WebOS) ·{" "}
          <a href="https://tedbirge.app" rel="noopener noreferrer">
            tedbirge.app
          </a>
        </p>
      </main>
    </div>
  );
}
