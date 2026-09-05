/**
 * KULLANICI VE LİSANS YÖNETİMİ
 * ------------------------------------------------------------------
 * Arama, filtre, sıralama, sayfalama ve tam CRUD. Tüm kayıtlar cihazda.
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2, Users } from "lucide-react";

import {
  Badge,
  EmptyState,
  GlassCard,
  Modal,
  TableSkeleton,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/shell/apps/portal/ui";
import { usePortal } from "@/lib/portal/store";
import { PLAN_LABEL, ROLE_LABEL, USER_STATUS_LABEL, type PortalUser } from "@/lib/portal/types";

const schema = z.object({
  name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  role: z.enum(["yonetici", "operator", "gozlemci"]),
  plan: z.enum(["community", "pro", "enterprise"]),
  status: z.enum(["etkin", "askida", "davetli"]),
  licenseUntil: z.string().min(1, "Lisans bitiş tarihi gerekli."),
});

type FormValues = z.input<typeof schema>;
type SortKey = "name" | "role" | "plan" | "status" | "licenseUntil";

function toDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("tr-TR");
}

export function UsersPanel() {
  const { ready, users, prefs, setPrefs, saveUser, removeUser } = usePortal();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | PortalUser["role"]>("all");
  const [status, setStatus] = useState<"all" | PortalUser["status"]>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const rows = users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (status !== "all" && u.status !== status) return false;
      if (!needle) return true;
      return (
        u.name.toLocaleLowerCase("tr").includes(needle) ||
        u.email.toLocaleLowerCase("tr").includes(needle)
      );
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "licenseUntil") return (a.licenseUntil - b.licenseUntil) * dir;
      return String(a[sort.key]).localeCompare(String(b[sort.key]), "tr") * dir;
    });
  }, [users, q, role, status, sort]);

  const pageSize = prefs.pageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: "gozlemci",
      plan: "community",
      status: "davetli",
      licenseUntil: toDateInput(Date.now() + 90 * 86_400_000),
    },
  });

  function openCreate() {
    form.reset({
      name: "",
      email: "",
      role: "gozlemci",
      plan: "community",
      status: "davetli",
      licenseUntil: toDateInput(Date.now() + 90 * 86_400_000),
    });
    setEditing(null);
    setOpen(true);
  }

  function openEdit(u: PortalUser) {
    form.reset({
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      status: u.status,
      licenseUntil: toDateInput(u.licenseUntil),
    });
    setEditing(u);
    setOpen(true);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const parsed = schema.parse(values);
      const duplicate = users.some(
        (u) => u.email.toLowerCase() === parsed.email.toLowerCase() && u.id !== editing?.id,
      );
      if (duplicate) {
        form.setError("email", { message: "Bu e-posta zaten kayıtlı." });
        return;
      }
      await saveUser({
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        plan: parsed.plan,
        status: parsed.status,
        licenseUntil: new Date(parsed.licenseUntil).getTime(),
        ...(editing ? { id: editing.id } : {}),
      });
      toast.success(editing ? "Kullanıcı güncellendi." : "Kullanıcı eklendi.");
      setOpen(false);
      setEditing(null);
    } catch {
      toast.error("Kayıt tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  });

  async function confirmDelete() {
    if (!confirmId) return;
    setBusy(true);
    try {
      await removeUser(confirmId);
      toast.success("Kullanıcı silindi.");
    } catch {
      toast.error("Kullanıcı silinemedi.");
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h3 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">
            Kullanıcı ve lisans yönetimi
          </h3>
          <button type="button" onClick={openCreate} className={`${primaryBtn} shrink-0`}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Kullanıcı
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Ad veya e-posta ara"
              aria-label="Kullanıcı ara"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--tb-text)] outline-none"
            />
          </label>
          <select
            aria-label="Role göre filtrele"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as typeof role);
              setPage(1);
            }}
            className="min-h-11 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 text-[13px] text-[var(--tb-text)]"
          >
            <option value="all">Tüm roller</option>
            <option value="yonetici">Yönetici</option>
            <option value="operator">Operatör</option>
            <option value="gozlemci">Gözlemci</option>
          </select>
          <select
            aria-label="Duruma göre filtrele"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
            className="min-h-11 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 text-[13px] text-[var(--tb-text)]"
          >
            <option value="all">Tüm durumlar</option>
            <option value="etkin">Etkin</option>
            <option value="askida">Askıda</option>
            <option value="davetli">Davetli</option>
          </select>
          <select
            aria-label="Sayfa boyutu"
            value={pageSize}
            onChange={(e) => {
              setPrefs({ pageSize: Number(e.target.value) });
              setPage(1);
            }}
            className="min-h-11 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 text-[13px] text-[var(--tb-text)]"
          >
            {[5, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n} kayıt
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          {!ready ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={users.length === 0 ? "Kullanıcı yok" : "Eşleşen kayıt yok"}
              description={
                users.length === 0
                  ? "İlk kullanıcıyı ekleyin; lisans ve yetki takibi hemen başlasın."
                  : "Arama ve filtreleri değiştirerek yeniden deneyin."
              }
              icon={<Users className="h-6 w-6" aria-hidden />}
              action={
                users.length === 0 ? (
                  <button type="button" onClick={openCreate} className={primaryBtn}>
                    Kullanıcı ekle
                  </button>
                ) : (
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => {
                      setQ("");
                      setRole("all");
                      setStatus("all");
                    }}
                  >
                    Filtreleri temizle
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="font-osmono text-[11px] uppercase tracking-[0.12em] text-[var(--tb-muted)]">
                      <SortHeader label="Kullanıcı" k="name" sort={sort} onSort={toggleSort} />
                      <SortHeader label="Rol" k="role" sort={sort} onSort={toggleSort} />
                      <SortHeader label="Paket" k="plan" sort={sort} onSort={toggleSort} />
                      <SortHeader label="Durum" k="status" sort={sort} onSort={toggleSort} />
                      <SortHeader
                        label="Lisans bitişi"
                        k="licenseUntil"
                        sort={sort}
                        onSort={toggleSort}
                      />
                      <th className="py-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className="border-t border-[var(--tb-border)]">
                        <td className="py-2 pr-3">
                          <span className="block font-medium text-[var(--tb-text)]">{u.name}</span>
                          <span className="block text-[12px] text-[var(--tb-muted)]">
                            {u.email}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{ROLE_LABEL[u.role]}</td>
                        <td className="py-2 pr-3">{PLAN_LABEL[u.plan]}</td>
                        <td className="py-2 pr-3">
                          <Badge
                            tone={
                              u.status === "etkin" ? "ok" : u.status === "davetli" ? "muted" : "bad"
                            }
                          >
                            {USER_STATUS_LABEL[u.status]}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          <span
                            className={
                              u.licenseUntil < Date.now()
                                ? "text-[var(--tb-danger,#dc2626)]"
                                : "text-[var(--tb-text)]"
                            }
                          >
                            {fmtDate(u.licenseUntil)}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              aria-label={`${u.name} düzenle`}
                              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(u.id)}
                              aria-label={`${u.name} sil`}
                              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
                  {filtered.length} kayıt · sayfa {current}/{pageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={ghostBtn}
                    disabled={current <= 1}
                    onClick={() => setPage(current - 1)}
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    className={ghostBtn}
                    disabled={current >= pageCount}
                    onClick={() => setPage(current + 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </GlassCard>

      <Modal
        open={open}
        title={editing ? "Kullanıcıyı düzenle" : "Yeni kullanıcı"}
        onClose={() => setOpen(false)}
      >
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <label className={labelClass}>
            Ad soyad
            <input className={inputClass} {...form.register("name")} />
          </label>
          <FieldError message={form.formState.errors.name?.message} />

          <label className={labelClass}>
            E-posta
            <input type="email" className={inputClass} {...form.register("email")} />
          </label>
          <FieldError message={form.formState.errors.email?.message} />

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Rol
              <select className={inputClass} {...form.register("role")}>
                <option value="yonetici">Yönetici</option>
                <option value="operator">Operatör</option>
                <option value="gozlemci">Gözlemci</option>
              </select>
            </label>
            <label className={labelClass}>
              Lisans paketi
              <select className={inputClass} {...form.register("plan")}>
                <option value="community">Community</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className={labelClass}>
              Durum
              <select className={inputClass} {...form.register("status")}>
                <option value="etkin">Etkin</option>
                <option value="askida">Askıda</option>
                <option value="davetli">Davetli</option>
              </select>
            </label>
            <label className={labelClass}>
              Lisans bitişi
              <input type="date" className={inputClass} {...form.register("licenseUntil")} />
            </label>
          </div>
          <FieldError message={form.formState.errors.licenseUntil?.message} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={ghostBtn} onClick={() => setOpen(false)}>
              Vazgeç
            </button>
            <button type="submit" className={primaryBtn} disabled={busy}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmId !== null} title="Kullanıcıyı sil" onClose={() => setConfirmId(null)}>
        <p className="text-[13px] text-[var(--tb-text)]">
          Bu kullanıcı ve lisans bilgisi cihazdan kalıcı olarak silinecek. Devam edilsin mi?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={() => setConfirmId(null)}>
            Vazgeç
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={busy}
            onClick={() => void confirmDelete()}
          >
            Sil
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th className="py-2 pr-3">
      <button
        type="button"
        onClick={() => onSort(k)}
        aria-label={`${label} sütununa göre sırala`}
        className={`inline-flex items-center gap-1 ${active ? "text-[var(--tb-accent)]" : ""}`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[12px] text-[var(--tb-danger,#dc2626)]">
      {message}
    </p>
  );
}
