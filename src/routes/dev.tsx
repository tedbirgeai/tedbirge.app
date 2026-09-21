import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Code2,
  Cpu,
  KeyRound,
  Network,
  PackageCheck,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

import { AppIconSurface } from "@/components/shell/AppIconBadge";
import { Button } from "@/components/ui/button";
import { mcpCapabilities } from "@/lib/axiom/net/mcp-server";

const sections = [
  { title: "SDK", icon: Code2, text: "TypeScript, Python, Rust, Java, Go, C# ve HDL şablonları." },
  {
    title: "Compiler",
    icon: TerminalSquare,
    text: "@axiom_proof / #[axiom_verify] / [AxiomProof] işaretçileri.",
  },
  { title: "MCP", icon: Network, text: "/api/v1/mcp ve JSON-RPC 2.0 doğrulama çağrıları." },
  {
    title: "Proof",
    icon: ShieldCheck,
    text: "Z3/Lean varsa mühürlü; yoksa mühürsüz karar kapısı.",
  },
  {
    title: "Packages",
    icon: PackageCheck,
    text: "npm, crates.io, PyPI, Maven, NuGet ve GoPkg rozetleri.",
  },
  { title: "Runtime", icon: Cpu, text: "Worker, offline queue, CRDT ve P2P mesh durumu." },
  { title: "Keys", icon: KeyRound, text: "Yerel imza, izin ve paket köken doğrulama yüzeyleri." },
];

export const Route = createFileRoute("/dev")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Geliştirici Portalı — Tedbirge® WebOS" },
      {
        name: "description",
        content:
          "Tedbirge® WebOS için AXIOM SDK, MCP doğrulama, paket rozeti ve geliştirici araçları.",
      },
      { property: "og:title", content: "Geliştirici Portalı — Tedbirge® WebOS" },
      {
        property: "og:description",
        content:
          "AXIOM SDK, MCP JSON-RPC doğrulama, paket köken rozeti ve geliştirici çalışma zamanı.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevPortal,
});

function DevPortal() {
  const [caps, setCaps] = useState<Awaited<ReturnType<typeof mcpCapabilities>> | null>(null);

  useEffect(() => {
    let alive = true;
    void mcpCapabilities().then((next) => {
      if (alive) setCaps(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--tb-bg)] text-[var(--tb-fg)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tb-border)] pb-5">
          <div className="flex items-center gap-3">
            <AppIconSurface id="axiom" size="launcher" showBadge />
            <div>
              <p className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
                tedbirge.dev
              </p>
              <h1 className="text-3xl font-semibold text-[var(--tb-text)]">Geliştirici Portalı</h1>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link to="/">WebOS’a dön</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="MCP" value={caps?.protocol ?? "jsonrpc-2.0"} />
          <Info label="Timeout" value={`${caps?.timeoutMs ?? 500} ms`} />
          <Info label="Mühür" value={caps?.proofsAreSealed ? "Aktif" : "WASM bekliyor"} />
          <Info label="Motor" value={caps?.engine ?? "local"} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ title, icon: Icon, text }) => (
            <article
              key={title}
              className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-5 shadow-[var(--tb-shadow)]"
            >
              <div className="flex items-center gap-3 text-[var(--tb-accent)]">
                <Icon className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-[var(--tb-text)]">{title}</h2>
              </div>
              <p className="mt-3 text-sm text-[var(--tb-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-4 shadow-[var(--tb-shadow)]">
      <p className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--tb-text)]">{value}</p>
    </div>
  );
}
