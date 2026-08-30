/**
 * EVRENSEL UYGULAMA KONTEYNIRI (GenericAppContainer)
 * ------------------------------------------------------------------
 * Harici web hedeflerini isim sabitlemeden çalıştırır. Büyük platformların
 * çoğu `X-Frame-Options: SAMEORIGIN` veya `frame-ancestors` CSP başlığıyla
 * gömülmeyi reddeder; bu durumda çerçeve boş/beyaz kalır. Konteynır bunu
 * bir zaman aşımıyla tespit eder ve "yeni sekmede aç" kartına düşer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";

import type { EmbedPolicy } from "@/shell/web-apps";

const LOAD_TIMEOUT_MS = 6000;

export function GenericAppContainer({
  url,
  label,
  embed = "auto",
}: {
  url: string;
  label: string;
  embed?: EmbedPolicy;
}) {
  const [blocked, setBlocked] = useState(embed === "popup");
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openExternal = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  useEffect(() => {
    if (embed === "popup" || loaded) return;
    timer.current = setTimeout(() => setBlocked(true), LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [embed, loaded, attempt]);

  if (blocked) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-400">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-[15px] font-semibold text-slate-100">{label} pencerede açılamıyor</p>
        <p className="max-w-sm font-osmono text-[12px] text-slate-500">
          Bu servis güvenlik politikası gereği başka bir uygulamanın içinde görüntülenmeye izin
          vermiyor. Yeni sekmede açabilirsiniz.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={openExternal}
            className="wa-press inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 font-osmono text-[12px] text-emerald-400"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Yeni sekmede aç
          </button>
          {embed !== "popup" ? (
            <button
              type="button"
              onClick={() => {
                setBlocked(false);
                setLoaded(false);
                setAttempt((a) => a + 1);
              }}
              className="wa-press inline-flex items-center gap-2 rounded-lg border border-slate-500/30 px-3 py-2 font-osmono text-[12px] text-slate-400"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Tekrar dene
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center font-osmono text-[12px] text-slate-500">
          {label} yükleniyor…
        </div>
      ) : null}
      <iframe
        key={attempt}
        title={label}
        src={url}
        onLoad={() => {
          setLoaded(true);
          if (timer.current) clearTimeout(timer.current);
        }}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        className="h-full w-full border-0 bg-white"
      />
    </div>
  );
}
