import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { ArrowRight, ShieldCheck, FileText, BookOpen, Stethoscope } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) {
      toast.error("Não foi possível enviar: " + error.message);
    } else {
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar: " + error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ────────── Painel esquerdo: brand & credibilidade ────────── */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Padrão de fundo: linhas verticais sutis tipo papel timbrado */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 56px)",
          }}
          aria-hidden
        />
        {/* Mancha de luz no canto superior direito */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(0 0% 100% / 0.6), transparent)" }}
          aria-hidden
        />

        {/* Topo */}
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

        {/* Bloco editorial */}
        <div className="relative max-w-[480px]">
          <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-primary-foreground/70">
            Para quem prescreve canabidiol com critério clínico
          </p>
          <h2 className="font-display text-[44px] font-medium leading-[1.05] tracking-tight">
            Da anamnese à receita,
            <br />
            <span className="italic">com rigor científico</span>
            <br />
            e identidade institucional.
          </h2>
          <p className="mt-6 max-w-[420px] text-[15px] leading-relaxed text-primary-foreground/85">
            Calcule a titulação, gere receita e guia do paciente e mantenha o
            histórico clínico completo. Tudo em um fluxo desenhado por médicos.
          </p>
        </div>

        {/* Quatro pilares */}
        <div className="relative grid grid-cols-2 gap-4 border-t border-primary-foreground/15 pt-6">
          {[
            { icon: Stethoscope, title: "Titulação por peso", body: "Cálculo automático da dose mg/kg/dia." },
            { icon: FileText, title: "Receita + Guia", body: "PDFs prontos para impressão e arquivo." },
            { icon: ShieldCheck, title: "Relatório detalhado", body: "Anamnese expandida com pré-preenchimento e captura de voz." },
            { icon: BookOpen, title: "Biblioteca", body: "Referências peer-reviewed organizadas por patologia." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground/80" />
              <div>
                <p className="text-[13px] font-semibold leading-tight">{title}</p>
                <p className="mt-1 text-[12px] leading-snug text-primary-foreground/70">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ────────── Painel direito: formulário ────────── */}
      <div className="flex flex-col bg-background">
        {/* Topo mobile */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark size={26} className="text-primary" />
            <span className="font-display text-[17px] font-semibold tracking-tight">
              <span className="font-normal italic text-primary">Precision</span>
            </span>
          </div>
        </header>

        {/* Formulário centrado */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
          <div className="w-full max-w-[400px]">
            <p className="eyebrow mb-3">Acesso médico</p>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight">
              Entrar na plataforma
            </h1>
            <p className="mt-2 text-[14px] text-ink-soft">
              Use o e-mail cadastrado no seu perfil profissional.
            </p>

            <form onSubmit={handleLogin} className="mt-9 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[12.5px]">E-mail profissional</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="dr.silva@clinica.com.br"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[12.5px]">Senha</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetting}
                    className="text-[11.5px] text-ink-soft hover:text-primary disabled:opacity-60"
                  >
                    {resetting ? "Enviando..." : "Esqueci minha senha"}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              <Button type="submit" className="group h-11 w-full text-[14px]" disabled={loading}>
                {loading ? "Entrando..." : (
                  <>
                    Entrar
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-[13px] text-ink-soft">
                Primeira vez aqui?{" "}
                <Link to="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
                  Cadastre-se como médico
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
