/**
 * UYGULAMA HATA SINIRI (App Error Boundary)
 * ------------------------------------------------------------------
 * Web-OS kabuğu ile içindeki uygulamaları birbirinden yalıtır: bir iç
 * panel (ayarlar, güvenlik, ağ, video) çökerse masaüstü ayakta kalır,
 * yalnız o pencere hata kartına düşer ve tek tıkla yeniden yüklenir.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { title?: string; children: ReactNode };
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
    // Kabuğu düşürmeden yalnız konsola bildir.
    console.error("[web-os] pencere hatası:", error, info.componentStack);
    // Faz B: ilk iki çöküşte pencere kendini sessizce toparlar.
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
    if (!error) return <div key={this.state.key}>{this.props.children}</div>;
    const exhausted = restarts >= AUTO_RESTART_LIMIT;
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        <p className="font-medium">{this.props.title ?? "Bu pencere yüklenemedi"}</p>
        <p className="mt-1 text-amber-200/70">
          {exhausted
            ? "Masaüstü çalışmaya devam ediyor. Bu pencere birkaç kez kendini toparlayamadı; elle yeniden açmayı deneyin."
            : "Masaüstü çalışmaya devam ediyor. Pencere birkaç saniye içinde kendini yeniden başlatıyor…"}
        </p>
        <button
          type="button"
          onClick={() => this.reset(false)}
          className="mt-3 rounded-md border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/10"
        >
          Yeniden yükle
        </button>
      </div>
    );
  }
}

