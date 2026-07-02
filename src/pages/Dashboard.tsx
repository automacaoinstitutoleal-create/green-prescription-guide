import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/AppShell";
import {
  Plus, Search, FileText, StickyNote, Pencil, Trash2,
  ArrowUpRight, Users, Calendar, FilePlus2, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  weight: number | null;
  created_at: string;
  last_prescription?: { created_at: string; product: string } | null;
}

interface Annotation {
  id: string;
  date: string;
  text: string;
  current_dose: string;
  created_at: string;
}

const isWithinDays = (iso: string | null | undefined, days: number) => {
  if (!iso) return false;
  const d = new Date(iso);
  return Date.now() - d.getTime() < days * 24 * 60 * 60 * 1000;
};

const formatBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  // Date-only string (YYYY-MM-DD): format without timezone shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) {
    const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
    return `${m[3]} de ${months[parseInt(m[2], 10) - 1]} de ${m[1]}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Annotations dialog
  const [annotationPatientId, setAnnotationPatientId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState({ text: "", current_dose: "" });
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: patRes } = await supabase
      .from("patients")
      .select("id, full_name, cpf, birth_date, weight, created_at")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (patRes) {
      const patientsWithPrescriptions = await Promise.all(
        patRes.map(async (p) => {
          const { data: lastPresc } = await supabase
            .from("prescriptions")
            .select("created_at, product")
            .eq("patient_id", p.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return { ...p, last_prescription: lastPresc };
        })
      );
      setPatients(patientsWithPrescriptions);
    }
    setLoading(false);
  };

  const loadAnnotations = async (patientId: string) => {
    setAnnotationPatientId(patientId);
    setLoadingAnnotations(true);
    const { data } = await supabase
      .from("annotations")
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: false });
    setAnnotations((data as Annotation[]) || []);
    setLoadingAnnotations(false);
  };

  const handleAddAnnotation = async () => {
    if (!user || !annotationPatientId || !newAnnotation.text.trim()) return;
    const { error } = await supabase.from("annotations").insert({
      patient_id: annotationPatientId,
      doctor_id: user.id,
      text: newAnnotation.text,
      current_dose: newAnnotation.current_dose,
    });
    if (error) {
      toast.error("Erro ao salvar anotação");
      return;
    }
    toast.success("Anotação salva");
    setNewAnnotation({ text: "", current_dose: "" });
    loadAnnotations(annotationPatientId);
  };

  const handleDeletePatient = async (patientId: string) => {
    const { error } = await supabase.from("patients").delete().eq("id", patientId);
    if (error) {
      toast.error("Erro ao excluir paciente: " + error.message);
      return;
    }
    toast.success("Paciente excluído");
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
  };

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.cpf.includes(q)
    );
  }, [patients, search]);

  const stats = useMemo(() => {
    const total = patients.length;
    const last30 = patients.filter((p) => isWithinDays(p.created_at, 30)).length;
    const recentPrescriptions = patients.filter((p) =>
      isWithinDays(p.last_prescription?.created_at ?? null, 30)
    ).length;
    const productsInUse = new Set(
      patients.map((p) => p.last_prescription?.product).filter(Boolean) as string[]
    ).size;
    return { total, last30, recentPrescriptions, productsInUse };
  }, [patients]);

  const annotationPatient = patients.find((p) => p.id === annotationPatientId);

  return (
    <AppShell
      pageEyebrow="Painel clínico"
      pageTitle="Pacientes"
      pageDescription={
        <>
          Gerencie seus pacientes, gere prescrições, registre anotações de
          acompanhamento e instrua casos de judicialização.
        </>
      }
      pageActions={
        <Button onClick={() => navigate("/pacientes/novo")} className="h-10">
          <Plus className="mr-1.5 h-4 w-4" />
          Cadastrar paciente
        </Button>
      }
    >
      {/* ─── Bento de KPIs ─── */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          eyebrow="Cadastrados"
          value={stats.total}
          icon={Users}
          hint={stats.last30 > 0 ? `+${stats.last30} novos no último mês` : "Nenhum cadastro recente"}
        />
        <KpiCard
          eyebrow="Receitas no mês"
          value={stats.recentPrescriptions}
          icon={FilePlus2}
          accent
          hint="Prescrições emitidas nos últimos 30 dias"
        />
        <KpiCard
          eyebrow="Produtos em uso"
          value={stats.productsInUse}
          icon={FileText}
          hint="Variedade da linha Greenlion ativa"
        />
        <KpiCard
          eyebrow="Próximos retornos"
          value="—"
          icon={Calendar}
          hint="Calendário em breve"
          dim
        />
      </section>

      {/* ─── Toolbar busca + filtros ─── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            placeholder="Buscar por nome ou CPF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10"
          />
          <kbd className="kbd absolute right-3 top-1/2 -translate-y-1/2">⌘K</kbd>
        </div>
        <p className="text-[12px] text-ink-soft">
          Mostrando <span className="font-medium text-foreground tabular">{filteredPatients.length}</span> de{" "}
          <span className="font-medium text-foreground tabular">{patients.length}</span> paciente(s)
        </p>
      </div>

      {/* ─── Tabela densa estilo EHR ─── */}
      {loading ? (
        <SkeletonTable />
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          search={search}
          onCreate={() => navigate("/pacientes/novo")}
        />
      ) : (
        <div className="card-editorial overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                <Th>Paciente</Th>
                <Th className="hidden md:table-cell">CPF</Th>
                <Th className="hidden lg:table-cell">Peso</Th>
                <Th className="hidden lg:table-cell">Último contato</Th>
                <Th className="hidden xl:table-cell">Produto em uso</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient, i) => {
                const initials = patient.full_name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
                const lastTouch = patient.last_prescription?.created_at ?? patient.created_at;
                const isRecent = isWithinDays(lastTouch, 30);
                return (
                  <tr
                    key={patient.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      "hover:bg-surface-2/40"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[11px] font-semibold tracking-wider text-primary">
                          {initials || "—"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-foreground">
                            {patient.full_name}
                          </p>
                          <p className="truncate text-[11.5px] text-ink-soft">
                            {patient.weight ? `${patient.weight} kg` : "Peso não informado"}
                            {patient.birth_date && (
                              <>
                                {" · "}
                                Nasc. {formatBR(patient.birth_date)}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 font-mono text-[12.5px] text-ink-soft md:table-cell">
                      {patient.cpf}
                    </td>
                    <td className="hidden px-5 py-3.5 font-mono text-[12.5px] tabular text-foreground lg:table-cell">
                      {patient.weight ? `${patient.weight} kg` : "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] text-foreground">
                          {formatBR(patient.last_prescription?.created_at)}
                        </span>
                        {isRecent && (
                          <span className="chip-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 text-[12.5px] xl:table-cell">
                      {patient.last_prescription?.product ? (
                        <span className="chip-muted">{patient.last_prescription.product}</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigate(`/prescricao/${patient.id}`)}
                          className="h-8 px-3 text-[12px]"
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Nova receita
                          <ArrowUpRight className="ml-0.5 h-3 w-3 opacity-70" />
                        </Button>
                        <PatientActions
                          patient={patient}
                          onHistory={() => navigate(`/pacientes/${patient.id}/historico`)}
                          onEdit={() => navigate(`/pacientes/${patient.id}/editar`)}
                          onDelete={() => handleDeletePatient(patient.id)}
                          onAnnotations={() => loadAnnotations(patient.id)}
                          annotationPatient={annotationPatient}
                          annotations={annotations}
                          loadingAnnotations={loadingAnnotations}
                          newAnnotation={newAnnotation}
                          setNewAnnotation={setNewAnnotation}
                          handleAddAnnotation={handleAddAnnotation}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Subcomponentes
// ═══════════════════════════════════════════════════════════════════

function KpiCard({
  eyebrow, value, icon: Icon, hint, accent, dim,
}: {
  eyebrow: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "card-editorial relative overflow-hidden p-4 transition-shadow hover:shadow-elev-2",
        accent && "border-primary/25 bg-primary-soft/40",
        dim && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{eyebrow}</p>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-ink-soft")} />
      </div>
      <p className="mt-3 font-display text-[34px] font-semibold leading-none tracking-tight tabular text-foreground">
        {value}
      </p>
      {hint && <p className="mt-2 text-[11.5px] text-ink-soft">{hint}</p>}
      {accent && (
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" aria-hidden />
      )}
    </div>
  );
}

function Th({ children, align = "left", className }: { children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <th
      className={cn(
        "px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

function SkeletonTable() {
  return (
    <div className="card-editorial overflow-hidden">
      <div className="space-y-px">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-surface-2/60" />
            </div>
            <div className="h-8 w-28 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ search, onCreate }: { search: string; onCreate: () => void }) {
  return (
    <div className="card-editorial flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <p className="font-display text-[20px] font-medium tracking-tight text-foreground">
        {search ? "Nenhum paciente encontrado" : "Comece cadastrando seu primeiro paciente"}
      </p>
      <p className="mt-1.5 max-w-sm text-[13px] text-ink-soft">
        {search
          ? "Tente outro nome ou CPF. A busca é case-insensitive."
          : "Os pacientes cadastrados ficam organizados aqui, com histórico completo de prescrições e anotações."}
      </p>
      {!search && (
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" /> Cadastrar paciente
        </Button>
      )}
    </div>
  );
}

interface PatientActionsProps {
  patient: Patient;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAnnotations: () => void;
  annotationPatient: Patient | undefined;
  annotations: Annotation[];
  loadingAnnotations: boolean;
  newAnnotation: { text: string; current_dose: string };
  setNewAnnotation: (a: { text: string; current_dose: string }) => void;
  handleAddAnnotation: () => void;
}

function PatientActions({
  patient, onHistory, onEdit, onDelete, onAnnotations,
  annotationPatient, annotations, loadingAnnotations,
  newAnnotation, setNewAnnotation, handleAddAnnotation,
}: PatientActionsProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAnnotations}
            className="h-8 px-2 text-ink-soft hover:text-foreground"
            title="Anotações"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-[20px] tracking-tight">
              Anotações — {annotationPatient?.full_name ?? patient.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
              <Label className="text-[12.5px]">Nova anotação</Label>
              <Textarea
                placeholder="Observações clínicas, resposta ao tratamento, ajustes…"
                value={newAnnotation.text}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, text: e.target.value })}
                className="min-h-[88px]"
              />
              <div>
                <Label className="text-[12.5px]">Dose atual</Label>
                <Input
                  placeholder="Ex.: 10 gotas 12/12h"
                  value={newAnnotation.current_dose}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, current_dose: e.target.value })}
                  className="mt-1.5 h-9"
                />
              </div>
              <Button size="sm" onClick={handleAddAnnotation} disabled={!newAnnotation.text.trim()}>
                Salvar anotação
              </Button>
            </div>

            {loadingAnnotations ? (
              <p className="text-sm text-ink-soft">Carregando…</p>
            ) : annotations.length === 0 ? (
              <p className="text-sm text-ink-soft">Nenhuma anotação registrada.</p>
            ) : (
              annotations.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex justify-between text-[11px] text-ink-soft">
                    <span className="font-mono">{new Date(a.date).toLocaleDateString("pt-BR")}</span>
                    {a.current_dose && <span>Dose: {a.current_dose}</span>}
                  </div>
                  <p className="text-[13.5px] leading-relaxed">{a.text}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button size="sm" variant="ghost" onClick={onHistory} className="h-8 px-2 text-ink-soft hover:text-foreground" title="Histórico">
        <FileText className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 px-2 text-ink-soft hover:text-foreground" title="Editar">
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-ink-soft hover:text-destructive" title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              Excluir paciente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados, prescrições e
              anotações de <strong className="text-foreground">{patient.full_name}</strong>{" "}
              serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
