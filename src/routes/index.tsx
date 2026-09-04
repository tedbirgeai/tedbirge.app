import { createFileRoute } from "@tanstack/react-router";

import { ShellProvider } from "@/shell/ShellProvider";
import { WorkspacePanel } from "@/components/shell/WorkspacePanel";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tedbirge® WebOS — tedbirge.app" },
      {
        name: "description",
        content:
          "İnternet kesildiğinde de çalışmaya devam eden kurumsal ağ altyapısı: uçtan uca şifreli mesh haberleşme, 10 taşıyıcı ve Resilience-as-a-Service abonelik modeli.",
      },
      { property: "og:title", content: "Tedbirge® WebOS — tedbirge.app" },
      {
        property: "og:description",
        content:
          "Kesintisiz bağlantı, otomatik yedekleme ve çevrimdışı veri güvenliği. Tarayıcıdan 2 tıkla kurulan kurumsal ağ platformu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="fixed inset-0 z-40 flex flex-col bg-[var(--tb-bg)]">
      <ShellProvider initialApp="chats">
        <WorkspacePanel />
      </ShellProvider>
    </main>
  );
}
