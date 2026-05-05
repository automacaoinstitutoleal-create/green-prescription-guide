import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { Download, FileText, BookOpen, Calendar, Activity, Scale } from "lucide-react";
import { generatePrescriptionPDF, generatePatientGuidePDF } from "@/lib/pdfGenerator";
import { PRODUCTS } from "@/lib/prescriptionData";
import { cn } from "@/lib/utils";

interface PrescriptionRow {
  id: string;
  pathology: string;
  product: string;
  calculated_dose: number | null;
  dose_per_kg: number | null;
  tcle_accepted: boolean;
  prescription_data: Record<string, unknown>;
  created_at: string;
}

interface Patient {
  id: string;
  full_name: string;
  cpf: string;
  rg: string | null;
  birth_date: string | null;
  weight: number | null;
  address: string | null;
  clinical_notes: string | null;
}

const ageFromBirth = (birth: string | null) => {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<{ full_name: string; crm: string; specialty: string; phone: string | null; address: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !patientId) return;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("doctor_id", user.id).single(),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).eq("doctor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("doctor_profiles").select("full_name, crm, specialty, phone, address").eq("user_id", user.id).single(),
    ]).then(([patRes, prescRes, docRes]) => {
      if (patRes.data) setPatient(patRes.data);
      if (prescRes.data) setPrescriptions(prescRes.data as PrescriptionRow[]);
      if (docRes.data) setDoctor(docRes.data);
      setLoading(false);
    });
  }, [user, patientId]);

  const handleRedownload = (presc: PrescriptionRow) => {
    if (!patient || !doctor) return;
    const pd = presc.prescription_data as unknown as Parameters<typeof generatePrescriptionPDF>[0]["prescriptionData"];
    generatePrescriptionPDF({ doctor, patient, prescriptionData: pd });
  };

  const handleDownloadGuide = (presc: PrescriptionRow) => {
    if (!patient || !doctor) return;
    const pd = presc.prescription_data as unknown as Parameters<typeof generatePatientGuidePDF>[0]["prescriptionData"];
    const product = PRODUCTS.find((p) => p.name === presc.product);
    if (!product) return;
    generatePatientGuidePDF({ doctor, patient, prescriptionData: pd, product });
  };

  const age = useMemo(() => (patient?.birth_date ? ageFromBirth(patient.birth_date) : null), [patient]);
  const initials = patient?.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "—";

  return (
    <AppShell
      pageEyebrow="Prontuário"
      pageTitle={loading ? "Carregando…" : patient?.full_name || "Paciente"}
      pageDescription={
        patient && (
          <>
            Histórico clínico, prescrições emitidas e dados de identificação do paciente.
          </>
        )
      }
      breadcrumbs={[
        { label: "Pacientes", href: "/" },
        { label: patient?.full_name || "—" },
      ]}
    >
      {loading ? (
        <div className="card-editorial p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Coluna lateral: ficha do paciente */}
          <aside className="space-y-4">
            <div className="card-editorial p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-mono text-[14px] font-semibold tracking-wider text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[16px] font-semibold leading-tight tracking-tight">
                    {patient?.full_name}
                  </p>
                  {age != null && <p className="text-[12px] text-ink-soft">{age} anos</p>}
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-border pt-4 text-[12.5px]">
                <DataRow label="CPF" value={patient?.cpf} mono />
                {patient?.rg && <DataRow label="RG" value={patient.rg} mono />}
                {patient?.birth_date && (
                  <DataRow label="Nascimento" value={new Date(patient.birth_date).toLocaleDateString("pt-BR")} mono />
                )}
                {patient?.weight && <DataRow label="Peso" value={`${patient.weight} kg`} mono />}
                {patient?.address && <DataRow label="Endereço" value={patient.address} />}
              </dl>
            </div>

            {patient?.clinical_notes && (
              <div className="card-editorial p-5">
                <p className="eyebrow mb-2">Observações clínicas</p>
                <p className="text-[12.5px] leading-relaxed text-foreground whitespace-pre-line">
                  {patient.clinical_notes}
                </p>
              </div>
            )}

            <div className="card-editorial p-5">
              <p className="eyebrow mb-3">Resumo do tratamento</p>
              <div className="space-y-3">
                <Stat icon={FileText} label="Prescrições emitidas" value={prescriptions.length} />
                <Stat icon={Calendar} label="Última receita" value={prescriptions[0] ? new Date(prescriptions[0].created_at).toLocaleDateString("pt-BR") : "—"} />
                <Stat icon={Activity} label="Última patologia" value={prescriptions[0]?.pathology || "—"} />
              </div>
            </div>
          </aside>

          {/* Conteúdo: linha do tempo de prescrições */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-semibold tracking-tight">
                Linha do tempo de prescrições
              </h2>
              <span className="text-[12px] text-ink-soft tabular">
                {prescriptions.length} registro(s)
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="card-editorial flex flex-col items-center px-6 py-16 text-center">
                <FileText className="h-8 w-8 text-ink-soft" />
                <p className="mt-3 font-display text-[18px] font-medium">Nenhuma prescrição registrada</p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Ao emitir a primeira receita para este paciente, ela aparece aqui.
                </p>
              </div>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {prescriptions.map((p, i) => (
                  <li
                    key={p.id}
                    className={cn(
                      "card-editorial relative p-5 transition-shadow hover:shadow-elev-2",
                      i === 0 && "border-primary/30"
                    )}
                  >
                    {/* Marker da timeline */}
                    <span
                      className={cn(
                        "absolute left-[-2.05rem] top-6 h-3 w-3 rounded-full border-2 border-background",
                        i === 0 ? "bg-primary" : "bg-border-strong"
                      )}
                      aria-hidden
                    />

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[12px] text-ink-soft">
                            {new Date(p.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "long", year: "numeric",
                            })}
                          </p>
                          {i === 0 && <span className="chip-primary">Receita atual</span>}
                        </div>
                        <h3 className="mt-1 font-display text-[18px] font-semibold tracking-tight">
                          {p.pathology}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleRedownload(p)}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Receita
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadGuide(p)}>
                          <BookOpen className="mr-1 h-3.5 w-3.5" />
                          Guia
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                      <Pill label="Produto" value={p.product} />
                      <Pill label="Dose" value={p.calculated_dose != null ? `${p.calculated_dose} mg/dia` : "—"} mono />
                      <Pill label="mg/kg/dia" value={p.dose_per_kg != null ? `${p.dose_per_kg}` : "—"} mono />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

function DataRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className={cn("min-w-0 text-right text-foreground", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 text-ink-soft">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-ink-soft">{label}</p>
        <p className="truncate text-[13px] font-medium text-foreground tabular">{value}</p>
      </div>
    </div>
  );
}

function Pill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] uppercase tracking-wider text-ink-soft">{label}</span>
      <span className={cn("mt-0.5 text-[13.5px] font-medium text-foreground", mono && "font-mono tabular")}>
        {value}
      </span>
    </div>
  );
}
