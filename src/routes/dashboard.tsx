import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/components/Dashboard";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kontrol Paneli — tedbirge.app" },
      {
        name: "description",
        content:
          "Tedbirge Protocol canlı P2P kontrol paneli: mesh ağ topolojisi, bant genişliği, Wasm kum havuzu ve düğüm terminali tek ekranda.",
      },
      { property: "og:title", content: "Kontrol Paneli — tedbirge.app" },
      {
        property: "og:description",
        content:
          "Canlı mesh topolojisi, ağ metrikleri ve düğüm terminali içeren Tedbirge Protocol paneli.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});
