/**
 * TERMİNAL KABUK ÇEKİRDEĞİ
 * ------------------------------------------------------------------
 * Komut satırını ayrıştırır, boru hattını (`|`) sırayla yürütür,
 * yönlendirmeyi (`>`, `>>`) şifreli VFS'e yazar; geçmiş, takma adlar,
 * Tab tamamlama ve Türkçe öneri mekanizmasını yönetir.
 *
 * Kabuk saf bir sınıftır: hiçbir React bağımlılığı yoktur, bu yüzden
 * komut davranışları arayüzden bağımsız test edilebilir.
 */

import { listFiles, readDocument, writeDocument, type VfsFolder } from "@/lib/vfs/store";

import { ALIASES, COMMANDS, type Command, type CommandResult, type Line } from "./commands";
import { nullHost, type TerminalHost } from "./host";
import { parse, splitFlags } from "./lexer";
import { ROOT, folderOf, splitTarget } from "./paths";

const HISTORY_LIMIT = 50;
const HISTORY_KEY = "tedbirge.terminal.history";

/** Basit düzenleme uzaklığı — "bunu mu demek istediniz?" önerisi için. */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) (rows[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      (rows[i] as number[])[j] = Math.min(
        (rows[i - 1] as number[])[j] + 1,
        (rows[i] as number[])[j - 1] + 1,
        (rows[i - 1] as number[])[j - 1] + cost,
      );
    }
  }
  return (rows[a.length] as number[])[b.length] as number;
}

export type ShellOptions = {
  host?: TerminalHost;
  onClear?: () => void;
};

export class TerminalShell {
  private cwd = ROOT;
  private env: Record<string, string> = { KABUK: "tedbirge", DIL: "tr-TR" };
  private hist: string[] = [];
  private host: TerminalHost;
  private onClear: () => void;

  constructor(opts: ShellOptions = {}) {
    this.host = opts.host ?? nullHost;
    this.onClear = opts.onClear ?? (() => undefined);
    if (typeof localStorage !== "undefined") {
      try {
        const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
        if (Array.isArray(raw)) this.hist = raw.slice(0, HISTORY_LIMIT).map(String);
      } catch {
        this.hist = [];
      }
    }
  }

  path(): string {
    return this.cwd;
  }

  history(): string[] {
    return [...this.hist];
  }

  private remember(line: string) {
    if (!line.trim()) return;
    this.hist = [line, ...this.hist.filter((h) => h !== line)].slice(0, HISTORY_LIMIT);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.hist));
      } catch {
        /* kota dolu olabilir */
      }
    }
  }

  /** Takma adı komut satırının başına uygular. */
  private expand(input: string): string {
    const [head, ...rest] = input.trim().split(/\s+/);
    if (!head) return input;
    const alias = ALIASES[head];
    return alias ? [alias, ...rest].join(" ") : input;
  }

  private find(name: string): Command | undefined {
    return COMMANDS.find((c) => c.name === name);
  }

  /** Tab tamamlama: ilk sözcükte komut, sonrasında dosya adı önerir. */
  async complete(input: string): Promise<{ value: string; options: string[] }> {
    const parts = input.split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    const first = parts.length <= 1;
    const pool = first
      ? [...COMMANDS.map((c) => c.name), ...Object.keys(ALIASES)]
      : (await listFiles())
          .filter((f) => {
            const folder = folderOf(this.cwd);
            return !folder || f.folder === folder;
          })
          .map((f) => f.name);
    const hits = pool.filter((n) => n.toLowerCase().startsWith(last.toLowerCase())).sort();
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0] as string;
      return { value: parts.join(" "), options: [] };
    }
    return { value: input, options: hits.slice(0, 40) };
  }

  /** Bir komut satırını yürütür ve yazdırılacak satırları döner. */
  async execute(raw: string): Promise<{ lines: Line[]; code: number }> {
    this.remember(raw);
    const input = this.expand(raw);
    if (!input.trim()) return { lines: [], code: 0 };

    let pipeline;
    try {
      pipeline = parse(input);
    } catch (err) {
      return { lines: [{ text: (err as Error).message, tone: "err" }], code: 1 };
    }

    let stdin = "";
    let out: CommandResult = { lines: [], code: 0 };

    for (const stage of pipeline.stages) {
      const [name, ...rest] = stage.argv;
      if (!name) continue;
      const alias = ALIASES[name];
      const argvRaw = alias ? [...alias.split(/\s+/), ...rest] : [name, ...rest];
      const cmd = this.find(argvRaw[0] as string);
      if (!cmd) {
        const near = COMMANDS.map((c) => c.name)
          .map((n) => ({ n, d: distance(n, name) }))
          .sort((a, b) => a.d - b.d)[0];
        const lines: Line[] = [{ text: `bilinmeyen komut: ${name}`, tone: "err" }];
        if (near && near.d <= 2) lines.push({ text: `bunu mu demek istediniz: ${near.n}?`, tone: "warn" });
        lines.push({ text: "komut listesi için: yardim", tone: "dim" });
        return { lines, code: 127 };
      }
      const { args, flags } = splitFlags(argvRaw.slice(1));
      out = await cmd.run({
        argv: argvRaw,
        args,
        flags,
        stdin,
        cwd: this.cwd,
        env: { ...this.env },
        host: this.host,
        setCwd: (p) => {
          this.cwd = p;
        },
        setEnv: (k, v) => {
          this.env[k] = v;
        },
        clear: () => this.onClear(),
        history: () => this.history(),
        aliases: () => ({ ...ALIASES }),
        commandNames: () => COMMANDS.map((c) => c.name),
      });
      stdin = out.lines.map((l) => l.text).join("\n");
      if (out.code !== 0) break;
    }

    if (pipeline.redirect && out.code === 0) {
      const t = splitTarget(this.cwd, pipeline.redirect.target);
      if (!t) return { lines: [{ text: "Geçersiz hedef dosya.", tone: "err" }], code: 1 };
      const folder = (t.folder ?? "Belgeler") as VfsFolder;
      let body = stdin;
      if (pipeline.redirect.mode === ">>") {
        const all = await listFiles();
        const prev = all.find((f) => f.name === t.name && f.folder === folder);
        if (prev) body = `${(await readDocument(prev.id)) ?? ""}\n${stdin}`;
      }
      await writeDocument({ name: t.name, mime: "text/plain", text: body, folder });
      return {
        lines: [{ text: `yazıldı: ${t.name} (${body.length} bayt)`, tone: "ok" }],
        code: 0,
      };
    }

    return out;
  }
}
