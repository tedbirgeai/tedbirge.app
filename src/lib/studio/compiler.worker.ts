/// <reference lib="webworker" />
/**
 * AssemblyScript derleyici işçisi — tamamen cihazda, ağ yok.
 */
type Asc = typeof import("assemblyscript/asc").default;
let asc: Asc | null = null;

type Req = { id: number; files: Record<string, string>; entry: string };

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, files, entry } = e.data;
  try {
    if (!asc) asc = (await import("assemblyscript/asc")).default;
    // Derleyici yüklendi: süre sınırı yalnız derleme için başlar.
    (self as unknown as Worker).postMessage({ id, phase: "compiling" });
    const sources: Record<string, string> = {};
    for (const [k, v] of Object.entries(files)) sources[k] = v;
    const r = await asc.compileString({ [entry]: sources[entry] ?? "" }, {
      optimizeLevel: 2,
      runtime: "stub",
      use: ["abort="],
    } as never);
    const stderr = String(r.stderr ?? "");
    const binary = r.binary as Uint8Array | undefined;
    if (r.error || !binary) {
      (self as unknown as Worker).postMessage({
        id,
        ok: false,
        stderr: stderr || String(r.error?.message ?? "Derleme başarısız"),
      });
      return;
    }
    (self as unknown as Worker).postMessage({ id, ok: true, binary, stderr }, [binary.buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      stderr: err instanceof Error ? err.message : "Derleyici hatası",
    });
  }
};
