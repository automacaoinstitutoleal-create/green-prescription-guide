import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session via the URL hash automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível redefinir: " + error.message);
    } else {
      toast.success("Senha redefinida com sucesso.");
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2">
          <BrandMark size={26} className="text-primary" />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            <span className="font-normal italic text-primary">Precision</span>
          </span>
        </div>
        <p className="eyebrow mb-3">Redefinir senha</p>
        <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight">
          Crie uma nova senha
        </h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          {ready
            ? "Digite a nova senha que você usará para entrar na plataforma."
            : "Validando seu link de recuperação..."}
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[12.5px]">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11"
              disabled={!ready}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-[12.5px]">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11"
              disabled={!ready}
            />
          </div>
          <Button type="submit" className="h-11 w-full text-[14px]" disabled={loading || !ready}>
            {loading ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
