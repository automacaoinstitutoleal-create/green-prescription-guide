import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Save, IdCard } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    crm: "",
    specialty: "",
    phone: "",
    address: "",
    email: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("doctor_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name || "",
          crm: data.crm || "",
          specialty: data.specialty || "",
          phone: data.phone || "",
          address: data.address || "",
          email: (data as { email?: string }).email || "",
        });
      }
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { email: _email, ...updateData } = form;
    const { error } = await supabase.from("doctor_profiles").update(updateData).eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Perfil atualizado");
    }
  };

  return (
    <AppShell
      pageEyebrow="Identificação profissional"
      pageTitle="Meu perfil"
      pageDescription="Estes dados aparecem nas receitas, no Guia do Paciente e no Relatório Médico Detalhado."
      breadcrumbs={[{ label: "Pacientes", href: "/" }, { label: "Meu perfil" }]}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal: form */}
        <form onSubmit={handleSave} className="card-editorial p-6 lg:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-[18px] font-semibold tracking-tight">Dados do médico</h2>
              <p className="text-[12.5px] text-ink-soft">Atualize sempre que houver mudança no consultório.</p>
            </div>
          </div>

          <div className="space-y-5">
            <Field
              label="Nome completo"
              required
              value={form.full_name}
              onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
              hint="Como aparece no carimbo (ex.: Maria Silva Santos)."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="CRM"
                required
                mono
                value={form.crm}
                onChange={(v) => setForm((f) => ({ ...f, crm: v }))}
                placeholder="000000-UF"
              />
              <Field
                label="Especialidade"
                required
                value={form.specialty}
                onChange={(v) => setForm((f) => ({ ...f, specialty: v }))}
                placeholder="Neurologia, Reumatologia, Psiquiatria…"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="E-mail profissional"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="seu@consultorio.com.br"
                type="email"
              />
              <Field
                label="Telefone do consultório"
                mono
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <Field
              label="Endereço profissional"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              placeholder="Rua, número, sala, bairro, cidade/UF"
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button type="submit" disabled={loading} className="h-10 px-5">
              <Save className="mr-1.5 h-4 w-4" />
              {loading ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>

        {/* Coluna lateral: nota institucional */}
        <aside className="space-y-4">
          <div className="card-editorial p-5">
            <p className="eyebrow mb-2">Importante</p>
            <p className="text-[13px] leading-relaxed text-foreground">
              As informações de CRM e especialidade são impressas literalmente
              em todos os documentos gerados (receita, guia, relatório). Confira
              antes de emitir prescrições.
            </p>
          </div>
          <div className="card-editorial p-5">
            <p className="eyebrow mb-2">Conformidade</p>
            <ul className="space-y-1.5 text-[12.5px] text-ink-soft">
              <li>· CFM 2.113/2014 — prescrição de canabidiol</li>
              <li>· LGPD — proteção de dados clínicos</li>
              <li>· RDC 660/2022 — importação por pessoa física</li>
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({
  label, value, onChange, required, mono, placeholder, hint, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: string;
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
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`h-10 ${mono ? "font-mono" : ""}`}
      />
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
