import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Save, UserPlus, UserCog2 } from "lucide-react";

export default function NewPatient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();
  const isEdit = Boolean(patientId);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    rg: "",
    birth_date: "",
    weight: "",
    address: "",
    clinical_notes: "",
  });

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
      });
      setLoadingData(false);
    })();
  }, [isEdit, patientId, user, navigate]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      full_name: form.full_name,
      cpf: form.cpf,
      rg: form.rg || null,
      birth_date: form.birth_date || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      address: form.address || null,
      clinical_notes: form.clinical_notes || null,
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
              <Field label="Nome completo" required value={form.full_name} onChange={set("full_name")} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CPF" required mono placeholder="000.000.000-00" value={form.cpf} onChange={set("cpf")} />
                <Field label="RG" mono value={form.rg} onChange={set("rg")} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Data de nascimento" type="date" value={form.birth_date} onChange={set("birth_date")} />
                <Field label="Peso (kg)" type="number" mono placeholder="72.5" value={form.weight} onChange={set("weight")} />
              </div>

              <Field label="Endereço completo" placeholder="Rua, número, bairro, cidade/UF" value={form.address} onChange={set("address")} />

              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Observações clínicas iniciais</Label>
                <Textarea
                  value={form.clinical_notes}
                  onChange={set("clinical_notes")}
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
              <p className="eyebrow mb-2">Importante</p>
              <p className="text-[13px] leading-relaxed">
                O <strong>peso</strong> é essencial para o cálculo da titulação
                em mg/kg/dia. Se ainda não tiver, pode atualizar mais tarde antes
                da primeira receita.
              </p>
            </div>
            <div className="card-editorial p-5">
              <p className="eyebrow mb-2">LGPD</p>
              <p className="text-[12.5px] text-ink-soft leading-relaxed">
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
  label, value, onChange, required, mono, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  mono?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`h-10 ${mono ? "font-mono" : ""}`}
        step={type === "number" ? "0.1" : undefined}
      />
    </div>
  );
}
