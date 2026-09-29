import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { submitContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/iletisim")({
  component: IletisimPage,
});

function IletisimPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitContactMessage({ data: { email: email.trim(), message: message.trim() } });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-2 text-emerald-400">Tedbirge® İletişim</h1>
        <p className="text-slate-400 text-sm mb-6">
          Sistem geliştirmeleri, hata bildirimleri veya kurumsal talepleriniz için doğrudan bize
          ulaşabilirsiniz.
        </p>

        {submitted ? (
          <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-center text-sm">
            Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz!
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                E-posta Adresiniz
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                placeholder="ornek@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Mesajınız / Geri Bildiriminiz
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100"
                placeholder="Görüş, hata bildirimi veya önerinizi yazınız..."
              />
            </div>
            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg p-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
            >
              {busy ? "Gönderiliyor…" : "Mesajı Gönder"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
