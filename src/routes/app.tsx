import { createFileRoute } from "@tanstack/react-router";

import { ShellProvider } from "@/shell/ShellProvider";
import { WorkspacePanel } from "@/components/shell/WorkspacePanel";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Çalışma Alanı — tedbirge.app" },
      {
        name: "description",
        content:
          "Messenger, müzik, medya oynatıcı, dosya yöneticisi ve eşler arası aktarım araçlarını tek ekranda toplayan merkeziyetsiz çalışma alanı.",
      },
      { property: "og:title", content: "Çalışma Alanı — tedbirge.app" },
      {
        property: "og:description",
        content:
          "Kesintide de çalışan uygulama süiti: sohbet, medya, dosya yönetimi ve P2P aktarım tek kabukta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-app.lovable.app/app" }],
  }),
  component: AppWorkspaceRoute,
});

function AppWorkspaceRoute() {
  return (
    <main className="fixed inset-0 z-40 flex flex-col bg-[var(--tb-bg)]">
      <ShellProvider initialApp="chats">
        <WorkspacePanel />
      </ShellProvider>
    </main>
  );
}
