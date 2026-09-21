/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM KOMUT ÇUBUĞU
 * ------------------------------------------------------------------
 * Girdi çekirdek daemon'ına gönderilir; dil tanıma, yapı ağacı ve
 * değişmez eşleşmesi döner. Simgesel doğrulama motoru bağlı değildir;
 * bu yüzden hiçbir yerde "kanıtlandı" denmez.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  busy: boolean;
  onSubmit: (text: string) => void;
};

const ORNEKLER = [
  "Kapalı sistemde enerji korunur.",
  "Bu makine yoktan enerji üretir ve verimi %100 olur.",
  "fn main() { let mut x = 1; }",
  "Sınırsız bant genişliği sağlıyoruz.",
];

export function CommandBar({ busy, onSubmit }: Props) {
  const [text, setText] = useState("");

  const gonder = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSubmit(value);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            gonder();
          }
        }}
        rows={3}
        spellCheck={false}
        placeholder="Önerme, formül ya da kod parçası yazın… (Ctrl/Cmd + Enter)"
        className="resize-none border-[var(--tb-border)] bg-[var(--tb-panel)] font-osmono text-[12px]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={gonder} disabled={busy || !text.trim()}>
          {busy ? "Çözümleniyor…" : "Çözümle"}
        </Button>
        {ORNEKLER.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setText(o)}
            className="truncate rounded-md border border-[var(--tb-border)] px-2 py-1 font-osmono text-[10px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
