import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Download, AlertTriangle, Search, Pencil, Save, X, ShoppingCart, FileText, Stethoscope } from "lucide-react";
import {
  PATHOLOGIES, PRODUCTS,
  getDoseRange, mgDayToDropsDay,
  generateTitulationProtocol, calcBottlesFromSchedule,
  isProductAvailableForPathologies, combinePathologies, isThcFreeProduct,
  type PathologyInfo, type Product, type TitulationStep, type TitulationConfig,
} from "@/lib/prescriptionData";
import { parseLocalDate, formatDateBR } from "@/lib/utils";
import { PRESCRIPTION_PURPOSES, type PrescriptionPurpose } from "@/lib/prescriptionPurpose";
import { type AnamneseAnswers, type CustomAnamneseField, emptyAnamneseAnswers, prefillAnamneseDefaults, type AnamneseContext } from "@/lib/anamneseSchema";
import { generatePrescriptionPDF, generatePatientGuidePDF, generateLegalReportPDF } from "@/lib/pdfGenerator";
import { ScientificReferencesCard } from "@/components/ScientificReferencesCard";
import { AnamneseForm } from "@/components/AnamneseForm";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

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

interface DoctorProfile {
  full_name: string;
  crm: string;
  specialty: string;
  phone: string | null;
  address: string | null;
}

export default function Prescription() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<PrescriptionPurpose | null>(null);
  const [anamneseAnswers, setAnamneseAnswers] = useState<AnamneseAnswers>(emptyAnamneseAnswers());
  const [customAnamneseFields, setCustomAnamneseFields] = useState<CustomAnamneseField[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 - Doctor (editable for this prescription)
  const [editDoctor, setEditDoctor] = useState({ full_name: "", crm: "", specialty: "", phone: "", address: "" });

  // Step 2 - Patient edit mode
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({
    full_name: "", cpf: "", rg: "", birth_date: "", weight: "", address: "", clinical_notes: "",
  });
  const [savingPatient, setSavingPatient] = useState(false);

  const startEditPatient = () => {
    if (!patient) return;
    setPatientForm({
      full_name: patient.full_name || "",
      cpf: patient.cpf || "",
      rg: patient.rg || "",
      birth_date: patient.birth_date || "",
      weight: patient.weight ? String(patient.weight) : "",
      address: patient.address || "",
      clinical_notes: patient.clinical_notes || "",
    });
    setEditingPatient(true);
  };

  const savePatient = async () => {
    if (!patient) return;
    setSavingPatient(true);
    const { data, error } = await supabase
      .from("patients")
      .update({
        full_name: patientForm.full_name,
        cpf: patientForm.cpf,
        rg: patientForm.rg || null,
        birth_date: patientForm.birth_date || null,
        weight: patientForm.weight ? parseFloat(patientForm.weight) : null,
        address: patientForm.address || null,
        clinical_notes: patientForm.clinical_notes || null,
      })
      .eq("id", patient.id)
      .select()
      .single();
    setSavingPatient(false);
    if (error) {
      toast.error("Erro ao atualizar paciente: " + error.message);
    } else {
      setPatient(data as Patient);
      setEditingPatient(false);
      toast.success("Dados do paciente atualizados!");
    }
  };

  // Step 3 - Pathologies (múltiplas / comorbidades)
  const [selectedPathologies, setSelectedPathologies] = useState<PathologyInfo[]>([]);
  const togglePathology = (p: PathologyInfo) =>
    setSelectedPathologies((prev) =>
      prev.some((x) => x.name === p.name) ? prev.filter((x) => x.name !== p.name) : [...prev, p]
    );
  const [pathologySearch, setPathologySearch] = useState("");
  const filteredPathologies = useMemo(() => {
    if (!pathologySearch.trim()) return PATHOLOGIES;
    const term = pathologySearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return PATHOLOGIES.filter((p) =>
      p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
    );
  }, [pathologySearch]);

  // Step 4 - Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Step 5 - Posology (new fields)
  const [initialDrops, setInitialDrops] = useState(2);
  const [increment, setIncrement] = useState(2);
  const [intervalDays, setIntervalDays] = useState(7);
  const [maintenanceDrops, setMaintenanceDrops] = useState(10);
  const [via, setVia] = useState("sublingual");
  const [time1, setTime1] = useState("08:00");
  const [time2, setTime2] = useState("20:00");
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [editableBottles, setEditableBottles] = useState(1);
  const [titulationSteps, setTitulationSteps] = useState<TitulationStep[]>([]);
  const [bottleBreakdown, setBottleBreakdown] = useState<{ week: number; drops: number; dropsPerDose: number; days: number }[]>([]);
  const [totalDrops30, setTotalDrops30] = useState(0);

  // Step 6 - Editable fields for documents
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  const titConfig: TitulationConfig = useMemo(() => ({
    initialDrops, increment, intervalDays, maintenanceDrops, via, time1, time2, returnDate,
  }), [initialDrops, increment, intervalDays, maintenanceDrops, via, time1, time2, returnDate]);

  useEffect(() => {
    if (!user || !patientId) return;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("doctor_id", user.id).single(),
      supabase.from("doctor_profiles").select("full_name, crm, specialty, phone, address").eq("user_id", user.id).single(),
    ]).then(([patRes, docRes]) => {
      if (patRes.data) setPatient(patRes.data);
      if (docRes.data) {
        setDoctor(docRes.data);
        setEditDoctor({
          full_name: docRes.data.full_name,
          crm: docRes.data.crm,
          specialty: docRes.data.specialty,
          phone: docRes.data.phone || "",
          address: docRes.data.address || "",
        });
      }
      setLoading(false);
    });
  }, [user, patientId]);

  // Recalculate titulation when relevant deps change
  useEffect(() => {
    if (!selectedProduct || !patient?.weight) return;

    // SEMPRE gera os passos de titulação — o Guia do Paciente precisa deles
    // mesmo no fluxo de relatório detalhado, porque o paciente faz o ajuste
    // gradual normalmente. O que muda no fluxo de relatório é apenas a
    // validade da Receita (1 ano em vez de 30 dias).
    const steps = generateTitulationProtocol(titConfig, selectedProduct, patient.weight);
    setTitulationSteps(steps);

    if (purpose === "RELATORIO_DETALHADO") {
      // Em relatório detalhado: a quantidade prescrita por mês é baseada
      // na DOSE MÁXIMA (uso contínuo após titulação). Frascos/mês =
      // ceil(maintenanceDrops * 2 * 30 / dropsPerBottle).
      const dropsPerMonth = maintenanceDrops * 2 * 30;
      const bottlesPerMonth = Math.max(1, Math.ceil(dropsPerMonth / selectedProduct.dropsPerBottle));
      setEditableBottles(bottlesPerMonth);
      setBottleBreakdown([]);
      setTotalDrops30(dropsPerMonth);
      return;
    }

    // Padrão: quantidade calculada pelo cronograma de titulação
    const calc = calcBottlesFromSchedule(titConfig, selectedProduct);
    setBottleBreakdown(calc.weeklyBreakdown);
    setTotalDrops30(calc.totalDrops);
    setEditableBottles(calc.bottles);
  }, [selectedProduct, patient?.weight, titConfig, purpose, maintenanceDrops]);

  // Regra consolidada das patologias selecionadas (comorbidades)
  const combined = useMemo(
    () => combinePathologies(selectedPathologies, patient?.weight || 0),
    [selectedPathologies, patient?.weight]
  );
  /** Patologia dominante — usada onde é preciso uma única patologia */
  const primaryPathology = combined.dominant;

  // Diagnóstico consolidado quando as patologias mudam
  useEffect(() => {
    if (selectedPathologies.length > 0) {
      setEditDiagnosis(selectedPathologies.map((p) => `${p.name} (CID-10: ${p.cid10})`).join("; "));
    } else {
      setEditDiagnosis("");
    }
    // Se o produto escolhido não é mais visível para as patologias, limpa
    setSelectedProduct((prev) =>
      prev && !isProductAvailableForPathologies(prev, selectedPathologies) ? null : prev
    );
  }, [selectedPathologies]);

  useEffect(() => {
    if (selectedProduct) {
      if (purpose === "RELATORIO_DETALHADO") {
        setEditQuantity(`${editableBottles} frasco(s) de 30 mL/mês — uso contínuo · validade 1 ano`);
      } else {
        setEditQuantity(`${editableBottles} frasco(s) de 30 mL — 30 dias até retorno médico`);
      }
    }
  }, [editableBottles, selectedProduct, purpose]);

  // Pré-preenche os textos da anamnese quando o médico chega ao Step 6 do
  // fluxo de Relatório Detalhado pela primeira vez (sem sobrescrever se já
  // editou algum campo). Os textos vêm contextualizados com nome do
  // paciente, patologia, produto, etc.
  useEffect(() => {
    if (
      step === 6 &&
      purpose === "RELATORIO_DETALHADO" &&
      patient &&
      primaryPathology &&
      selectedProduct
    ) {
      // Verifica se algum campo já tem texto — se sim, médico já editou,
      // não sobrescreve nada.
      const hasContent = Object.values(anamneseAnswers).some((v) => v && v.trim());
      if (hasContent) return;

      // Resumo dos canabinoides do produto, para ser inserido no defaultText
      const cannabinoidsSummary = selectedProduct.cannabinoids
        ?.slice(0, 4)
        .map((c) => `${c.name}${c.pct ? ` ${c.pct}%` : ""}`)
        .join(", ") || "espectro completo de canabinoides";

      const ctx: AnamneseContext = {
        patientName: patient.full_name,
        patientAge: patient.birth_date
          ? Math.floor(
              (Date.now() - (parseLocalDate(patient.birth_date)?.getTime() ?? Date.now())) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        pathology: selectedPathologies.map((p) => p.name).join(" + "),
        productLabel: selectedProduct.fullLabel,
        productLine: selectedProduct.productLine || "PRECISION",
        productCannabinoids: cannabinoidsSummary,
        doseSummary: `${maintenanceDrops} gotas a cada 12 horas (via ${via})`,
        healthcareCoverage:
          ((patient as { healthcare_coverage?: string }).healthcare_coverage as
            "SUS" | "PLANO" | "PARTICULAR" | undefined) || "PARTICULAR",
      };
      setAnamneseAnswers(prefillAnamneseDefaults(ctx));
    }
    // Disparar apenas quando entrar no step 6 (não a cada mudança de answers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, purpose, primaryPathology, selectedProduct]);

  const handleSaveAndDownload = async (docType: "receita" | "guia" | "ambos" | "relatorio") => {
    if (!user || !patient || !doctor || !selectedProduct || !primaryPathology) return;
    setSaving(true);

    const mgPerDrop = +(selectedProduct.mgMl / selectedProduct.dropsPerMl).toFixed(2);
    const mgCbdPerDrop = +((selectedProduct.mgMl * selectedProduct.cbdPct) / selectedProduct.dropsPerMl).toFixed(2);

    const prescriptionData = {
      pathology: selectedPathologies.map((p) => p.name).join(" + "),
      cid10: selectedPathologies.map((p) => p.cid10).join(", "),
      pathologies: selectedPathologies.map((p) => ({ name: p.name, cid10: p.cid10 })),
      diagnosisLabel: combined.diagnosisLabel,
      product: selectedProduct.name,
      productType: selectedProduct.typeLabel,
      titulationSteps,
      patientWeight: patient.weight,
      bottles: editableBottles,
      mgPerDrop,
      mgCbdPerDrop,
      config: titConfig,
      productFullLabel: selectedProduct.fullLabel,
      productComposition: selectedProduct.compositionLabel,
      receituarioType: selectedProduct.receituarioType,
      isLegalCase: purpose === "RELATORIO_DETALHADO",
    };

    // Payload extra com contexto de judicialização (vai no jsonb do Supabase, não nos PDFs)
    const prescriptionDataForStorage = {
      ...prescriptionData,
      purpose,
      anamneseAnswers: purpose === "RELATORIO_DETALHADO" ? anamneseAnswers : null,
      customAnamneseFields: purpose === "RELATORIO_DETALHADO" ? customAnamneseFields : null,
    };

    const insertData = {
      doctor_id: user.id,
      patient_id: patient.id,
      pathology: primaryPathology.name,
      product: selectedProduct.name,
      dose_per_kg: primaryPathology.doseType === "mg_kg" ? primaryPathology.doseTarget : null,
      calculated_dose: maintenanceDrops * 2 * mgCbdPerDrop,
      titulation_protocol: JSON.parse(JSON.stringify(titulationSteps)),
      tcle_accepted: docType === "guia" || docType === "ambos",
      prescription_data: JSON.parse(JSON.stringify(prescriptionDataForStorage)),
    };

    const { error } = await supabase.from("prescriptions").insert(insertData);
    if (error) {
      toast.error("Erro ao salvar receita: " + error.message);
      setSaving(false);
      return;
    }

    try {
      const pdfDoctor = editDoctor;
      if (docType === "receita" || docType === "ambos") {
        generatePrescriptionPDF({ doctor: pdfDoctor, patient, prescriptionData });
      }
      if (docType === "guia" || docType === "ambos") {
        generatePatientGuidePDF({ doctor: pdfDoctor, patient, prescriptionData, product: selectedProduct });
      }
      if (docType === "relatorio") {
        // Calcula idade do paciente
        let patientAge: number | null = null;
        if (patient.birth_date) {
          const dob = parseLocalDate(patient.birth_date);
          if (dob) {
            const today = new Date();
            patientAge = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) patientAge--;
          }
        }
        // Auto-preenche apenas o resumo da posologia (campo autofill).
        // Os demais campos vêm pré-preenchidos pelo prefillAnamneseDefaults
        // quando o médico abre a anamnese pela primeira vez (Step 6).
        const dropsPerDose = maintenanceDrops;
        const mgCbdDay = +(dropsPerDose * mgCbdPerDrop * 2).toFixed(1);
        const mgCanDay = +(dropsPerDose * mgPerDrop * 2).toFixed(1);
        const filledAnswers = {
          ...anamneseAnswers,
          posologia_resumo: anamneseAnswers.posologia_resumo?.trim()
            ? anamneseAnswers.posologia_resumo
            : `${dropsPerDose} gota(s) por via ${titConfig.via || "sublingual"}, de 12 em 12 horas (${titConfig.time1 || "08:00"} e ${titConfig.time2 || "20:00"}). Dose diária: ${mgCanDay} mg de canabinoides totais (${mgCbdDay} mg de CBD). Quantidade: ${editableBottles} frasco(s)/mês. Validade: 1 ano.`,
        };

        // Cobertura de saúde do paciente (campo no Supabase patients)
        const coverage = ((patient as { healthcare_coverage?: string }).healthcare_coverage as
          "SUS" | "PLANO" | "PARTICULAR" | undefined) || "PARTICULAR";

        // Responsável legal (campos no Supabase patients) — apenas se preenchidos
        const guardianName = (patient as { legal_guardian_name?: string }).legal_guardian_name;
        const guardian = guardianName
          ? {
              name: guardianName,
              cpf: (patient as { legal_guardian_cpf?: string }).legal_guardian_cpf || "",
              rg: (patient as { legal_guardian_rg?: string | null }).legal_guardian_rg || null,
              relationship: (patient as { legal_guardian_relationship?: string }).legal_guardian_relationship || "",
              phone: (patient as { legal_guardian_phone?: string | null }).legal_guardian_phone || null,
            }
          : null;

        generateLegalReportPDF({
          doctor: pdfDoctor,
          patient,
          prescriptionData,
          product: selectedProduct,
          answers: filledAnswers,
          customFields: customAnamneseFields,
          patientAge,
          healthcareCoverage: coverage,
          legalGuardian: guardian,
        });
      }
      toast.success("PDF gerado com sucesso! Você pode gerar outro documento ou finalizar.");
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Receita salva, mas houve erro ao gerar o PDF.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell pageTitle="Carregando…">
        <div className="card-editorial p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!patient) {
    return (
      <AppShell pageTitle="Paciente não encontrado">
        <div className="card-editorial p-12 text-center">
          <p className="text-[14px] text-ink-soft">
            O paciente solicitado não foi encontrado em sua conta.
          </p>
          <Button onClick={() => navigate("/")} className="mt-5">
            Voltar para a lista
          </Button>
        </div>
      </AppShell>
    );
  }

  const weight = patient.weight || 0;
  const doseRange = primaryPathology
    ? { start: combined.doseStart, target: combined.doseTarget, max: combined.doseMax }
    : null;

  const STEP_LABELS = ["Médico", "Paciente", "Finalidade", "Patologia", "Produto", "Posologia", "Revisão"];
  const totalSteps = 6;

  return (
    <AppShell
      pageEyebrow="Nova prescrição"
      pageTitle={`Receita para ${patient.full_name}`}
      pageDescription={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          <span>
            <span className="font-mono">CPF {patient.cpf}</span>
            {patient.weight && <> · <span className="font-mono tabular">{patient.weight} kg</span></>}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Sugestões baseadas em literatura. O médico tem autonomia para ajustar.
          </span>
        </span>
      }
      breadcrumbs={[
        { label: "Pacientes", href: "/" },
        { label: patient.full_name, href: `/pacientes/${patient.id}/historico` },
        { label: "Nova receita" },
      ]}
    >
      <div className="mx-auto max-w-4xl">
        {/* ─── Stepper editorial ─── */}
        <div className="card-editorial mb-6 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Progresso da prescrição</p>
            <p className="font-mono text-[11.5px] tabular text-ink-soft">
              Etapa {step} de {totalSteps}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
              const done = s < step;
              const active = s === step;
              return (
                <div
                  key={s}
                  className="flex flex-1 items-center gap-1.5"
                  aria-current={active ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      done && "bg-primary",
                      active && "bg-primary",
                      !done && !active && "bg-border"
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 hidden grid-cols-7 text-[10.5px] text-ink-soft sm:grid">
            {STEP_LABELS.map((lbl, i) => (
              <span
                key={lbl}
                className={cn(
                  "uppercase tracking-wider",
                  i + 1 === step && "font-semibold text-primary",
                  i + 1 < step && "text-foreground"
                )}
              >
                {i + 1}. {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* ═══ Step 1: Médico ═══ */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1. Dados do Médico</CardTitle>
              <CardDescription>Dados pré-preenchidos do seu perfil. Edite se necessário para esta receita.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={editDoctor.full_name} onChange={e => setEditDoctor({...editDoctor, full_name: e.target.value})} />
                </div>
                <div>
                  <Label>CRM</Label>
                  <Input value={editDoctor.crm} onChange={e => setEditDoctor({...editDoctor, crm: e.target.value})} />
                </div>
                <div>
                  <Label>Especialidade</Label>
                  <Input value={editDoctor.specialty} onChange={e => setEditDoctor({...editDoctor, specialty: e.target.value})} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editDoctor.phone} onChange={e => setEditDoctor({...editDoctor, phone: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={editDoctor.address} onChange={e => setEditDoctor({...editDoctor, address: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 2: Paciente ═══ */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>2. Paciente</CardTitle>
                  <CardDescription>Dados do paciente selecionado</CardDescription>
                </div>
                {!editingPatient && (
                  <Button variant="outline" size="sm" onClick={startEditPatient}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingPatient ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{patient.full_name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="font-medium">{patient.cpf}</p>
                    </div>
                    {patient.rg && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">RG</p>
                        <p className="font-medium">{patient.rg}</p>
                      </div>
                    )}
                    {patient.birth_date && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Data de nascimento</p>
                        <p className="font-medium">{formatDateBR(patient.birth_date)}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="text-xl font-bold text-primary">{patient.weight ? `${patient.weight} kg` : "Não informado"}</p>
                    </div>
                    {patient.address && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Endereço</p>
                        <p className="font-medium">{patient.address}</p>
                      </div>
                    )}
                  </div>
                  {!patient.weight && (
                    <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Peso não informado. Clique em Editar para informar o peso do paciente.</p>
                  )}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                    <Button onClick={() => setStep(3)} disabled={!patient.weight}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_full_name">Nome completo *</Label>
                      <Input id="p_full_name" value={patientForm.full_name} onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_cpf">CPF *</Label>
                      <Input id="p_cpf" value={patientForm.cpf} onChange={(e) => setPatientForm({ ...patientForm, cpf: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_rg">RG</Label>
                      <Input id="p_rg" value={patientForm.rg} onChange={(e) => setPatientForm({ ...patientForm, rg: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_birth">Data de nascimento</Label>
                      <Input id="p_birth" type="date" value={patientForm.birth_date} onChange={(e) => setPatientForm({ ...patientForm, birth_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_weight">Peso (kg) *</Label>
                      <Input id="p_weight" type="number" step="0.1" value={patientForm.weight} onChange={(e) => setPatientForm({ ...patientForm, weight: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_address">Endereço</Label>
                      <Input id="p_address" value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_notes">Observações clínicas</Label>
                      <Input id="p_notes" value={patientForm.clinical_notes} onChange={(e) => setPatientForm({ ...patientForm, clinical_notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingPatient(false)} disabled={savingPatient}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button onClick={savePatient} disabled={savingPatient || !patientForm.full_name || !patientForm.cpf}>
                      <Save className="h-4 w-4 mr-1" /> {savingPatient ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 3: Finalidade da prescrição ═══ */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Finalidade da prescrição</CardTitle>
              <CardDescription>
                Esta escolha define o formato dos documentos gerados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESCRIPTION_PURPOSES.map((p) => {
                  const isSelected = purpose === p.id;
                  const Icon = p.id === "RELATORIO_DETALHADO" ? Stethoscope : ShoppingCart;
                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setPurpose(p.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="font-bold text-base">{p.label}</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                      <ul className="space-y-1">
                        {p.consequences.map((c, i) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {purpose === "RELATORIO_DETALHADO" && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary-soft/40 text-sm">
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4 text-primary" /> Anamnese expandida nas próximas etapas
                  </p>
                  <p className="text-ink-soft text-xs mt-1">
                    Você preencherá uma anamnese clínica detalhada para gerar o Relatório Médico Detalhado, com história da doença, tratamentos prévios e justificativa clínica do canabidiol. Cada campo já vem com texto sugerido — você pode aceitar e ajustar conforme o caso, ou usar o microfone para ditar a fala do paciente. A receita terá dose máxima estabelecida e validade estendida de 1 ano para garantir continuidade do tratamento.
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(4)} disabled={!purpose}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 4: Patologia ═══ */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>4. Patologias / Comorbidades</CardTitle>
              <CardDescription>Selecione uma ou mais condições clínicas do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar condição..."
                  value={pathologySearch}
                  onChange={(e) => setPathologySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {filteredPathologies.map((p) => {
                  const range = getDoseRange(p, weight);
                  const isSelected = selectedPathologies.some((x) => x.name === p.name);
                  return (
                    <div
                      key={p.name}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => togglePathology(p)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{p.name}</p>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <Badge variant="outline" className="text-xs mb-2">CID-10: {p.cid10}</Badge>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">Início: {range.start} mg</Badge>
                        <Badge className="text-xs bg-primary/80">Alvo: {range.target} mg</Badge>
                        <Badge variant="destructive" className="text-xs">Máx: {range.max} mg</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Rec.: {p.recommendedProduct}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground italic">⚕ Todos os valores são sugestões baseadas na literatura. O médico é soberano na decisão terapêutica.</p>

              {selectedPathologies.length > 1 && primaryPathology && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" /> Regra consolidada ({selectedPathologies.length} patologias)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Patologia dominante (maior dose): <strong>{primaryPathology.name}</strong>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">Início: {combined.doseStart} mg</Badge>
                    <Badge className="text-xs bg-primary/80">Alvo: {combined.doseTarget} mg</Badge>
                    <Badge variant="destructive" className="text-xs">Máx: {combined.doseMax} mg</Badge>
                    <Badge variant="outline" className="text-xs">Produto sugerido: {combined.recommendedProduct}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dose inicial: menor das iniciais (start low, go slow). Dose alvo e máxima: da patologia mais exigente — a quantidade de frascos segue essa dose.
                  </p>
                  {combined.thcConflict && (
                    <p className="text-xs flex items-start gap-2 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      Há patologias com indicações divergentes quanto ao THC. Por segurança, a sugestão é o produto <strong>sem THC</strong> ({combined.recommendedProduct}).
                    </p>
                  )}
                </div>
              )}

              {selectedPathologies.map((p) => (
                <ScientificReferencesCard key={p.name} pathologyName={p.name} />
              ))}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(5)} disabled={selectedPathologies.length === 0}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 5: Produto ═══ */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>5. Produto</CardTitle>
              <CardDescription>Selecione o produto a ser prescrito</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const visibleProducts = PRODUCTS.filter(p => isProductAvailableForPathologies(p, selectedPathologies));
                const precision = visibleProducts.filter(p => p.productLine === "PRECISION");
                const essential = visibleProducts.filter(p => p.productLine === "ESSENTIAL");

                const renderProductCard = (product: Product, opts: { subdued?: boolean } = {}) => {
                  const isRecommended = combined.recommendedProduct === product.name;
                  const isSelected = selectedProduct?.name === product.name;
                  const thcWarning = combined.thcFree && !isThcFreeProduct(product.name);
                  const isSecondChoice = product.productLine === "ESSENTIAL"
                    && !!combined.recommendedProduct
                    && (product.secondChoiceFor ?? []).includes(combined.recommendedProduct);
                  return (
                    <div
                      key={product.name}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : opts.subdued
                            ? "border-border/60 hover:border-primary/40"
                            : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-lg">{product.fullLabel.split(" — ")[0]}</p>
                          <Badge variant="outline">{product.typeLabel}</Badge>
                          {isRecommended && <Badge className="bg-primary text-primary-foreground">✓ Indicado para este caso</Badge>}
                          {isSecondChoice && <Badge variant="secondary">Segunda opção</Badge>}
                          {thcWarning && <Badge variant="destructive" className="text-xs">Contém THC — comorbidade sugere produto sem THC</Badge>}
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                      {isSelected && (
                        <div className="mt-3 space-y-3">
                          <div className="p-3 rounded bg-muted text-sm">
                            <p className="font-medium mb-1">Justificativa clínica:</p>
                            <p>{product.clinicalJustification}</p>
                          </div>
                          <div className="p-3 rounded bg-muted text-sm">
                            <p className="font-medium mb-1">Justificativa canabínica:</p>
                            <p>{product.cannabinoidJustification}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">mg/gota: {((product.mgMl * product.cbdPct) / product.dropsPerMl).toFixed(2)}</Badge>
                            {doseRange && (
                              <>
                                <Badge variant="secondary">Alvo: {mgDayToDropsDay(doseRange.target, product)} gotas/dia</Badge>
                                <Badge variant="secondary">Máx: {mgDayToDropsDay(doseRange.max, product)} gotas/dia</Badge>
                              </>
                            )}
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Canabinoide</TableHead>
                                <TableHead>%</TableHead>
                                <TableHead>mg/30mL</TableHead>
                                <TableHead>mg/mL</TableHead>
                                <TableHead>mg/gota</TableHead>
                                <TableHead>Efeito</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {product.cannabinoids.map((c) => (
                                <TableRow key={c.name}>
                                  <TableCell className="font-medium">{c.name}</TableCell>
                                  <TableCell>{c.pct.toFixed(1)}%</TableCell>
                                  <TableCell>{c.mg30ml}</TableCell>
                                  <TableCell>{c.mgMl}</TableCell>
                                  <TableCell>{c.mgDrop}</TableCell>
                                  <TableCell className="text-xs">{c.effect}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {precision.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Linha Precision 7237mg</h3>
                          <Badge className="bg-primary/80">primeira opção</Badge>
                        </div>
                        <div className="space-y-3">{precision.map(p => renderProductCard(p))}</div>
                      </div>
                    )}

                    {essential.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="border-t border-border/60 pt-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Linha Essential</h3>
                            <Badge variant="outline">opção alternativa</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground italic mb-3">
                            Composição mais simples. Indicados quando os produtos da Linha Precision não estiverem disponíveis ou como alternativa de entrada ao tratamento.
                          </p>
                        </div>
                        <div className="space-y-3">{essential.map(p => renderProductCard(p, { subdued: true }))}</div>
                      </div>
                    )}
                  </>
                );
              })()}

              <p className="text-xs text-muted-foreground italic">⚕ O médico pode escolher qualquer produto — a recomendação é uma sugestão baseada na literatura.</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button
                  onClick={() => {
                    if (purpose === "RELATORIO_DETALHADO" && selectedProduct && primaryPathology) {
                      // Em judicialização, pré-calcula a dose máxima e validade de 1 ano.
                      // O Step 6 será a Anamnese Expandida (não a Posologia padrão).
                      const range = getDoseRange(primaryPathology, weight);
                      const maxMgDay = range.max;
                      const dropsPerDay = mgDayToDropsDay(maxMgDay, selectedProduct);
                      const dropsPerDose = Math.max(1, Math.round(dropsPerDay / 2));
                      setMaintenanceDrops(dropsPerDose);
                      setInitialDrops(dropsPerDose);
                      setIncrement(0);
                      setIntervalDays(0);
                      const oneYear = new Date();
                      oneYear.setFullYear(oneYear.getFullYear() + 1);
                      setReturnDate(oneYear.toISOString().slice(0, 10));
                    }
                    setStep(6);
                  }}
                  disabled={!selectedProduct}
                >
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 6: Posologia (compra direta) | Anamnese Expandida (judicialização) ═══ */}
        {step === 6 && selectedProduct && purpose === "RELATORIO_DETALHADO" && (
          <Card>
            <CardHeader>
              <CardTitle>6. Anamnese clínica detalhada</CardTitle>
              <CardDescription>
                Preencha os campos abaixo para gerar o Relatório Médico Detalhado. Cada campo já vem com texto sugerido — clique nele para editar conforme o caso, ou use o microfone para ditar / transcrever a fala do paciente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnamneseForm
                answers={anamneseAnswers}
                onChange={setAnamneseAnswers}
                customFields={customAnamneseFields}
                onCustomFieldsChange={setCustomAnamneseFields}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(7)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 6 && selectedProduct && purpose !== "RELATORIO_DETALHADO" && (
          <Card>
            <CardHeader>
              <CardTitle>6. Posologia</CardTitle>
              <CardDescription>Defina os valores exatos do protocolo de titulação — "start low, go slow"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Dose inicial (gotas/tomada)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={initialDrops}
                    onChange={e => setInitialDrops(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sugerido: 1–10 gotas. Ajuste conforme conduta clínica.</p>
                </div>
                <div>
                  <Label>Incremento (gotas/dose)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={increment}
                    onChange={e => setIncrement(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sugerido: +1 a +3 gotas. Personalize se necessário.</p>
                </div>
                <div>
                  <Label>Intervalo de ajuste</Label>
                  <Select value={String(intervalDays)} onValueChange={v => setIntervalDays(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dose de manutenção (gotas/tomada)</Label>
                  <Input type="number" min={1} max={50} value={maintenanceDrops} onChange={e => setMaintenanceDrops(Number(e.target.value) || 1)} />
                </div>
              </div>

              {/* Selectors row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Via de administração</Label>
                  <Select value={via} onValueChange={setVia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sublingual">Sublingual 60–90s</SelectItem>
                      <SelectItem value="oral">Oral com alimento</SelectItem>
                      <SelectItem value="azeite">Com azeite/gordura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário 1 (manhã)</Label>
                  <Input type="time" value={time1} onChange={e => setTime1(e.target.value)} />
                </div>
                <div>
                  <Label>Horário 2 (noite)</Label>
                  <Input type="time" value={time2} onChange={e => setTime2(e.target.value)} />
                </div>
                <div>
                  <Label>Data de retorno</Label>
                  <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                </div>
              </div>

              {/* Titulation table */}
              <div>
                <h3 className="font-semibold mb-2">Cronograma de Titulação</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sem.</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Gotas/dose</TableHead>
                        <TableHead>Freq.</TableHead>
                        <TableHead>mg can./dose</TableHead>
                        <TableHead>mg CBD/dose</TableHead>
                        <TableHead>mg CBD/dia</TableHead>
                        <TableHead>mg/kg/dia</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {titulationSteps.map((s) => (
                        <TableRow key={s.week} className={
                          s.status === "manutenção" ? "bg-primary/10" : ""
                        }>
                          <TableCell className="font-medium">{s.week}</TableCell>
                          <TableCell>{s.days}</TableCell>
                          <TableCell>{s.dropsPerDose}</TableCell>
                          <TableCell>{s.frequency}</TableCell>
                          <TableCell>{s.mgCanPerDose}</TableCell>
                          <TableCell>{s.mgCbdPerDose}</TableCell>
                          <TableCell className="font-semibold">{s.mgCbdPerDay}</TableCell>
                          <TableCell>{s.mgKgPerDay}</TableCell>
                          <TableCell>
                            {s.status === "manutenção" && <Badge className="bg-primary">Manutenção</Badge>}
                            {s.status === "titulação" && <Badge variant="secondary">Titulação</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Maintenance info */}
              {titulationSteps.find(s => s.status === "manutenção") && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-semibold text-primary">Dose de manutenção</p>
                  <p className="text-sm">
                    {maintenanceDrops} gotas/dose (12/12h) = {maintenanceDrops * 2} gotas/dia = {titulationSteps.find(s => s.status === "manutenção")!.mgCbdPerDay} mg CBD/dia — até retorno médico em 30 dias
                  </p>
                </div>
              )}

              {/* Bottle calculation */}
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <p className="font-semibold">Cálculo de frascos (30 dias)</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Gotas/dose</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Gotas consumidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bottleBreakdown.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>{b.week}</TableCell>
                          <TableCell>{b.dropsPerDose}</TableCell>
                          <TableCell>{b.days}</TableCell>
                          <TableCell>{b.drops}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>Total de gotas em 30 dias</TableCell>
                        <TableCell>{totalDrops30}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm">{totalDrops30} gotas ÷ {selectedProduct.dropsPerBottle} gotas/frasco = <strong>{Math.ceil(totalDrops30 / selectedProduct.dropsPerBottle)}</strong> frasco(s)</p>
                  <div className="flex items-center gap-2">
                    <Label>Frascos (editável):</Label>
                    <Input type="number" min={1} className="w-20" value={editableBottles} onChange={e => setEditableBottles(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium">⚠ Nota clínica:</p>
                <p>Canabinoides são metabolizados via CYP3A4 e CYP2C19. Verificar possíveis interações medicamentosas, especialmente com anticoagulantes, antiepilépticos e benzodiazepínicos.</p>
              </div>

              <p className="text-xs text-muted-foreground italic">⚕ Todas as sugestões são baseadas em literatura clínica. O médico tem autonomia total para ajustar qualquer valor.</p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(7)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 7: Documentos ═══ */}
        {step === 7 && selectedProduct && primaryPathology && (
          <Card>
            <CardHeader>
              <CardTitle>7. Documentos</CardTitle>
              <CardDescription>Revise os dados e gere os PDFs. Todos os campos são editáveis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {purpose === "RELATORIO_DETALHADO" && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary-soft/40 text-sm">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Prescrição com relatório médico detalhado
                  </p>
                  <p className="text-xs text-ink-soft mt-1">
                    A receita será emitida com dose máxima estabelecida ({maintenanceDrops} gotas × 2/dia) e validade de 1 ano para garantir continuidade do tratamento. O Guia do Paciente segue o protocolo padrão de titulação progressiva — o paciente faz o ajuste gradual normalmente, o que muda é apenas a validade da receita. O Relatório Médico Detalhado é gerado a partir da anamnese clínica preenchida.
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="font-medium">Dr(a). {editDoctor.full_name} — CRM {editDoctor.crm} — {editDoctor.specialty}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium">{patient.full_name} — CPF: {patient.cpf} — Peso: {patient.weight} kg</p>
                </div>
                <div>
                  <Label>Diagnóstico + CID-10</Label>
                  <Input value={editDiagnosis} onChange={e => setEditDiagnosis(e.target.value)} />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium">{selectedProduct.fullLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProduct.receituarioType}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Posologia resumida</p>
                  <p className="font-medium text-sm">
                    Via {via} · {time1}h e {time2}h · Dose inicial: {initialDrops} gotas · Incremento: +{increment} gotas a cada {intervalDays} dias · Manutenção: {maintenanceDrops} gotas/dose
                  </p>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Data de retorno</p>
                  <p className="font-medium">{returnDate ? new Date(returnDate + "T12:00:00").toLocaleDateString("pt-BR") : "A definir"}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold">Gerar documentos:</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleSaveAndDownload("receita")} disabled={saving} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Receita Médica (PDF)"}
                  </Button>
                  <Button onClick={() => handleSaveAndDownload("guia")} disabled={saving} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Guia do Paciente (PDF)"}
                  </Button>
                  {purpose === "RELATORIO_DETALHADO" && (
                    <Button onClick={() => handleSaveAndDownload("relatorio")} disabled={saving} variant="outline" className="border-primary/40 hover:border-primary/60 hover:bg-primary-soft/40">
                      <FileText className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Relatório Médico Detalhado (PDF)"}
                    </Button>
                  )}
                  <Button onClick={() => handleSaveAndDownload("ambos")} disabled={saving}>
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Gerar Receita + Guia"}
                  </Button>
                </div>
                {purpose === "RELATORIO_DETALHADO" && (
                  <p className="text-xs text-ink-soft italic">
                    O Relatório Médico Detalhado é gerado a partir da anamnese clínica que você preencheu na etapa anterior. É um documento médico fundamentado, sem termos jurídicos.
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(6)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => navigate(`/pacientes/${patient.id}/historico`)}>
                  Finalizar Prescrição
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
