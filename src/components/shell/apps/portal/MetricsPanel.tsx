/**
 * AĞ DÜĞÜMLERİ VE CANLI ÖLÇÜMLER
 * ------------------------------------------------------------------
 * Ölçüm kartları, zaman serisi grafikleri ve düğüm CRUD tablosu.
 */

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Activity,
  Cpu,
  Gauge,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Badge,
  EmptyState,
  GlassCard,
  Modal,
  StatCard,
  TableSkeleton,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/shell/apps/portal/ui";
import { usePortal } from "@/lib/portal/store";
import { NODE_STATUS_LABEL, type PortalNode } from "@/lib/portal/types";

const schema = z.object({
  label: z.string().trim().min(3, "En az 3 karakter girin."),
  region: z.string().trim().min(2, "Bölge bilgisi gerekli."),
  status: z.enum(["cevrimici", "bekleme", "cevrimdisi"]),
  cpu: z.coerce.number().min(0, "0-100 arası").max(100, "0-100 arası"),
  memory: z.coerce.number().min(0, "0-100 arası").max(100, "0-100 arası"),
  latency: z.coerce.number().min(0, "0 veya üzeri").max(5000, "En fazla 5000 ms"),
  quality: z.coerce.number().min(0, "0-100 arası").max(100, "0-100 arası"),
});

type FormValues = z.input<typeof schema>;

function clock(at: number): string {
  return new Date(at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function relative(at: number): string {
  const diff = Math.max(0, Date.now() - at);
  if (diff < 60_000) return "az önce";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)} dk önce`;
  if (diff < 86_400_000) return `${Math.round(diff / 3600_000)} sa önce`;
  return `${Math.round(diff / 86_400_000)} gün önce`;
}

export function MetricsPanel() {
  const { ready, nodes, history, saveNode, removeNode, sample } = usePortal();
  const [editing, setEditing] = useState<PortalNode | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Canlı akış: 10 saniyede bir ölçüm örneği alınır.
  useEffect(() => {
    const id = window.setInterval(() => sample(), 10_000);
    return () => window.clearInterval(id);
  }, [sample]);

  const stats = useMemo(() => {
    const live = nodes.filter((n) => n.status !== "cevrimdisi");
    const avg = (pick: (n: PortalNode) => number) =>
      live.length === 0 ? 0 : Math.round(live.reduce((s, n) => s + pick(n), 0) / live.length);
    return {
      active: live.length,
      total: nodes.length,
      cpu: avg((n) => n.cpu),
      memory: avg((n) => n.memory),
      quality: avg((n) => n.quality),
    };
  }, [nodes]);

  const chart = useMemo(
    () => history.map((h) => ({ ...h, t: clock(h.at) })),
    [history],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      region: "",
      status: "cevrimici",
      cpu: 20,
      memory: 30,
      latency: 40,
      quality: 90,
    },
  });

  function openCreate() {
    form.reset({
      label: "",
      region: "",
      status: "cevrimici",
      cpu: 20,
      memory: 30,
      latency: 40,
      quality: 90,
    });
    setEditing(null);
    setCreating(true);
  }

  function openEdit(node: PortalNode) {
    form.reset({
      label: node.label,
      region: node.region,
      status: node.status,
      cpu: node.cpu,
      memory: node.memory,
      latency: node.latency,
      quality: node.quality,
    });
    setEditing(node);
    setCreating(true);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const parsed = schema.parse(values);
      await saveNode(editing ? { ...parsed, id: editing.id } : parsed);
      toast.success(editing ? "Düğüm güncellendi." : "Düğüm eklendi.");
      setCreating(false);
      setEditing(null);
    } catch {
      toast.error("Düğüm kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  });

  async function confirmDelete() {
    if (!confirmId) return;
    setBusy(true);
    try {
      await removeNode(confirmId);
      toast.success("Düğüm kaldırıldı.");
    } catch {
      toast.error("Düğüm kaldırılamadı.");
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Etkin düğüm"
          value={stats.active}
          unit={`/ ${stats.total}`}
          hint="Çevrimiçi ve beklemedeki düğümler"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="İşlemci"
          value={stats.cpu}
          unit="%"
          hint="Etkin düğüm ortalaması"
          icon={<Cpu className="h-4 w-4" />}
        />
        <StatCard
          label="Bellek"
          value={stats.memory}
          unit="%"
          hint="Etkin düğüm ortalaması"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          label="Bağlantı kalitesi"
          value={stats.quality}
          unit="%"
          hint="Son ölçüm penceresi"
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <GlassCard>
          <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">İşlemci ve bellek</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tb-panel-solid)",
                    border: "1px solid var(--tb-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="İşlemci"
                  stroke="var(--tb-accent)"
                  fill="color-mix(in srgb, var(--tb-accent) 20%, transparent)"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  name="Bellek"
                  stroke="var(--tb-muted)"
                  fill="color-mix(in srgb, var(--tb-muted) 14%, transparent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">Bağlantı kalitesi</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tb-panel-solid)",
                    border: "1px solid var(--tb-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="quality"
                  name="Kalite"
                  stroke="var(--tb-accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h3 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">Ağ düğümleri</h3>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => sample()} className={ghostBtn}>
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Ölç
            </button>
            <button type="button" onClick={openCreate} className={primaryBtn}>
              <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Düğüm
            </button>
          </div>
        </div>

        <div className="mt-3">
          {!ready ? (
            <TableSkeleton />
          ) : nodes.length === 0 ? (
            <EmptyState
              title="Henüz düğüm yok"
              description="İlk ağ düğümünü ekleyerek canlı ölçümleri görmeye başlayın."
              icon={<Activity className="h-6 w-6" aria-hidden />}
              action={
                <button type="button" onClick={openCreate} className={primaryBtn}>
                  Düğüm ekle
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="font-osmono text-[11px] uppercase tracking-[0.12em] text-[var(--tb-muted)]">
                    <th className="py-2">Düğüm</th>
                    <th className="py-2">Durum</th>
                    <th className="py-2 text-right">İşlemci</th>
                    <th className="py-2 text-right">Bellek</th>
                    <th className="py-2 text-right">Gecikme</th>
                    <th className="py-2">Son görülme</th>
                    <th className="py-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((n) => (
                    <tr key={n.id} className="border-t border-[var(--tb-border)]">
                      <td className="py-2 pr-3">
                        <span className="block font-medium text-[var(--tb-text)]">{n.label}</span>
                        <span className="block text-[12px] text-[var(--tb-muted)]">{n.region}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          tone={
                            n.status === "cevrimici"
                              ? "ok"
                              : n.status === "bekleme"
                                ? "warn"
                                : "bad"
                          }
                        >
                          {NODE_STATUS_LABEL[n.status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{n.cpu}%</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{n.memory}%</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{n.latency} ms</td>
                      <td className="py-2 pr-3 text-[var(--tb-muted)]">{relative(n.lastSeen)}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(n)}
                            aria-label={`${n.label} düzenle`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(n.id)}
                            aria-label={`${n.label} sil`}
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
          )}
        </div>
      </GlassCard>

      <Modal
        open={creating}
        title={editing ? "Düğümü düzenle" : "Yeni düğüm"}
        onClose={() => setCreating(false)}
      >
        <form className="space-y-3" onSubmit={onSubmit} noValidate>
          <label className={labelClass}>
            Düğüm adı
            <input className={inputClass} {...form.register("label")} />
          </label>
          <FieldError message={form.formState.errors.label?.message} />

          <label className={labelClass}>
            Bölge
            <input className={inputClass} {...form.register("region")} />
          </label>
          <FieldError message={form.formState.errors.region?.message} />

          <label className={labelClass}>
            Durum
            <select className={inputClass} {...form.register("status")}>
              <option value="cevrimici">Çevrimiçi</option>
              <option value="bekleme">Beklemede</option>
              <option value="cevrimdisi">Çevrimdışı</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              İşlemci (%)
              <input type="number" className={inputClass} {...form.register("cpu")} />
            </label>
            <label className={labelClass}>
              Bellek (%)
              <input type="number" className={inputClass} {...form.register("memory")} />
            </label>
            <label className={labelClass}>
              Gecikme (ms)
              <input type="number" className={inputClass} {...form.register("latency")} />
            </label>
            <label className={labelClass}>
              Kalite (%)
              <input type="number" className={inputClass} {...form.register("quality")} />
            </label>
          </div>
          <FieldError
            message={
              form.formState.errors.cpu?.message ??
              form.formState.errors.memory?.message ??
              form.formState.errors.latency?.message ??
              form.formState.errors.quality?.message
            }
          />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={ghostBtn} onClick={() => setCreating(false)}>
              Vazgeç
            </button>
            <button type="submit" className={primaryBtn} disabled={busy}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmId !== null} title="Düğümü sil" onClose={() => setConfirmId(null)}>
        <p className="text-[13px] text-[var(--tb-text)]">
          Bu düğüm cihazdaki kayıttan kalıcı olarak silinecek. Devam edilsin mi?
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[12px] text-[var(--tb-danger,#dc2626)]">
      {message}
    </p>
  );
}
