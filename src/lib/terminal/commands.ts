/**
 * TERMİNAL KOMUT KAYIT DEFTERİ
 * ------------------------------------------------------------------
 * Her komut saf bir işleyicidir: bağlamı (çalışma dizini, ortam
 * değişkenleri, boru hattı girdisi, sistem köprüsü) alır, metin çıktı
 * üretir. Böylece komutlar arayüzden bağımsız test edilebilir.
 */

import {
  VFS_FOLDERS,
  deleteFile,
  listFiles,
  moveFile,
  readDocument,
  renameFile,
  saveFiles,
  storageUsage,
  writeDocument,
  type VfsEntry,
  type VfsFolder,
} from "@/lib/vfs/store";

import { ROOT, folderOf, resolvePath, splitTarget } from "./paths";
import type { TerminalHost } from "./host";

export type Tone = "out" | "ok" | "err" | "warn" | "dim" | "accent";

export type Line = { text: string; tone?: Tone };

export type CommandContext = {
  argv: string[];
  args: string[];
  flags: Set<string>;
  stdin: string;
  cwd: string;
  env: Record<string, string>;
  host: TerminalHost;
  setCwd: (path: string) => void;
  setEnv: (key: string, value: string) => void;
  clear: () => void;
  history: () => string[];
  aliases: () => Record<string, string>;
  commandNames: () => string[];
};

export type CommandResult = { lines: Line[]; code: number };

export type Command = {
  name: string;
  group: "dosya" | "sistem" | "ağ" | "güvenlik" | "teşhis" | "kabuk";
  usage: string;
  summary: string;
  run: (ctx: CommandContext) => Promise<CommandResult> | CommandResult;
};

export const ok = (lines: (Line | string)[] = []): CommandResult => ({
  lines: lines.map((l) => (typeof l === "string" ? { text: l } : l)),
  code: 0,
});

export const fail = (message: string): CommandResult => ({
  lines: [{ text: message, tone: "err" }],
  code: 1,
});

const nf = (v: number | null, unit = "") => (v === null ? "ölçülemiyor" : `${v}${unit}`);

const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));

async function entriesIn(cwd: string): Promise<VfsEntry[]> {
  const folder = folderOf(cwd);
  const all = await listFiles();
  return folder ? all.filter((f) => f.folder === folder) : all;
}

async function findEntry(cwd: string, arg: string): Promise<VfsEntry | null> {
  const t = splitTarget(cwd, arg);
  if (!t) return null;
  const all = await listFiles();
  return (
    all.find((f) => f.name === t.name && (t.folder === null || f.folder === t.folder)) ??
    all.find((f) => f.name === t.name) ??
    null
  );
}

/* -------------------------------- dosya -------------------------------- */

const cmdLs: Command = {
  name: "ls",
  group: "dosya",
  usage: "ls [-l] [-a] [yol]",
  summary: "Dizin içeriğini listeler",
  async run({ cwd, args, flags }) {
    const target = args[0] ? resolvePath(cwd, args[0]) : cwd;
    if (target === null) return fail("Dizin bulunamadı.");
    const lines: Line[] = [];
    if (target === ROOT) {
      const all = await listFiles();
      for (const f of VFS_FOLDERS) {
        const count = all.filter((x) => x.folder === f).length;
        lines.push({
          text: flags.has("l") ? `${pad("dizin", 8)} ${pad(String(count), 6)} ${f}/` : `${f}/`,
          tone: "accent",
        });
      }
      return ok(lines);
    }
    const list = await entriesIn(target);
    const shown = flags.has("a") ? list : list.filter((f) => !f.name.startsWith("."));
    if (!shown.length) return ok([{ text: "(boş)", tone: "dim" }]);
    for (const f of shown) {
      lines.push({
        text: flags.has("l")
          ? `${pad("dosya", 8)} ${pad(String(f.size), 9)} ${new Date(f.at)
              .toLocaleString("tr-TR")
              .padEnd(20)} ${f.name}`
          : f.name,
      });
    }
    return ok(lines);
  },
};

const cmdCd: Command = {
  name: "cd",
  group: "dosya",
  usage: "cd <yol>",
  summary: "Çalışma dizinini değiştirir",
  run({ args, cwd, setCwd }) {
    const next = resolvePath(cwd, args[0] ?? ROOT);
    if (next === null) return fail(`Dizin bulunamadı: ${args[0]}`);
    setCwd(next);
    return ok();
  },
};

const cmdPwd: Command = {
  name: "pwd",
  group: "dosya",
  usage: "pwd",
  summary: "Bulunulan dizini yazar",
  run: ({ cwd }) => ok([cwd]),
};

const cmdCat: Command = {
  name: "cat",
  group: "dosya",
  usage: "cat <dosya>",
  summary: "Dosya içeriğini yazar",
  async run({ args, cwd, stdin }) {
    if (!args.length) return ok(stdin ? stdin.split("\n") : []);
    const out: Line[] = [];
    for (const a of args) {
      const entry = await findEntry(cwd, a);
      if (!entry) return fail(`Dosya bulunamadı: ${a}`);
      const body = await readDocument(entry.id);
      out.push(...(body ?? "").split("\n").map((text) => ({ text })));
    }
    return ok(out);
  },
};

const cmdTouch: Command = {
  name: "touch",
  group: "dosya",
  usage: "touch <dosya>",
  summary: "Boş dosya oluşturur",
  async run({ args, cwd }) {
    if (!args.length) return fail("Dosya adı gerekli.");
    for (const a of args) {
      const t = splitTarget(cwd, a);
      if (!t) return fail(`Geçersiz yol: ${a}`);
      await writeDocument({
        name: t.name,
        mime: "text/plain",
        text: "",
        folder: (t.folder ?? "Belgeler") as VfsFolder,
      });
    }
    return ok([{ text: `oluşturuldu: ${args.join(", ")}`, tone: "ok" }]);
  },
};

const cmdMkdir: Command = {
  name: "mkdir",
  group: "dosya",
  usage: "mkdir <ad>",
  summary: "Klasör kaydı oluşturur",
  async run({ args }) {
    if (!args.length) return fail("Klasör adı gerekli.");
    await saveFiles([
      new File([""], `${args[0]}.klasor`, { type: "application/x-tedbirge-folder" }),
    ]);
    return ok([{ text: `klasör oluşturuldu: ${args[0]}`, tone: "ok" }]);
  },
};

const cmdRm: Command = {
  name: "rm",
  group: "dosya",
  usage: "rm [-r] <dosya>",
  summary: "Dosya siler",
  async run({ args, cwd, flags }) {
    if (!args.length) return fail("Silinecek dosya gerekli.");
    let count = 0;
    for (const a of args) {
      const target = resolvePath(cwd, a);
      if (target && target !== ROOT && !a.includes(".")) {
        if (!flags.has("r")) return fail(`'${a}' bir dizin — '-r' bayrağı gerekli.`);
        for (const f of await entriesIn(target)) {
          await deleteFile(f.id);
          count += 1;
        }
        continue;
      }
      const entry = await findEntry(cwd, a);
      if (!entry) return fail(`Dosya bulunamadı: ${a}`);
      await deleteFile(entry.id);
      count += 1;
    }
    return ok([{ text: `silinen: ${count}`, tone: "ok" }]);
  },
};

const cmdRmdir: Command = {
  name: "rmdir",
  group: "dosya",
  usage: "rmdir <dizin>",
  summary: "Boş dizini temizler",
  async run({ args, cwd }) {
    const target = resolvePath(cwd, args[0] ?? "");
    if (target === null || target === ROOT) return fail("Dizin bulunamadı.");
    const list = await entriesIn(target);
    if (list.length) return fail("Dizin boş değil.");
    return ok([{ text: "dizin boş.", tone: "ok" }]);
  },
};

const cmdCp: Command = {
  name: "cp",
  group: "dosya",
  usage: "cp <kaynak> <hedef>",
  summary: "Dosya kopyalar",
  async run({ args, cwd }) {
    const [src, dst] = args;
    if (!src || !dst) return fail("Kaynak ve hedef gerekli.");
    const entry = await findEntry(cwd, src);
    if (!entry) return fail(`Dosya bulunamadı: ${src}`);
    const body = (await readDocument(entry.id)) ?? "";
    const t = splitTarget(cwd, dst);
    if (!t) return fail(`Geçersiz hedef: ${dst}`);
    await writeDocument({
      name: t.name,
      mime: entry.mime,
      text: body,
      folder: (t.folder ?? entry.folder) as VfsFolder,
    });
    return ok([{ text: `kopyalandı: ${src} → ${dst}`, tone: "ok" }]);
  },
};

const cmdMv: Command = {
  name: "mv",
  group: "dosya",
  usage: "mv <kaynak> <hedef>",
  summary: "Dosyayı taşır veya yeniden adlandırır",
  async run({ args, cwd }) {
    const [src, dst] = args;
    if (!src || !dst) return fail("Kaynak ve hedef gerekli.");
    const entry = await findEntry(cwd, src);
    if (!entry) return fail(`Dosya bulunamadı: ${src}`);
    const asFolder = resolvePath(cwd, dst);
    if (asFolder && asFolder !== ROOT && !dst.includes(".")) {
      await moveFile(entry.id, folderOf(asFolder) as VfsFolder);
      return ok([{ text: `taşındı: ${src} → ${asFolder}`, tone: "ok" }]);
    }
    const t = splitTarget(cwd, dst);
    if (!t) return fail(`Geçersiz hedef: ${dst}`);
    await renameFile(entry.id, t.name);
    if (t.folder && t.folder !== entry.folder) await moveFile(entry.id, t.folder);
    return ok([{ text: `taşındı: ${src} → ${dst}`, tone: "ok" }]);
  },
};

const cmdGrep: Command = {
  name: "grep",
  group: "dosya",
  usage: "grep <desen> [dosya]",
  summary: "Metin arar ve eşleşmeleri vurgular",
  async run({ args, cwd, stdin }) {
    const [pattern, file] = args;
    if (!pattern) return fail("Aranacak desen gerekli.");
    let text = stdin;
    if (file) {
      const entry = await findEntry(cwd, file);
      if (!entry) return fail(`Dosya bulunamadı: ${file}`);
      text = (await readDocument(entry.id)) ?? "";
    }
    if (!text) {
      // Dosya verilmediyse tüm dizin taranır.
      const list = await entriesIn(cwd);
      const hits: Line[] = [];
      for (const f of list) {
        const body = (await readDocument(f.id)) ?? "";
        body.split("\n").forEach((l) => {
          if (l.toLowerCase().includes(pattern.toLowerCase()))
            hits.push({ text: `${f.name}: ${l.trim()}`, tone: "accent" });
        });
      }
      return hits.length ? ok(hits) : ok([{ text: "eşleşme yok", tone: "dim" }]);
    }
    const hits = text
      .split("\n")
      .filter((l) => l.toLowerCase().includes(pattern.toLowerCase()))
      .map((text2) => ({ text: text2, tone: "accent" as Tone }));
    return hits.length ? ok(hits) : ok([{ text: "eşleşme yok", tone: "dim" }]);
  },
};

const cmdDf: Command = {
  name: "df",
  group: "dosya",
  usage: "df",
  summary: "Şifreli VFS depolama kullanımı",
  async run() {
    const u = await storageUsage();
    return ok([
      `dosya    : ${u.files}`,
      `kullanım : ${(u.bytes / 1048576).toFixed(2)} MB`,
      `kota     : ${u.quota ? `${(u.quota / 1048576).toFixed(0)} MB` : "ölçülemiyor"}`,
    ]);
  },
};

/* -------------------------------- sistem ------------------------------- */

const LOGO = [
  "  ████████╗",
  "  ╚══██╔══╝  Tedbirge(R) WebOS",
  "     ██║     egemen, cevrimdisi",
  "     ██║     P2P mesh cekirdegi",
  "     ╚═╝",
];

const cmdSysinfo: Command = {
  name: "sysinfo",
  group: "sistem",
  usage: "sysinfo",
  summary: "Sistem durumu özeti",
  async run({ host }) {
    const mesh = host.mesh();
    const w = host.wasm();
    const u = await storageUsage();
    return ok([
      { text: "Tedbirge(R) WebOS — sistem durumu", tone: "accent" },
      `düğüm      : ${mesh.nodeId ?? "ölçülemiyor"}`,
      `mesh       : ${mesh.mode} (${mesh.peers.length} düğüm)`,
      `bellek     : ${nf(w.heapMb, " MB")} / ${nf(w.limitMb, " MB")}`,
      `çekirdek   : ${w.provider}`,
      `depolama   : ${u.files} dosya · ${(u.bytes / 1048576).toFixed(2)} MB`,
      `çalışma    : ${host.uptimeSec()} sn`,
    ]);
  },
};

const cmdNeofetch: Command = {
  name: "neofetch",
  group: "sistem",
  usage: "neofetch",
  summary: "ASCII logolu sistem kartı",
  async run(ctx) {
    const res = await cmdSysinfo.run(ctx);
    const lines: Line[] = LOGO.map((text) => ({ text, tone: "accent" as Tone }));
    return ok([...lines, { text: "", tone: "dim" }, ...res.lines]);
  },
};

const cmdPs: Command = {
  name: "ps",
  group: "sistem",
  usage: "ps",
  summary: "Açık pencereleri listeler",
  run({ host }) {
    const list = host.processes();
    if (!list.length) return ok([{ text: "açık pencere yok", tone: "dim" }]);
    return ok([
      { text: `${pad("PID", 6)}${pad("UYGULAMA", 16)}${pad("BELLEK", 12)}BAŞLIK`, tone: "dim" },
      ...list.map((p) => ({
        text: `${pad(String(p.pid), 6)}${pad(p.appId, 16)}${pad(nf(p.memMb, " MB"), 12)}${p.name}`,
      })),
    ]);
  },
};

const cmdKill: Command = {
  name: "kill",
  group: "sistem",
  usage: "kill <PID>",
  summary: "Pencereyi kapatır",
  run({ args, host }) {
    const pid = Number(args[0]);
    if (!Number.isFinite(pid)) return fail("Geçerli bir PID gerekli.");
    return host.kill(pid)
      ? ok([{ text: `kapatıldı: ${pid}`, tone: "ok" }])
      : fail(`PID bulunamadı: ${pid}`);
  },
};

const cmdOpen: Command = {
  name: "open",
  group: "sistem",
  usage: "open <uygulama> [dosya]",
  summary: "Uygulama açar",
  run({ args, host }) {
    if (!args[0]) return fail("Uygulama kimliği gerekli.");
    return host.open(args[0], args[1])
      ? ok([{ text: `açıldı: ${args[0]}`, tone: "ok" }])
      : fail(`Uygulama bulunamadı: ${args[0]}`);
  },
};

const cmdLogs: Command = {
  name: "logs",
  group: "sistem",
  usage: "logs [-n <satır>]",
  summary: "Sistem günlüğü",
  run({ args, host }) {
    const n = Number(args[0]) || 20;
    const list = host.logs(n);
    return list.length ? ok(list) : ok([{ text: "günlük boş", tone: "dim" }]);
  },
};

const cmdEnv: Command = {
  name: "env",
  group: "kabuk",
  usage: "env",
  summary: "Ortam değişkenleri",
  run({ env }) {
    const keys = Object.keys(env).sort();
    return keys.length
      ? ok(keys.map((k) => `${k}=${env[k]}`))
      : ok([{ text: "(tanımlı değişken yok)", tone: "dim" }]);
  },
};

const cmdExport: Command = {
  name: "export",
  group: "kabuk",
  usage: "export AD=DEĞER",
  summary: "Ortam değişkeni tanımlar",
  run({ args, setEnv }) {
    const pair = args[0] ?? "";
    const idx = pair.indexOf("=");
    if (idx <= 0) return fail("Kullanım: export AD=DEĞER");
    setEnv(pair.slice(0, idx), pair.slice(idx + 1));
    return ok([{ text: `${pair.slice(0, idx)} tanımlandı`, tone: "ok" }]);
  },
};

const cmdEcho: Command = {
  name: "echo",
  group: "kabuk",
  usage: "echo <metin>",
  summary: "Metni yazar",
  run: ({ args, env }) =>
    ok([args.map((a) => (a.startsWith("$") ? (env[a.slice(1)] ?? "") : a)).join(" ")]),
};

const cmdDate: Command = {
  name: "tarih",
  group: "sistem",
  usage: "tarih",
  summary: "Sistem saati",
  run: () => ok([new Date().toLocaleString("tr-TR")]),
};

const cmdClear: Command = {
  name: "clear",
  group: "kabuk",
  usage: "clear",
  summary: "Ekranı temizler",
  run({ clear }) {
    clear();
    return ok();
  },
};

const cmdHistory: Command = {
  name: "history",
  group: "kabuk",
  usage: "history",
  summary: "Komut geçmişi",
  run: ({ history }) => {
    const h = history();
    return h.length
      ? ok(h.map((c, i) => `${pad(String(i + 1), 5)}${c}`))
      : ok([{ text: "geçmiş boş", tone: "dim" }]);
  },
};

const cmdAlias: Command = {
  name: "alias",
  group: "kabuk",
  usage: "alias",
  summary: "Tanımlı kısayollar",
  run: ({ aliases }) => ok(Object.entries(aliases()).map(([k, v]) => `${pad(k, 8)}→ ${v}`)),
};

/* ---------------------------------- ağ --------------------------------- */

const cmdMesh: Command = {
  name: "mesh",
  group: "ağ",
  usage: "mesh",
  summary: "P2P mesh durumu",
  run({ host }) {
    const m = host.mesh();
    const head: Line[] = [
      { text: `düğüm : ${m.nodeId ?? "ölçülemiyor"}`, tone: "accent" },
      { text: `durum : ${m.mode}` },
    ];
    if (!m.peers.length) return ok([...head, { text: "bağlı düğüm yok", tone: "dim" }]);
    return ok([
      ...head,
      { text: `${pad("DÜĞÜM", 26)}${pad("GECİKME", 12)}BANT`, tone: "dim" },
      ...m.peers.map((p) => ({
        text: `${pad(p.id, 26)}${pad(nf(p.rttMs, " ms"), 12)}${nf(p.kbps, " kbps")}`,
      })),
    ]);
  },
};

const cmdPing: Command = {
  name: "ping",
  group: "ağ",
  usage: "ping <düğüm>",
  summary: "Düğüm gecikmesini ölçer",
  async run({ args, host }) {
    if (!args[0]) return fail("Düğüm kimliği gerekli.");
    const rtt = await host.ping(args[0]);
    return rtt === null
      ? ok([{ text: `${args[0]}: ölçülemiyor (bağlı değil)`, tone: "warn" }])
      : ok([{ text: `${args[0]}: ${rtt} ms`, tone: "ok" }]);
  },
};

/* ------------------------------- güvenlik ------------------------------ */

const cmdVault: Command = {
  name: "vault",
  group: "güvenlik",
  usage: "vault lock | vault unlock | vault status",
  summary: "Şifreli VFS kasası",
  run({ args, host }) {
    const sub = args[0] ?? "status";
    if (sub === "lock") {
      host.setVaultLocked(true);
      return ok([{ text: "kasa kilitlendi — açık önizlemeler kapatıldı.", tone: "ok" }]);
    }
    if (sub === "unlock") {
      host.setVaultLocked(false);
      return ok([{ text: "kasa açıldı.", tone: "ok" }]);
    }
    return ok([{ text: `kasa: ${host.vaultLocked() ? "kilitli" : "açık"}`, tone: "accent" }]);
  },
};

const cmdKeypair: Command = {
  name: "keypair",
  group: "güvenlik",
  usage: "keypair gen",
  summary: "Cihaz anahtar çifti üretir",
  async run({ args, host }) {
    if ((args[0] ?? "gen") !== "gen") return fail("Kullanım: keypair gen");
    const id = await host.generateKeypair();
    if (!id) return fail("Anahtar üretilemedi.");
    return ok([
      { text: "anahtar çifti hazır", tone: "ok" },
      `düğüm     : ${id.nodeId}`,
      `parmak izi: ${id.fingerprint}`,
    ]);
  },
};

const cmdKey: Command = {
  name: "key",
  group: "güvenlik",
  usage: "key export",
  summary: "Genel anahtarları dışa aktarır",
  async run({ args, host }) {
    if ((args[0] ?? "export") !== "export") return fail("Kullanım: key export");
    const id = await host.identity();
    if (!id) return fail("Bu cihazda kayıtlı anahtar yok — 'keypair gen' çalıştırın.");
    return ok([
      `düğüm      : ${id.nodeId}`,
      `imza genel : ${id.signPublic}`,
      `kutu genel : ${id.boxPublic}`,
      `parmak izi : ${id.fingerprint}`,
      { text: "Gizli anahtar hiçbir zaman dışa aktarılmaz.", tone: "dim" },
    ]);
  },
};

/* -------------------------------- teşhis ------------------------------- */

const cmdWasm: Command = {
  name: "wasm",
  group: "teşhis",
  usage: "wasm status",
  summary: "Rust-Wasm çekirdek durumu",
  run({ host }) {
    const w = host.wasm();
    return ok([
      { text: "Rust-Wasm çekirdeği", tone: "accent" },
      `sağlayıcı   : ${w.provider}`,
      `yığın (heap): ${nf(w.heapMb, " MB")}`,
      `üst sınır   : ${nf(w.limitMb, " MB")}`,
    ]);
  },
};

const cmdGpu: Command = {
  name: "gpu",
  group: "teşhis",
  usage: "gpu info",
  summary: "WebGPU render hattı ve FPS",
  async run({ host }) {
    const g = await host.gpu();
    return ok([
      { text: "Görüntü işleme hattı", tone: "accent" },
      `bağdaştırıcı: ${g.adapter ?? "ölçülemiyor"}`,
      `kare hızı   : ${nf(g.fps, " FPS")}`,
    ]);
  },
};

const cmdIpc: Command = {
  name: "ipc",
  group: "teşhis",
  usage: "ipc bus",
  summary: "Süreçler arası iletişim veri yolu",
  run: ({ host }) => ok(host.ipc()),
};

const cmdEvents: Command = {
  name: "events",
  group: "teşhis",
  usage: "events [-f] [sayı]",
  summary: "Çekirdek olay akışı",
  run({ args, host, flags }) {
    const n = Number(args[0]) || 20;
    const list = host.events(n);
    const head: Line[] = flags.has("f")
      ? [{ text: "canlı akış açık — kapatmak için Ctrl+C", tone: "dim" }]
      : [];
    return ok([...head, ...(list.length ? list : [{ text: "olay yok", tone: "dim" as Tone }])]);
  },
};

const cmdRun: Command = {
  name: "run",
  group: "teşhis",
  usage: "run <dosya.js>",
  summary: "Betiği yalıtılmış alanda çalıştırır",
  async run({ args, cwd }) {
    if (!args[0]) return fail("Çalıştırılacak dosya gerekli.");
    const entry = await findEntry(cwd, args[0]);
    if (!entry) return fail(`Dosya bulunamadı: ${args[0]}`);
    const src = (await readDocument(entry.id)) ?? "";
    if (typeof Worker === "undefined") return fail("Bu ortamda yalıtılmış çalıştırma yok.");
    const blob = new Blob(
      [
        `self.onmessage=(e)=>{try{const f=new Function('return ('+e.data+')');` +
          `self.postMessage({ok:true,v:String(f()( ))})}catch(err){self.postMessage({ok:false,v:String(err)})}}`,
      ],
      { type: "text/javascript" },
    );
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const out = await new Promise<{ ok: boolean; v: string }>((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, v: "zaman aşımı (2 sn)" }), 2000);
      worker.onmessage = (e: MessageEvent<{ ok: boolean; v: string }>) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      worker.postMessage(`function(){${src}}`);
    });
    worker.terminate();
    URL.revokeObjectURL(url);
    return out.ok ? ok([{ text: out.v, tone: "ok" }]) : fail(`çalıştırma hatası: ${out.v}`);
  },
};

const cmdHelp: Command = {
  name: "yardim",
  group: "kabuk",
  usage: "yardim [komut]",
  summary: "Komut rehberi",
  run({ args }) {
    if (args[0]) {
      const c = COMMANDS.find((x) => x.name === args[0]);
      if (!c) return fail(`Komut bulunamadı: ${args[0]}`);
      return ok([{ text: c.usage, tone: "accent" }, { text: c.summary }]);
    }
    const groups: Command["group"][] = ["dosya", "sistem", "ağ", "güvenlik", "teşhis", "kabuk"];
    const lines: Line[] = [{ text: "Tedbirge(R) WebOS — komut rehberi", tone: "accent" }];
    for (const g of groups) {
      lines.push({ text: "", tone: "dim" });
      lines.push({ text: g.toUpperCase(), tone: "warn" });
      for (const c of COMMANDS.filter((x) => x.group === g)) {
        lines.push({ text: `  ${pad(c.usage, 30)}${c.summary}` });
      }
    }
    return ok(lines);
  },
};

export const COMMANDS: Command[] = [
  cmdLs,
  cmdCd,
  cmdPwd,
  cmdCat,
  cmdTouch,
  cmdMkdir,
  cmdRm,
  cmdRmdir,
  cmdCp,
  cmdMv,
  cmdGrep,
  cmdDf,
  cmdSysinfo,
  cmdNeofetch,
  cmdPs,
  cmdKill,
  cmdOpen,
  cmdLogs,
  cmdDate,
  cmdMesh,
  cmdPing,
  cmdVault,
  cmdKeypair,
  cmdKey,
  cmdWasm,
  cmdGpu,
  cmdIpc,
  cmdEvents,
  cmdRun,
  cmdEnv,
  cmdExport,
  cmdEcho,
  cmdClear,
  cmdHistory,
  cmdAlias,
  cmdHelp,
];

/** İki yönlü DOS/POSIX kısayol haritası. */
export const ALIASES: Record<string, string> = {
  dir: "ls -la",
  cls: "clear",
  temizle: "clear",
  type: "cat",
  del: "rm",
  erase: "rm",
  md: "mkdir",
  copy: "cp",
  move: "mv",
  help: "yardim",
  status: "sysinfo",
  netstat: "mesh",
  journalctl: "logs",
  depo: "df",
};
