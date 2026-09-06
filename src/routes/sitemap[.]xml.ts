import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://tedbirge.app";

const PATHS: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/chat", changefreq: "weekly", priority: "0.8" },
  { path: "/cevrimdisi", changefreq: "monthly", priority: "0.4" },
  { path: "/yasal", changefreq: "monthly", priority: "0.5" },
  { path: "/gizlilik", changefreq: "yearly", priority: "0.3" },
  { path: "/kosullar", changefreq: "yearly", priority: "0.3" },
  { path: "/iade", changefreq: "yearly", priority: "0.3" },
  { path: "/ihracat-uyum", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path === "/" ? "/" : e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            "  </url>",
          ].join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
