import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Save, UserPlus, UserCog2, Users, Heart, ShieldAlert } from "lucide-react";

type HealthcareCoverage = "SUS" | "PLANO" | "PARTICULAR";

interface FormState {
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  weight: string;
  address: string;
  clinical_notes: string;
  healthcare_coverage: HealthcareCoverage;
  legal_guardian_name: string;
  legal_guardian_cpf: string;
  legal_guardian_rg: string;
  legal_guardian_relationship: string;
  legal_guardian_phone: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  cpf: "",
  rg: "",
  birth_date: "",
  weight: "",
  address: "",
  clinical_notes: "",
  healthcare_coverage: "PARTICULAR",
  legal_guardian_name: "",
  legal_guardian_cpf: "",
  legal_guardian_rg: "",
  legal_guardian_relationship: "",
  legal_guardian_phone: "",
};

/** Idade em anos a partir da data de nascimento (ISO YYYY-MM-DD). */
function calcAge(isoDate: string): number | null {
  if (!isoDate) return null;
  const b = new Date(isoDate + "T00:00:00");
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export default function NewPatient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();
  const isEdit = Boolean(patientId);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();
      if (error || !data) {
        toast.error("Paciente não encontrado");
        navigate("/");
        return;
      }
      setForm({
        full_name: data.full_name ?? "",
        cpf: data.cpf ?? "",
        rg: data.rg ?? "",
        birth_date: data.birth_date ?? "",
        weight: data.weight != null ? String(data.weight) : "",
        address: data.address ?? "",
        clinical_notes: data.clinical_notes ?? "",
        healthcare_coverage: (data.healthcare_coverage as HealthcareCoverage) ?? "PARTICULAR",
        legal_guardian_name: data.legal_guardian_name ?? "",
        legal_guardian_cpf: data.legal_guardian_cpf ?? "",
        legal_guardian_rg: data.legal_guardian_rg ?? "",
        legal_guardian_relationship: data.legal_guardian_relationship ?? "",
        legal_guardian_phone: data.legal_guardian_phone ?? "",
      });
      setLoadingData(false);
    })();
  }, [isEdit, patientId, user, navigate]);

  const set = <K extends keyof FormState>(field: K) => (value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Detecção de menor de idade
  const age = useMemo(() => calcAge(form.birth_date), [form.birth_date]);
  const isMinor = age != null && age < 18;
  const minorRequiresGuardian = isMinor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validações reforçadas
    if (!form.birth_date) {
      toast.error("Data de nascimento é obrigatória — usada para calcular a dose por peso e idade.");
      return;
    }
    if (!form.weight || parseFloat(form.weight) <= 0) {
      toast.error("Peso é obrigatório — usado para calcular a dose ideal de canabidiol.");
      return;
    }
    if (!form.address.trim()) {
      toast.error("Endereço completo é obrigatório — usado para a entrega da medicação importada.");
      return;
    }
    if (minorRequiresGuardian) {
      if (!form.legal_guardian_name.trim() || !form.legal_guardian_cpf.trim() || !form.legal_guardian_relationship.trim()) {
        toast.error("Paciente menor de 18 anos: dados do responsável legal são obrigatórios.");
        return;
      }
    }

    setLoading(true);

    const payload = {
      full_name: form.full_name,
      cpf: form.cpf,
      rg: form.rg || null,
      birth_date: form.birth_date,
      weight: parseFloat(form.weight),
      address: form.address,
      clinical_notes: form.clinical_notes || null,
      healthcare_coverage: form.healthcare_coverage,
      legal_guardian_name: minorRequiresGuardian ? form.legal_guardian_name : null,
      legal_guardian_cpf: minorRequiresGuardian ? form.legal_guardian_cpf : null,
      legal_guardian_rg: minorRequiresGuardian ? (form.legal_guardian_rg || null) : null,
      legal_guardian_relationship: minorRequiresGuardian ? form.legal_guardian_relationship : null,
      legal_guardian_phone: minorRequiresGuardian ? (form.legal_guardian_phone || null) : null,
    };

    const { error } = isEdit
      ? await supabase.from("patients").update(payload).eq("id", patientId!)
      : await supabase.from("patients").insert({ doctor_id: user.id, ...payload });

    setLoading(false);
    if (error) {
      toast.error((isEdit ? "Erro ao atualizar: " : "Erro ao cadastrar: ") + error.message);
    } else {
      toast.success(isEdit ? "Paciente atualizado" : "Paciente cadastrado");
      navigate("/");
    }
  };

  const Icon = isEdit ? UserCog2 : UserPlus;

  return (
    <AppShell
      pageEyebrow={isEdit ? "Editar registro" : "Novo cadastro"}
      pageTitle={isEdit ? "Editar paciente" : "Cadastrar paciente"}
      pageDescription="Os dados básicos do paciente são usados na receita, no guia e no relatório médico. Mantenha-os sempre atualizados."
      breadcrumbs={[
        { label: "Pacientes", href: "/" },
        { label: isEdit ? "Editar" : "Novo paciente" },
      ]}
    >
      {loadingData ? (
        <div className="card-editorial p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-[13px] text-ink-soft">Carregando dados…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit} className="card-editorial p-6 lg:p-8">
            {/* ── Identificação ── */}
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-[18px] font-semibold tracking-tight">
                  Identificação do paciente
                </h2>
                <p className="text-[12.5px] text-ink-soft">
                  Campos com <span className="text-destructive">*</span> são obrigatórios.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Field
                label="Nome completo"
                required
                value={form.full_name}
                onChange={set("full_name")}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CPF" required mono placeholder="000.000.000-00" value={form.cpf} onChange={set("cpf")} />
                <Field label="RG" mono value={form.rg} onChange={set("rg")} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Data de nascimento"
                  required
                  type="date"
                  value={form.birth_date}
                  onChange={set("birth_date")}
                  hint={age != null ? `${age} ano${age === 1 ? "" : "s"}${isMinor ? " · menor de idade" : ""}` : "Necessária para cálculo de dose por idade."}
                />
                <Field
                  label="Peso (kg)"
                  required
                  type="number"
                  mono
                  placeholder="72.5"
                  value={form.weight}
                  onChange={set("weight")}
                  hint="Necessário para cálculo de dose em mg/kg/dia."
                />
              </div>

              <Field
                label="Endereço completo"
                required
                placeholder="Rua, número, complemento, bairro, cidade/UF, CEP"
                value={form.address}
                onChange={set("address")}
                hint="Necessário para a entrega do medicamento importado."
              />

              {/* ── Cobertura de saúde ── */}
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <Label className="text-[13px] font-semibold">Cobertura de saúde do paciente</Label>
                  <span className="text-destructive">*</span>
                </div>
                <p className="text-[11.5px] text-ink-soft">
                  Influencia a redação do relatório médico — o conteúdo se ajusta automaticamente ao perfil do paciente.
                </p>
                <RadioGroup
                  value={form.healthcare_coverage}
                  onValueChange={(v) => set("healthcare_coverage")(v as HealthcareCoverage)}
                  className="mt-2 flex flex-wrap gap-x-6 gap-y-2"
                >
                  <RadioOption value="SUS" label="SUS (paciente do sistema público)" />
                  <RadioOption value="PLANO" label="Plano de saúde" />
                  <RadioOption value="PARTICULAR" label="Particular" />
                </RadioGroup>
              </div>

              {/* ── Responsável legal (aparece se menor) ── */}
              {minorRequiresGuardian && (
                <div className="space-y-4 rounded-lg border border-warning/40 bg-warning/5 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    <Label className="text-[13px] font-semibold">Responsável legal</Label>
                    <span className="text-destructive">*</span>
                  </div>
                  <p className="text-[11.5px] text-ink-soft">
                    Paciente com {age} anos. Dados do responsável legal aparecerão na receita e no relatório médico.
                  </p>

                  <Field
                    label="Nome completo do responsável"
                    required
                    value={form.legal_guardian_name}
                    onChange={set("legal_guardian_name")}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="CPF do responsável" required mono placeholder="000.000.000-00" value={form.legal_guardian_cpf} onChange={set("legal_guardian_cpf")} />
                    <Field label="RG do responsável" mono value={form.legal_guardian_rg} onChange={set("legal_guardian_rg")} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Parentesco / vínculo"
                      required
                      placeholder="Pai, Mãe, Tutor, Curador…"
                      value={form.legal_guardian_relationship}
                      onChange={set("legal_guardian_relationship")}
                    />
                    <Field
                      label="Telefone de contato"
                      mono
                      placeholder="(00) 00000-0000"
                      value={form.legal_guardian_phone}
                      onChange={set("legal_guardian_phone")}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Observações clínicas iniciais</Label>
                <Textarea
                  value={form.clinical_notes}
                  onChange={(e) => set("clinical_notes")(e.target.value)}
                  rows={4}
                  placeholder="Histórico relevante, comorbidades, medicações em uso, alergias…"
                  className="resize-y"
                />
                <p className="text-[11px] text-ink-soft">
                  Estas observações ficam no prontuário e podem ser consultadas em qualquer prescrição.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={() => navigate("/")} className="h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="h-10 px-5">
                <Save className="mr-1.5 h-4 w-4" />
                {loading ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar paciente"}
              </Button>
            </div>
          </form>

          {/* Coluna lateral */}
          <aside className="space-y-4">
            <div className="card-editorial p-5">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="eyebrow !mb-0">Por que esses dados?</p>
              </div>
              <ul className="space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
                <li>
                  <strong className="text-foreground">Peso</strong> — base do cálculo
                  da dose em mg/kg/dia.
                </li>
                <li>
                  <strong className="text-foreground">Data de nascimento</strong> —
                  ajusta o protocolo conforme idade e identifica menores que
                  precisam de responsável legal.
                </li>
                <li>
                  <strong className="text-foreground">Endereço completo</strong> —
                  usado para entrega do produto importado pela Greenlion.
                </li>
                <li>
                  <strong className="text-foreground">Cobertura de saúde</strong> —
                  ajusta a redação do relatório médico conforme o perfil
                  assistencial do paciente.
                </li>
              </ul>
            </div>
            <div className="card-editorial p-5">
              <p className="eyebrow mb-2">LGPD</p>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Os dados do paciente são acessíveis apenas pela sua conta médica.
                Toda comunicação com o servidor é cifrada.
              </p>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function Field({
  label, value, onChange, required, mono, placeholder, type = "text", hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  mono?: boolean;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`h-10 ${mono ? "font-mono" : ""}`}
        step={type === "number" ? "0.1" : undefined}
      />
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <RadioGroupItem value={value} id={`coverage-${value}`} />
      <span className="text-[12.5px]">{label}</span>
    </label>
  );
}
