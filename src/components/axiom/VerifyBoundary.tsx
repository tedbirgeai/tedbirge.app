/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * SIFIR GÜNLÜK HATA SINIRI (PANIC RECOVERY)
 * ------------------------------------------------------------------
 * Kanıt görüntüleyici çökerse kullanıcıya yalnız düz Türkçe bir kart
 * gösterilir. Özel durum mesajı, yığın izi ya da girdi verisi ekrana
 * yazılmaz, konsola düşürülmez, hiçbir yere gönderilmez.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { crashed: boolean };

export class VerifyBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Bilinçli olarak boş: sıfır günlük kuralı gereği hiçbir içerik yazılmaz.
  }

  private retry = () => this.setState({ crashed: false });

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div
        role="alert"
        className="rounded-xl border border-[var(--tb-rose-400)] bg-[var(--tb-panel)] p-3 font-osmono text-[11px] text-[var(--tb-rose-400)]"
      >
        Doğrulama kesildi. Hiçbir veri sızdırılmadı ve kaydedilmedi.
        <button
          type="button"
          onClick={this.retry}
          className="ml-2 rounded border border-[var(--tb-border)] px-2 py-0.5 uppercase tracking-wide text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          Yeniden dene
        </button>
      </div>
    );
  }
}
