/**
 * Derleyici istemcisi: Çift katmanlı derleme desteği (WASM + UI).
 * TSX/UI bileşenlerinde AssemblyScript worker'ını baypas eder;
 * Yalnızca saf AssemblyScript (.ts) modüllerini WASM worker'ına iletir.
 */

export const COMPILE_TIMEOUT_MS = 10_000;
/** Derleyicinin ilk yüklenmesi için ayrı üst sınır. */
export const LOAD_TIMEOUT_MS = 90_000;

export type Problem = {
  file: string;
  line: number;
  col: number;
  severity: "error" | "warning";
  message: string;
};

export type CompileResult =
  | { ok: true; binary: Uint8Array; problems: Problem[]; isUi?: boolean }
  | { ok: false; problems: Problem[]; timeout?: boolean };

/** asc çıktısındaki "ERROR TS1234: mesaj ... in file.ts(3,5)" satırlarını ayrıştırır. */
export function parseDiagnostics(stderr: string, fallbackFile: string): Problem[] {
  const out: Problem[] = [];
  // ANSI renk kaçış dizileri kaldırılır; ESC karakteri bilinçli olarak aranır.
  // eslint-disable-next-line no-control-regex
  const lines = stderr.replace(/\u001b\[[0-9;]*m/g, "").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(ERROR|WARNING)\s+(?:[A-Z]+\d+:\s*)?(.*)$/.exec((lines[i] ?? "").trim());
    if (!m) continue;
    let file = fallbackFile;
    let line = 1;
    let col = 1;
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j += 1) {
      const loc =
        /([\w./-]+\.ts)\((\d+),(\d+)\)/.exec(lines[j] ?? "") ??
        /([\w./-]+\.ts):(\d+):(\d+)/.exec(lines[j] ?? "");
      if (loc) {
        file = loc[1] as string;
        line = Number(loc[2]);
        col = Number(loc[3]);
        break;
      }
    }
    out.push({
      file,
      line,
      col,
      severity: m[1] === "ERROR" ? "error" : "warning",
      message: (m[2] ?? "").trim(),
    });
  }
  return out;
}

type WorkerLike = Pick<Worker, "postMessage" | "terminate"> & {
  onmessage: ((e: MessageEvent) => void) | null;
};

let worker: WorkerLike | null = null;
let seq = 0;

export function createCompilerWorker(): WorkerLike {
  return new Worker(new URL("./compiler.worker.ts", import.meta.url), {
    type: "module",
  }) as WorkerLike;
}

export async function compile(
  files: Record<string, string>,
  entry: string,
  opts: { timeoutMs?: number; loadTimeoutMs?: number; factory?: () => WorkerLike } = {},
): Promise<CompileResult> {
  // 1. ÇİFT KATMANLI DERLEYİCİ AYRIMI (UI / TSX Baypası)
  // Giriş dosyası .tsx / .jsx ise AssemblyScript WASM derleyicisini baypas et.
  const isUi = entry.endsWith(".tsx") || entry.endsWith(".jsx") || entry.endsWith(".html");
  if (isUi) {
    return {
      ok: true,
      binary: new Uint8Array(),
      problems: [],
      isUi: true,
    };
  }

  // 2. Saf AssemblyScript (.ts) WASM Derleme Akışı
  const factory = opts.factory ?? createCompilerWorker;
  worker ??= factory();
  const w = worker;
  const id = ++seq;
  return new Promise<CompileResult>((resolve) => {
    const arm = (ms: number, message: string) =>
      setTimeout(() => {
        w.terminate();
        if (worker === w) worker = null;
        resolve({
          ok: false,
          timeout: true,
          problems: [{ file: entry, line: 1, col: 1, severity: "error", message }],
        });
      }, ms);
    let timer = arm(opts.loadTimeoutMs ?? LOAD_TIMEOUT_MS, "Derleyici yüklenemedi; durduruldu.");
    w.onmessage = (
      e: MessageEvent<{
        id: number;
        ok: boolean;
        phase?: string;
        binary?: Uint8Array;
        stderr: string;
      }>,
    ) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      if (e.data.phase === "compiling") {
        timer = arm(
          opts.timeoutMs ?? COMPILE_TIMEOUT_MS,
          "Derleme 10 sn içinde bitmedi; derleyici durduruldu.",
        );
        return;
      }
      const problems = parseDiagnostics(e.data.stderr, entry);
      if (e.data.ok && e.data.binary) resolve({ ok: true, binary: e.data.binary, problems });
      else
        resolve({
          ok: false,
          problems: problems.length
            ? problems
            : [
                {
                  file: entry,
                  line: 1,
                  col: 1,
                  severity: "error",
                  message: e.data.stderr || "Derleme başarısız",
                },
              ],
        });
    };
    w.postMessage({ id, files, entry });
  });
}

export function __resetCompiler(): void {
  worker?.terminate();
  worker = null;
}
