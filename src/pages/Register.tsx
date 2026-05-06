import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [crm, setCrm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error("Erro no cadastro: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("doctor_profiles").update({
        crm,
        specialty,
        full_name: fullName,
      }).eq("user_id", data.user.id);
    }

    setLoading(false);
    toast.success("Cadastro realizado. Verifique seu e-mail.");
    navigate("/login");
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Painel esquerdo */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 56px)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(0 0% 100% / 0.6), transparent)" }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <BrandMark size={36} variant="outline" className="text-primary-foreground" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[22px] font-semibold tracking-tight">
              <span className="font-normal italic">Precision</span>
            </span>
            <span className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-primary-foreground/70">
              Plataforma médica
            </span>
          </div>
        </div>

        <div className="relative max-w-[480px]">
          <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-primary-foreground/70">
            Bem-vindo(a)
          </p>
          <h2 className="font-display text-[44px] font-medium leading-[1.05] tracking-tight">
            Crie sua conta médica
            <br />
            <span className="italic">em poucos minutos.</span>
          </h2>
          <p className="mt-6 max-w-[420px] text-[15px] leading-relaxed text-primary-foreground/85">
            Tenha acesso à plataforma completa de prescrição assistida —
            calculadora de titulação, geração de receitas e relatórios médicos
            detalhados, biblioteca científica organizada por patologia.
          </p>
        </div>

        <div className="relative border-t border-primary-foreground/15 pt-6 text-[12px] text-primary-foreground/70">
          O cadastro é restrito a profissionais com CRM ativo. Você receberá
          um e-mail de confirmação para ativar a conta.
        </div>
      </aside>

      {/* Painel direito: form */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark size={26} className="text-primary" />
            <span className="font-display text-[17px] font-semibold tracking-tight">
              <span className="font-normal italic text-primary">Precision</span>
            </span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[420px]">
            <p className="eyebrow mb-3">Cadastro médico</p>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight">
              Crie sua conta
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Preencha os dados profissionais. Você poderá completar o perfil depois.
            </p>

            <form onSubmit={handleRegister} className="mt-9 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Nome completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Dr(a). João Silva"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">CRM</Label>
                  <Input
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    required
                    placeholder="000000-UF"
                    className="h-11 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Especialidade</Label>
                  <Input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    required
                    placeholder="Neurologia"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12.5px]">E-mail profissional</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@consultorio.com.br"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11"
                />
              </div>

              <Button type="submit" className="group h-11 w-full text-[14px]" disabled={loading}>
                {loading ? "Cadastrando…" : (
                  <>
                    Criar conta
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-[13px] text-ink-soft">
                Já tem conta?{" "}
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Entrar
                </Link>
              </p>
            </div>

            <div className="mt-12 flex items-center gap-3 text-[11px] text-ink-soft">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Acesso restrito · Conformidade CFM 2.113/2014 · LGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
