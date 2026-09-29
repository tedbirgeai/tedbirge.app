/**
 * AXIOMSTUDIO — /repo projelerini düzenler, cihazda derler, .tbapp üretir ve kurar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Eye,
  FilePlus2,
  Hammer,
  Package,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EditorPane, type EditorHandle } from "@/components/shell/apps/studio/EditorPane";
import { ghostBtn, inputClass, primaryBtn } from "@/components/shell/apps/portal/ui";
import { listRepo, projectsOf, readRepo, writeRepo } from "@/lib/studio/repo-fs";
import {
  HOST_GUIDE,
  TEMPLATES,
  extractClaims,
  parseStudioManifest,
  seedStudioProject,
  templateFiles,
  type TemplateId,
} from "@/lib/studio/project";
import { compile, type Problem } from "@/lib/studio/compiler";
import { deviceSigner, packageProject } from "@/lib/studio/packager";
import { instantiateTbApp, installTbAppWithConsent } from "@/apps/tbapp";
import { TRUST_LABELS } from "@/apps/package";
import { PromptStudio } from "@/components/shell/apps/studio/PromptStudio";

const PICKER_KEY = "tb.studio.picker.seen";

type Tab = "cikti" | "sorunlar" | "axiom";

export function StudioApp() {
  const [paths, setPaths] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("cikti");
  const [out, setOut] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [axiom, setAxiom] = useState<Array<{ claim: string; verdict: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [tpl, setTpl] = useState<TemplateId>("widget");
  const [picker, setPicker] = useState(false);
  const [pickName, setPickName] = useState("");
  const [pickTpl, setPickTpl] = useState<TemplateId>("widget");
  const [side, setSide] = useState<"onizleme" | "rehber">("onizleme");
  const [mode, setMode] = useState<"uretici" | "kod">("uretici");
  const [preview, setPreview] = useState<string[]>([]);
  const [wasm, setWasm] = useState<{ project: string; bytes: Uint8Array } | null>(null);
  const editor = useRef<EditorHandle | null>(null);

  const print = (line: string) =>
    setOut((o) => [...o.slice(-499), `${new Date().toLocaleTimeString("tr-TR")}  ${line}`]);

  const refresh = useCallback(async () => {
    let list = await listRepo();
    if (!projectsOf(list).includes("axiom-studio")) {
      for (const f of seedStudioProject()) await writeRepo(f.path, f.text);
      list = await listRepo();
    }
    setPaths(list);
    return list;
  }, []);

  useEffect(() => {
    try {
      if (!localStorage.getItem(PICKER_KEY)) setPicker(true);
    } catch {
      /* depolama kapalı */
    }
    void refresh().then((list) => {
      const first = list.find((p) => p.endsWith("assembly/index.ts"));
      if (first) void openFile(first);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const project = open?.split("/")[0] ?? null;
  const projects = useMemo(() => projectsOf(paths), [paths]);

  async function openFile(p: string) {
    if (
      dirty &&
      open &&
      !window.confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?")
    )
      return;
    setText((await readRepo(p)) ?? "");
    setOpen(p);
    setDirty(false);
  }

  async function save() {
    if (!open) return;
    try {
      await writeRepo(open, text);
      setDirty(false);
      print(`Kaydedildi: /repo/${open}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
    }
  }

  async function create(name = newName, template = tpl): Promise<boolean> {
    const slug = name.trim().toLowerCase();
    try {
      for (const f of templateFiles(slug, name.trim(), template)) await writeRepo(f.path, f.text);
      setNewName("");
      await refresh();
      await openFile(`${slug}/assembly/index.ts`);
      print(`Proje oluşturuldu: /repo/${slug}`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Proje oluşturulamadı");
      return false;
    }
  }

  async function loadManifest(p: string) {
    const raw = await readRepo(`${p}/tbapp.json`);
    if (!raw) throw new Error("tbapp.json bulunamadı.");
    return parseStudioManifest(raw);
  }

  async function build(): Promise<Uint8Array | null> {
    if (!project) return null;
    if (dirty) await save();
    setBusy("derle");
    try {
      const m = await loadManifest(project);
      const src = (await readRepo(`${project}/${m.entry}`)) ?? "";
      print("Derleniyor… (ilk derlemede derleyici yüklenir)");
      const t = performance.now();
      const r = await compile({ [m.entry]: src }, m.entry);
      setProblems(r.problems.map((p) => ({ ...p, file: `${project}/${m.entry}` })));
      if (!r.ok) {
        setTab("sorunlar");
        print(
          r.timeout
            ? "Derleme süre sınırını aştı."
            : `Derleme başarısız (${r.problems.length} sorun).`,
        );
        return null;
      }
      print(`Derlendi: ${r.binary.length} bayt, ${Math.round(performance.now() - t)} ms`);
      setWasm({ project, bytes: r.binary });
      return r.binary;
    } catch (e) {
      print(e instanceof Error ? e.message : "Derleme hatası");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    const bytes = wasm?.project === project ? wasm.bytes : await build();
    if (!bytes || !project) return;
    try {
      const m = await loadManifest(project);
      const { pkg } = await packageProject(m, bytes, async (x) => x);
      setPreview([]);
      setSide("onizleme");
      const inst = await instantiateTbApp(pkg, m.capabilities, (line) => {
        print(`[${m.name}] ${line}`);
        setPreview((p) => [...p.slice(-199), line]);
      });
      const start = inst.exports["start"];
      if (typeof start === "function") (start as () => void)();
      else print("Pakette start() dışa aktarımı yok.");
      inst.dispose();
      setTab("cikti");
    } catch (e) {
      print(`Çalıştırma hatası: ${e instanceof Error ? e.message : "bilinmiyor"}`);
    }
  }

  async function install() {
    const bytes = wasm?.project === project ? wasm.bytes : await build();
    if (!bytes || !project) return;
    setBusy("kur");
    try {
      const m = await loadManifest(project);
      const { pkg, trust, text: pkgText } = await packageProject(m, bytes, await deviceSigner());
      await writeRepo(`${project}/dist/${m.id}-${m.version}.tbapp`, pkgText);
      await installTbAppWithConsent(pkg, () =>
        window.confirm("Bu paket yerel geliştirici anahtarınızla imzalandı. Kurulsun mu?"),
      );
      await refresh();
      print(
        `Kuruldu: ${m.name} ${m.version} — ${TRUST_LABELS[trust.level].title} (yerel geliştirici)`,
      );
      toast.success(`${m.name} masaüstüne kuruldu`);
    } catch (e) {
      print(`Kurulum hatası: ${e instanceof Error ? e.message : "bilinmiyor"}`);
    } finally {
      setBusy(null);
    }
  }

  async function checkClaims() {
    const sel = editor.current?.selection().trim();
    const claims = sel ? [sel] : extractClaims(text);
    setTab("axiom");
    if (!claims.length) {
      setAxiom([{ claim: "—", verdict: "Seçili metin ya da // @claim satırı yok." }]);
      return;
    }
    const { localVerify } = await import("@/lib/axiom/local-kernel");
    const rows = [];
    for (const c of claims.slice(0, 10)) {
      const { result } = await localVerify(c);
      rows.push({ claim: c, verdict: String(result.verdict) });
    }
    setAxiom(rows);
  }

  function closePicker() {
    setPicker(false);
    try {
      localStorage.setItem(PICKER_KEY, "1");
    } catch {
      /* depolama kapalı */
    }
  }

  const btn = `${ghostBtn} inline-flex items-center gap-1.5`;

  const modeTabs = (
    <div className="ml-auto flex gap-1 text-[11px]" role="tablist" aria-label="Stüdyo kipi">
      {(
        [
          ["uretici", "Üretici"],
          ["kod", "Kod"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          onClick={() => setMode(id)}
          className={`rounded px-2 py-0.5 ${mode === id ? "bg-[var(--tb-accent)]/15 text-[var(--tb-text)]" : "text-[var(--tb-muted)]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (mode === "uretici") {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-[var(--tb-bg)] text-[var(--tb-text)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--tb-border)] px-3 py-2">
          <strong className="mr-2 text-sm">AxiomStudio</strong>
          <span className="inline-flex items-center gap-1.5 font-osmono text-[11px] text-[var(--tb-muted)]">
            <Sparkles className="h-3.5 w-3.5" /> Doğal dille uygulama üretimi
          </span>
          {modeTabs}
        </div>
        <PromptStudio
          onOpenFile={(p) => {
            setMode("kod");
            void refresh().then(() => void openFile(p));
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--tb-bg)] text-[var(--tb-text)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--tb-border)] px-3 py-2">
        <strong className="mr-2 text-sm">AxiomStudio</strong>
        <button
          type="button"
          className={btn}
          onClick={() => void save()}
          disabled={!open || !dirty}
        >
          <Save className="h-3.5 w-3.5" /> Kaydet
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void build()}
          disabled={!project || !!busy}
        >
          <Hammer className="h-3.5 w-3.5" /> {busy === "derle" ? "Derleniyor…" : "Derle"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void run()}
          disabled={!project || !!busy}
        >
          <Play className="h-3.5 w-3.5" /> Çalıştır
        </button>
        <button
          type="button"
          className={`${primaryBtn} inline-flex items-center gap-1.5`}
          onClick={() => void install()}
          disabled={!project || !!busy}
        >
          <Package className="h-3.5 w-3.5" /> Kur
        </button>
        <button type="button" className={btn} onClick={() => setPicker(true)}>
          <FilePlus2 className="h-3.5 w-3.5" /> Yeni proje
        </button>
        <button type="button" className={btn} onClick={() => void checkClaims()} disabled={!open}>
          <ShieldCheck className="h-3.5 w-3.5" /> AXIOM
        </button>
        {modeTabs}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_260px]">
        <aside
          className="min-h-0 overflow-auto border-r border-[var(--tb-border)] p-2 text-[12px]"
          aria-label="Proje dosyaları"
        >
          <div className="mb-3 space-y-1.5">
            <input
              className={inputClass}
              placeholder="yeni-proje"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Yeni proje adı"
            />
            <div className="flex gap-1.5">
              <select
                className={inputClass}
                value={tpl}
                onChange={(e) => setTpl(e.target.value as TemplateId)}
                aria-label="Şablon"
              >
                {(Object.keys(TEMPLATES) as TemplateId[]).map((k) => (
                  <option key={k} value={k}>
                    {TEMPLATES[k].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={ghostBtn}
                onClick={() => void create()}
                disabled={!newName.trim()}
                aria-label="Proje oluştur"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {projects.map((p) => (
            <div key={p} className="mb-2">
              <div className="font-semibold text-[var(--tb-text)]">/repo/{p}</div>
              {paths
                .filter((x) => x.startsWith(`${p}/`))
                .map((x) => (
                  <button
                    type="button"
                    key={x}
                    onClick={() => void openFile(x)}
                    className={`block w-full truncate rounded px-2 py-0.5 text-left font-osmono ${x === open ? "bg-[var(--tb-accent)]/15 text-[var(--tb-text)]" : "text-[var(--tb-muted)] hover:text-[var(--tb-text)]"}`}
                  >
                    {x.slice(p.length + 1)}
                  </button>
                ))}
            </div>
          ))}
        </aside>

        <div className="grid min-h-0 grid-rows-[auto_1fr_180px]">
          <div className="border-b border-[var(--tb-border)] px-3 py-1 font-osmono text-[11px] text-[var(--tb-muted)]">
            {open ? `/repo/${open}${dirty ? " ●" : ""}` : "Dosya seçin"}
          </div>
          <div className="min-h-0">
            {open ? (
              <EditorPane
                path={open}
                value={text}
                handleRef={editor}
                onChange={(v) => {
                  setText(v);
                  setDirty(true);
                }}
                onSave={() => void save()}
              />
            ) : null}
          </div>
          <div className="flex min-h-0 flex-col border-t border-[var(--tb-border)]">
            <div className="flex gap-1 px-2 pt-1 text-[11px]" role="tablist">
              {(
                [
                  ["cikti", "Çıktı"],
                  ["sorunlar", `Sorunlar (${problems.length})`],
                  ["axiom", "AXIOM"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded px-2 py-0.5 ${tab === id ? "bg-[var(--tb-accent)]/15 text-[var(--tb-text)]" : "text-[var(--tb-muted)]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="min-h-0 flex-1 overflow-auto px-3 py-1 font-osmono text-[11.5px]"
              aria-live="polite"
            >
              {tab === "cikti" && out.map((l, i) => <div key={i}>{l}</div>)}
              {tab === "sorunlar" &&
                (problems.length ? (
                  problems.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className="block text-left hover:underline"
                      onClick={() => {
                        if (open === p.file) editor.current?.goto(p.line, p.col);
                        else void openFile(p.file);
                      }}
                    >
                      <span
                        className={
                          p.severity === "error"
                            ? "text-[var(--tb-rose-400)]"
                            : "text-[var(--tb-amber-400)]"
                        }
                      >
                        {p.severity === "error" ? "hata" : "uyarı"}
                      </span>{" "}
                      {p.line}:{p.col} {p.message}
                    </button>
                  ))
                ) : (
                  <div className="text-[var(--tb-muted)]">Sorun yok.</div>
                ))}
              {tab === "axiom" &&
                axiom.map((r, i) => (
                  <div key={i}>
                    <span className="text-[var(--tb-muted)]">{r.claim}</span> →{" "}
                    <strong>{r.verdict}</strong>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <aside className="hidden min-h-0 flex-col border-l border-[var(--tb-border)] xl:flex" aria-label="Önizleme ve rehber">
          <div className="flex gap-1 px-2 pt-1.5 text-[11px]" role="tablist">
            {(
              [
                ["onizleme", "Önizleme", Eye],
                ["rehber", "Rehber", BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={side === id}
                onClick={() => setSide(id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${side === id ? "bg-[var(--tb-accent)]/15 text-[var(--tb-text)]" : "text-[var(--tb-muted)]"}`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 text-[12px]">
            {side === "onizleme" ? (
              <div>
                <button
                  type="button"
                  className={`${primaryBtn} mb-2 inline-flex items-center gap-1.5`}
                  onClick={() => void run()}
                  disabled={!project || !!busy}
                >
                  <Play className="h-3.5 w-3.5" /> Önizlemeyi çalıştır
                </button>
                {preview.length ? (
                  <div className="rounded border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2 font-osmono text-[11.5px]" aria-live="polite">
                    {preview.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--tb-muted)]">
                    {wasm?.project === project
                      ? "Çalıştırınca log() çıktıları burada görünür."
                      : "Önce derleyin; ardından önizlemeyi çalıştırın."}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[var(--tb-muted)]">
                  Paketler yalnız bu host fonksiyonlarını kullanabilir. Tıklayınca örnek açık dosyaya eklenir.
                </p>
                {HOST_GUIDE.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    disabled={!open}
                    onClick={() => {
                      setText((t) => `${t.replace(/\s*$/, "")}\n// ${g.name}\n${g.snippet}\n`);
                      setDirty(true);
                    }}
                    className="block w-full rounded border border-[var(--tb-border)] p-2 text-left hover:bg-[var(--tb-panel-soft)] disabled:opacity-50"
                  >
                    <div className="font-osmono text-[11.5px] text-[var(--tb-text)]">{g.sig}</div>
                    <div className="mt-0.5 text-[var(--tb-muted)]">{g.about}</div>
                    {g.cap ? (
                      <div className="mt-1 text-[10.5px] text-[var(--tb-muted)]">Gerekli yetki: {g.cap}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {picker ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[var(--tb-bg)]/70 p-4" role="dialog" aria-modal="true" aria-label="Şablon seçin">
          <div className="w-full max-w-xl rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-[15px]">Yeni proje — şablon seçin</strong>
              <button type="button" aria-label="Kapat" className={ghostBtn} onClick={closePicker}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["widget", "meshbot", "wasm"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPickTpl(id)}
                  aria-pressed={pickTpl === id}
                  className={`rounded-lg border p-3 text-left text-[12px] ${pickTpl === id ? "border-[var(--tb-accent)] bg-[var(--tb-accent)]/10" : "border-[var(--tb-border)]"}`}
                >
                  <div className="mb-1 text-[13px] font-semibold">{TEMPLATES[id].label}</div>
                  <div className="text-[var(--tb-muted)]">{TEMPLATES[id].description}</div>
                </button>
              ))}
            </div>
            <input
              className={`${inputClass} mt-3`}
              placeholder="proje-adi"
              value={pickName}
              onChange={(e) => setPickName(e.target.value)}
              aria-label="Proje adı"
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={ghostBtn} onClick={closePicker}>
                Şimdilik geç
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={!pickName.trim()}
                onClick={() =>
                  void create(pickName, pickTpl).then((ok) => {
                    if (ok) {
                      setPickName("");
                      closePicker();
                    }
                  })
                }
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StudioApp;
