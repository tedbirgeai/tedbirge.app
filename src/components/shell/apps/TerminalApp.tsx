/**
 * TEDBIRGE TERMINAL — yerel kabuk konsolu
 * ------------------------------------------------------------------
 * Şifreli VFS katmanı üzerinde çalışan çevrimdışı komut satırı.
 * Hiçbir komut ağa çıkmaz; tüm işlemler cihazda yürür.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { deleteFile, listFiles, readDocument, saveFiles, storageUsage } from "@/lib/vfs/store";

const BANNER = [
  "Tedbirge(R) WebOS - yerel kabuk",
  "Komutlar icin: yardim",
];

export function TerminalApp() {
  const [lines, setLines] = useState<string[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const print = useCallback((...out: string[]) => setLines((l) => [...l, ...out]), []);

  const run = useCallback(
    async (raw: string) => {
      const [cmd, ...args] = raw.trim().split(/\s+/);
      if (!cmd) return;
      switch (cmd) {
        case "yardim":
        case "help":
          print(
            "yardim            bu listeyi gosterir",
            "ls                belgeleri listeler",
            "cat <ad>          belge icerigini yazar",
            "rm <ad>           belgeyi siler",
            "mkdir <ad>        klasor olusturur",
            "depo              depolama kullanimini gosterir",
            "tarih             sistem saatini yazar",
            "temizle           ekrani temizler",
          );
          break;
        case "ls": {
          const files = await listFiles();
          print(
            ...(files.length
              ? files.map((f) => `${f.name.padEnd(34)} ${String(f.size).padStart(9)} B`)
              : ["(bos)"]),
          );
          break;
        }
        case "cat": {
          const files = await listFiles();
          const target = files.find((f) => f.name === args.join(" "));
          if (!target) {
            print("bulunamadi");
            break;
          }
          const body = await readDocument(target.id);
          print(...(body ?? "(bos)").split("\n").slice(0, 200));
          break;
        }
        case "rm": {
          const files = await listFiles();
          const target = files.find((f) => f.name === args.join(" "));
          if (!target) {
            print("bulunamadi");
            break;
          }
          await deleteFile(target.id);
          print(`silindi: ${target.name}`);
          break;
        }
        case "mkdir": {
          const name = args.join(" ") || "Yeni klasor";
          await saveFiles([
            new File([""], `${name}.klasor`, { type: "application/x-tedbirge-folder" }),
          ]);
          print(`olusturuldu: ${name}`);
          break;
        }
        case "depo": {
          const u = await storageUsage();
          print(
            `dosya: ${u.files}`,
            `kullanim: ${(u.bytes / 1048576).toFixed(1)} MB`,
            `kota: ${u.quota ? `${(u.quota / 1048576).toFixed(0)} MB` : "bilinmiyor"}`,
          );
          break;
        }
        case "tarih":
          print(new Date().toLocaleString("tr-TR"));
          break;
        case "temizle":
        case "clear":
          setLines([]);
          break;
        default:
          print(`bilinmeyen komut: ${cmd}`);
      }
    },
    [print],
  );

  return (
    <button
      type="button"
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
      className="flex min-h-0 flex-1 cursor-text flex-col p-3 text-left font-osmono text-[12.5px] leading-6 text-[var(--tb-text)]"
      style={{ background: "color-mix(in srgb, var(--tb-bg) 88%, black)" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="text-[var(--tb-accent)]">tedbirge:~$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const line = input;
              setLines((l) => [...l, `tedbirge:~$ ${line}`]);
              setHistory((h) => [line, ...h]);
              setCursor(-1);
              setInput("");
              void run(line);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(history.length - 1, cursor + 1);
              setCursor(next);
              setInput(history[next] ?? "");
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = Math.max(-1, cursor - 1);
              setCursor(next);
              setInput(next < 0 ? "" : (history[next] ?? ""));
            }
          }}
          aria-label="Komut satırı"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </div>
    </button>
  );
}
