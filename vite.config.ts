// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { COI_HEADERS, isIsolatedPath } from "./src/lib/coi-headers";

// Faz D: geliştirme sunucusunda da WebOS rotalarına COOP/COEP uygular;
// böylece SharedArrayBuffer halka tamponu önizlemede de test edilebilir.
const crossOriginIsolation = {
  name: "tedbirge-cross-origin-isolation",
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? "/").split("?")[0];
      if (isIsolatedPath(path)) {
        for (const [k, v] of Object.entries(COI_HEADERS)) res.setHeader(k, v);
      }
      next();
    });
  },
};

export default defineConfig({
  tanstackStart: {
    // Sunucu girişini src/server.ts'ye yönlendirir (SSR hata sarmalayıcısı).
    // Üretim derlemesi bu girişten üretilir.
    server: { entry: "server" },
  },
  // Vercel üzerinde sunucu tarafı render eden çıktı üretilir; statik SPA
  // yönlendirmesi eklenmez. Lovable içinde ortam kendi ön ayarını dayatır.
  nitro: { preset: process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : undefined) },
  vite: {
    // Varlık yolları her zaman köke göre çözülür.
    base: "/",
    // Her derleme için benzersiz damga: Ayarlar > Hakkında bölümünde görünür
    // ve sürüm kilidi bunu kullanır (eski paket kalıntısı kendiliğinden düşer).
    define: {
      __TEDBIRGE_BUILD_ID__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      crossOriginIsolation,
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        // Nitro yayınlanacak statik dosyaları dist/client altında sunar.
        outDir: "dist/client",

        workbox: {
          // Uygulama kapalıyken bile bildirim gösteren push dinleyicisi.
          importScripts: ["/push-sw.js"],
          // `wasm` şart: çekirdek modülü de ön belleğe alınmazsa tam
          // çevrimdışı açılışta yönlendirme motoru yüklenemez.
          globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,svg,png,ico,webmanifest,json,txt,wasm}"],
          // Çevrimdışı gezinmelerde masaüstü kabuğu açılır; "/cevrimdisi"
          // yalnız bilinçli açılan bilgi sayfası olarak kalır.
          navigateFallback: "/",
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "tedbirge-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
            {
              urlPattern: ({ url, request }: { url: URL; request: Request }) =>
                url.origin === self.location.origin &&
                ["style", "script", "worker", "image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "tedbirge-assets",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "tedbirge-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
