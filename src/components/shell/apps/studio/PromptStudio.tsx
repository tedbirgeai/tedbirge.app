/**
 * ÜRETİCİ PANELİ — doğal dilden uygulamaya
 * ------------------------------------------------------------------
 * Kullanıcı ne istediğini yazar; panel isteği çözümler, AssemblyScript
 * çekirdeğini cihazda derler, dosyaları /repo/apps/<ad>/ altına yazar,
 * yetki sınırlarını denetler ve uygulamayı masaüstüne kurar. Her adım
 * konsolda şeffaf biçimde görünür. İstem cihazdan dışarı çıkmaz.
 */

import { useState } from "react";
import { Check, CircleDashed, Loader2, Sparkles, X } from "lucide-react";

import { ghostBtn, inputClass, primaryBtn } from "@/components/shell/apps/portal/ui";
import { compile } from "@/lib/studio/compiler";
import { saveGeneratedApp, useGeneratedApps, removeGeneratedApp } from "@/lib/studio/generated-apps";
import {
  generateApp,
  generatedFiles,
  tsxFor,
  MAX_PROMPT,
  type GeneratedSpec,
} from "@/lib/studio/generator";
import { writeRepo } from "@/lib/studio/repo-fs";
import { notify, notifyError, notifyOk } from "@/lib/shell/notify";
import { classifyIntent } from "@/lib/studio/intent";
import { applySystemPatch } from "@/lib/studio/system-patch";
import { reportForApp, reportForPatch, type DiagnosisReport } from "@/lib/studio/diagnosis";
import { DiagnosisCard } from "@/components/axiom/DiagnosisCard";


import { ALLOWED_GENERATED_CAPS } from "@/lib/studio/generated-policy";
import { installApp, uninstallApp } from "@/shell/installed";

type StepId = "analiz" | "derleme" | "vfs" | "guvenlik" | "kurulum";
type StepState = "bekliyor" | "sürüyor" | "tamam" | "hata";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "analiz", label: "İstem analizi" },
  { id: "derleme", label: "Çekirdek (WASM) derlemesi" },
  { id: "vfs", label: "Dosya sistemine yazım" },
  { id: "guvenlik", label: "Güvenlik kalkanı" },
  { id: "kurulum", label: "Masaüstüne kurulum" },
];

function toDataUrl(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:application/wasm;base64,${btoa(bin)}`;
}

export function PromptStudio({ onOpenFile }: { onOpenFile: (path: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<Record<StepId, StepState>>({
    analiz: "bekliyor",
    derleme: "bekliyor",
    vfs: "bekliyor",
    guvenlik: "bekliyor",
    kurulum: "bekliyor",
  });
  const [log, setLog] = useState<string[]>([]);
  const [spec, setSpec] = useState<GeneratedSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<string | null>(null);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const apps = useGeneratedApps();



  const print = (line: string) =>
    setLog((l) => [...l.slice(-199), `${new Date().toLocaleTimeString("tr-TR")}  ${line}`]);
  const mark = (id: StepId, s: StepState) => setState((p) => ({ ...p, [id]: s }));

  /** Mod B — mevcut sistem bileşenini yerinde güncelle/incele (ikon/klasör üretilmez). */
  function patchSystem(intent: Extract<ReturnType<typeof classifyIntent>, { mode: "sistem" }>) {
    setState({ analiz: "tamam", derleme: "bekliyor", vfs: "bekliyor", guvenlik: "bekliyor", kurulum: "bekliyor" });
    const r = applySystemPatch(intent.patch);
    print(`Mod B — ${intent.reason}`);
    print(`${r.component}: ${r.summary}`);
    setReport(reportForPatch(prompt, intent, r));
    if (r.applied) notifyOk(r.component, r.summary);
    else notify(r.component, r.summary);
  }


  async function produce(force = false) {
    setBusy(true);
    setLog([]);
    setSpec(null);
    setAsk(null);
    setReport(null);
    setState({ analiz: "bekliyor", derleme: "bekliyor", vfs: "bekliyor", guvenlik: "bekliyor", kurulum: "bekliyor" });
    try {
      mark("analiz", "sürüyor");
      if (!force) {
        const intent = classifyIntent(prompt);
        if (intent.mode === "sistem") {
          patchSystem(intent);
          return;
        }

        if (intent.mode === "belirsiz") {
          mark("analiz", "hata");
          print(intent.reason);
          setAsk(intent.reason);
          return;
        }
        print(`Mod A — ${intent.reason}`);
      }
      const s = generateApp(prompt);

      setSpec(s);
      print(`İstem çözümlendi: ${s.name} (${s.blocks.length} arayüz bloğu)`);
      mark("analiz", "tamam");

      mark("derleme", "sürüyor");
      const entry = "assembly/index.ts";
      const r = await compile({ [entry]: s.assembly }, entry);
      if (!r.ok) {
        mark("derleme", "hata");
        print(r.timeout ? "Derleme süre sınırını aştı." : `Derleme başarısız: ${r.problems[0]?.message ?? "bilinmeyen"}`);
        return;
      }
      print(`Çekirdek derlendi: ${r.binary.length} bayt`);
      mark("derleme", "tamam");

      mark("vfs", "sürüyor");
      for (const f of generatedFiles(s)) {
        await writeRepo(f.path, f.text);
        print(`Yazıldı: /repo/${f.path}`);
      }
      mark("vfs", "tamam");

      mark("guvenlik", "sürüyor");
      const disallowed = s.capabilities.filter((c) => !ALLOWED_GENERATED_CAPS.includes(c));
      if (disallowed.length) {
        mark("guvenlik", "hata");
        print(`Reddedildi: üretilen uygulama şu yetkileri isteyemez — ${disallowed.join(", ")}`);
        return;
      }
      print(`Yetkiler onaylandı: ${s.capabilities.join(", ") || "yok"} · veri alanı /appdata/${s.id}`);
      mark("guvenlik", "tamam");

      mark("kurulum", "sürüyor");
      saveGeneratedApp({ spec: s, module: toDataUrl(r.binary) });
      installApp(s.id);
      mark("kurulum", "tamam");
      print(`Kuruldu: ${s.name} — masaüstünde ve görev çubuğunda hazır.`);
      setReport(
        reportForApp(prompt, s.name, true, `${r.binary.length} baytlık çekirdek derlendi ve /repo/apps/${s.id}/ altına yazıldı.`),
      );
      notifyOk(`${s.name} kuruldu`, "Masaüstünden açabilirsiniz.");

      notifyOk(`${s.name} kuruldu`, "Masaüstünden açabilirsiniz.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Üretim tamamlanamadı.";
      print(msg);
      notifyError("Üretim tamamlanamadı", msg);
      setState((p) => {
        const next = { ...p };
        for (const st of STEPS) if (next[st.id] === "sürüyor") next[st.id] = "hata";
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 overflow-auto p-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-0 flex-col gap-3">
        <label className="font-osmono text-[11px] text-[var(--tb-muted)]" htmlFor="uretim-istem">
          Ne yapmasını istiyorsunuz? (herhangi bir dilde yazabilirsiniz)
        </label>
        <textarea
          id="uretim-istem"
          className={`${inputClass} min-h-28 resize-y`}
          maxLength={MAX_PROMPT}
          placeholder="Örnek: Ağdaki eş sayısını gösteren, not tutabileceğim ve bana bildirim gönderen bir pano yap."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${primaryBtn} inline-flex items-center gap-1.5`}
            disabled={busy || prompt.trim().length < 4}
            onClick={() => void produce()}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? "İşleniyor…" : "İsteği uygula"}
          </button>
          <span className="font-osmono text-[11px] text-[var(--tb-muted)]">
            {prompt.length}/{MAX_PROMPT}
          </span>
        </div>

        <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
          Sistem bileşeni istekleri (tema, duvar kâğıdı, ayarlar, sesler) yerinde güncellenir; masaüstüne yeni ikon
          eklenmez. Yeni ikon yalnız açıkça bağımsız program istendiğinde oluşur.
        </p>

        {ask ? (
          <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2 text-[12px]">
            <div className="mb-1.5">{ask}</div>
            <div className="flex gap-1.5">
              <button type="button" className={ghostBtn} disabled={busy} onClick={() => void produce(true)}>
                Yine de bağımsız uygulama üret
              </button>
              <button type="button" className={ghostBtn} onClick={() => setAsk(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        ) : null}

        {report ? <DiagnosisCard report={report} /> : null}

        <ol className="space-y-1.5" aria-live="polite">

          {STEPS.map((s) => (
            <li key={s.id} className="flex items-center gap-2 font-osmono text-[12px]">
              {state[s.id] === "tamam" ? (
                <Check className="h-3.5 w-3.5 text-[var(--tb-accent)]" />
              ) : state[s.id] === "hata" ? (
                <X className="h-3.5 w-3.5 text-[var(--tb-rose-400)]" />
              ) : state[s.id] === "sürüyor" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--tb-muted)]" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5 text-[var(--tb-muted)]" />
              )}
              <span className={state[s.id] === "bekliyor" ? "text-[var(--tb-muted)]" : "text-[var(--tb-text)]"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div
          className="min-h-24 flex-1 overflow-auto rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2 font-osmono text-[11.5px]"
          aria-live="polite"
        >
          {log.length ? log.map((l, i) => <div key={i}>{l}</div>) : <span className="text-[var(--tb-muted)]">Konsol boş.</span>}
        </div>

        {spec ? (
          <div>
            <div className="mb-1 flex items-center justify-between font-osmono text-[11px] text-[var(--tb-muted)]">
              <span>Üretilen kaynak — /repo/apps/{spec.slug}/index.tsx</span>
              <button type="button" className={ghostBtn} onClick={() => onOpenFile(`apps/${spec.slug}/assembly/index.ts`)}>
                Kodu düzenle
              </button>
            </div>
            <pre className="max-h-56 overflow-auto rounded-lg bg-[var(--tb-surface-2)] p-3 font-osmono text-[11px]">
              {tsxFor(spec)}
            </pre>
          </div>
        ) : null}
      </div>

      <aside className="min-h-0 space-y-2" aria-label="Üretilen uygulamalar">
        <div className="font-osmono text-[11px] text-[var(--tb-muted)]">Üretilen uygulamalar ({apps.length})</div>
        {apps.length ? (
          apps.map((a) => (
            <div key={a.spec.id} className="rounded-lg border border-[var(--tb-border)] p-2 text-[12px]">
              <div className="font-semibold">{a.spec.name}</div>
              <div className="mt-0.5 line-clamp-2 text-[var(--tb-muted)]">{a.spec.description}</div>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => onOpenFile(`apps/${a.spec.slug}/index.tsx`)}
                >
                  Kaynak
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => {
                    uninstallApp(a.spec.id);
                    removeGeneratedApp(a.spec.id);
                    notifyOk(`${a.spec.name} kaldırıldı`);
                  }}
                >
                  Kaldır
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[12px] text-[var(--tb-muted)]">Henüz üretilmiş uygulama yok.</p>
        )}
      </aside>
    </div>
  );
}

export default PromptStudio;
