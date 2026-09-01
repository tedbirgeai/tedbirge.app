/**
 * HESAP PANELİ (Oturum)
 * ------------------------------------------------------------------
 * Eski /giris ve /kayit rotalarının yerini alır: URL değişmez, oturum
 * işlemleri sistem penceresi içinde yapılır.
 */

import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function AuthPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user.email ?? null);
      if (s) onSignedIn?.();
    });
    return () => sub.subscription.unsubscribe();
  }, [onSignedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSignedIn?.();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, organization },
          },
        });
        if (error) throw error;
        setInfo("Hesabınız oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) setError("Google ile giriş başarısız oldu.");
    } catch {
      setError("Google ile giriş başarısız oldu.");
    }
  }

  if (session) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--tb-text)]">
          Oturum açık: <strong>{session}</strong>
        </p>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-[13px] text-[var(--tb-text)]"
        >
          Oturumu kapat
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="flex gap-2 font-osmono text-[11px] uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`min-h-12 rounded-xl px-4 ${mode === "signin" ? "bg-[var(--tb-accent)] text-[var(--tb-bg)]" : "border border-[var(--tb-border)] text-[var(--tb-muted)]"}`}
        >
          Giriş
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-12 rounded-xl px-4 ${mode === "signup" ? "bg-[var(--tb-accent)] text-[var(--tb-bg)]" : "border border-[var(--tb-border)] text-[var(--tb-muted)]"}`}
        >
          Kayıt
        </button>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <>
            <Field label="Ad soyad" value={fullName} onChange={setFullName} required />
            <Field label="Kurum" value={organization} onChange={setOrganization} />
          </>
        )}
        <Field label="E-posta" type="email" value={email} onChange={setEmail} required />
        <Field label="Parola" type="password" value={password} onChange={setPassword} required />

        {error && <p className="text-[12px] text-[var(--tb-danger,#dc2626)]">{error}</p>}
        {info && <p className="text-[12px] text-[var(--tb-accent)]">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-[var(--tb-accent)] px-5 font-osmono text-[12px] uppercase tracking-[0.15em] text-[var(--tb-bg)] disabled:opacity-50"
        >
          {busy ? "İşleniyor…" : mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        className="min-h-12 w-full rounded-xl border border-[var(--tb-border)] px-5 font-osmono text-[12px] uppercase tracking-[0.15em] text-[var(--tb-text)]"
      >
        Google ile devam et
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-4 text-[13px] text-[var(--tb-text)] outline-none focus:border-[var(--tb-accent)]"
      />
    </label>
  );
}
