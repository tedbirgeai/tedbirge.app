/**
 * UYGULAMA HATA SINIRI (App Error Boundary)
 * ------------------------------------------------------------------
 * Web-OS kabuğu ile içindeki uygulamaları birbirinden yalıtır: bir iç
 * panel (ayarlar, güvenlik, ağ, video) çökerse masaüstü ayakta kalır,
 * yalnız o pencere hata kartına düşer ve tek tıkla yeniden başlatılır.
 * Hata sessizce yutulmaz; konsola ve Lovable hata kanalına iletilir.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import { announce } from "@/lib/shell/announce";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = {
  /** Kart başlığı; genelde uygulama adı. */
  title?: string;
  /** Hata sınırının kapsadığı uygulama kimliği (raporlama için). */
  appId?: string;
  children: ReactNode;
};
type State = { error: Error | null; key: number; restarts: number };

/** Kendiliğinden yeniden başlatma sınırı — sonsuz çökme döngüsü engellenir. */
const AUTO_RESTART_LIMIT = 2;
const AUTO_RESTART_DELAY = 600;

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: 0, restarts: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kabuğu düşürmeden bildir.
    console.error("[web-os] pencere hatası:", error, info.componentStack);
    reportLovableError(error, {
      boundary: "tbos_app_error_boundary",
      app: this.props.appId ?? this.props.title ?? "bilinmiyor",
    });
    announce(`${this.props.title ?? "Uygulama"} yanıt vermedi, pencere yalıtıldı`);
    // İlk iki çöküşte pencere kendini sessizce toparlar.
    if (this.state.restarts < AUTO_RESTART_LIMIT) {
      this.timer = setTimeout(() => this.reset(true), AUTO_RESTART_DELAY);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  private reset = (auto = false) =>
    this.setState((s) => ({
      error: null,
      key: s.key + 1,
      restarts: auto ? s.restarts + 1 : 0,
    }));

  render() {
    const { error, restarts } = this.state;
    if (!error) return <div key={this.state.key} className="contents">{this.props.children}</div>;
    const exhausted = restarts >= AUTO_RESTART_LIMIT;
    return (
      <div
        role="alert"
        className="m-4 rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-4 text-sm text-[var(--tb-text)]"
      >
        <p className="font-medium">{this.props.title ?? "Bu pencere yüklenemedi"}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--tb-muted)]">
          {exhausted
            ? "İşletim sistemi çalışmaya devam ediyor. Bu uygulama birkaç kez kendini toparlayamadı; aşağıdaki düğmeyle yeniden başlatabilirsiniz."
            : "İşletim sistemi çalışmaya devam ediyor. Uygulama birkaç saniye içinde kendini yeniden başlatıyor…"}
        </p>
        <p className="mt-2 break-words font-osmono text-[11px] text-[var(--tb-muted)]">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => this.reset(false)}
          className="wa-press mt-3 min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-sm font-medium text-[var(--tb-text)]"
        >
          Uygulamayı Yeniden Başlat
        </button>
      </div>
    );
  }
}
