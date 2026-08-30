/**
 * EVRENSEL UYGULAMA KONTEYNIRI (GenericAppContainer)
 * ------------------------------------------------------------------
 * Harici web hedeflerini WebOS penceresinden çıkmadan çalıştırır.
 * Sırayla: gömme uyumlu eşdeğer → doğrudan adres → Tedbirge Geçidi.
 * Hiçbir aşamada kullanıcı yeni sekmeye yönlendirilmez; tüm aşamalar
 * tükenirse pencere içinde sade bir "tekrar dene" durumu gösterilir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

import { buildStages } from "@/lib/shell/embed-strategy";
import type { EmbedPolicy } from "@/shell/web-apps";

const LOAD_TIMEOUT_MS = 5000;

export function GenericAppContainer({
  url,
  label,
  embed = "auto",
  embedUrl,
  proxy,
}: {
  url: string;
  label: string;
  embed?: EmbedPolicy;
  embedUrl?: string;
  proxy?: string | true;
}) {
  const stages = useMemo(() => buildStages({ url, embed, embedUrl, proxy }), [url, embed, embedUrl, proxy]);
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = stages[Math.min(stage, stages.length - 1)];

  const advance = useCallback(() => {
    setStage((s) => {
      if (s + 1 < stages.length) {
        setLoaded(false);
        return s + 1;
      }
      setFailed(true);
      return s;
    });
  }, [stages.length]);

  useEffect(() => {
    if (loaded || failed) return;
    timer.current = setTimeout(advance, LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [loaded, failed, stage, attempt, advance]);

  const retry = useCallback(() => {
    setStage(0);
    setLoaded(false);
    setFailed(false);
    setAttempt((a) => a + 1);
  }, []);

  if (failed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-500">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-[15px] font-semibold text-[var(--tb-text)]">{label} şu an yanıt vermiyor</p>
        <p className="max-w-sm font-osmono text-[12px] text-[var(--tb-muted)]">
          Bağlantı kurulamadı. Ağ döndüğünde içerik yine bu pencerede açılacak.
        </p>
        <button
          type="button"
          onClick={retry}
          className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center gap-1 text-center font-osmono text-[12px] text-[var(--tb-muted)]">
          <span>
            {label} yükleniyor… <span className="opacity-60">({current?.note})</span>
          </span>
        </div>
      ) : null}
      <iframe
        ref={frameRef}
        key={`${attempt}:${stage}`}
        title={label}
        src={current?.src}
        onLoad={() => {
          // Gömmeyi reddeden hedefler de `load` tetikler; çerçeve about:blank
          // kalırsa içerik gelmemiştir ve bir sonraki aşamaya geçilir.
          if (isBlankFrame(frameRef.current)) {
            advance();
            return;
          }
          setLoaded(true);
          if (timer.current) clearTimeout(timer.current);
        }}
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-presentation"
        className="tbos-webview h-full w-full border-0 bg-white"
      />
    </div>
  );
}

/** Çapraz kaynak içerik yüklendiyse erişim hata verir; boş çerçeve okunur. */
function isBlankFrame(frame: HTMLIFrameElement | null): boolean {
  if (!frame) return false;
  try {
    const href = frame.contentWindow?.location?.href;
    return !href || href === "about:blank";
  } catch {
    return false;
  }
}

