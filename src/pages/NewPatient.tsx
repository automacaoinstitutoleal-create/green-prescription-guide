import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      toast.error((isEdit ? "Erro ao atualizar paciente: " : "Erro ao cadastrar paciente: ") + error.message);
    } else {
      toast.success(isEdit ? "Paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!");
      navigate("/");
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 p-4">
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Editar Paciente" : "Cadastrar Paciente"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" name="cpf" value={form.cpf} onChange={handleChange} required placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input id="rg" name="rg" value={form.rg} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de nascimento</Label>
                  <Input id="birth_date" name="birth_date" type="date" value={form.birth_date} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" name="weight" type="number" step="0.1" value={form.weight} onChange={handleChange} placeholder="Ex: 72.5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" name="address" value={form.address} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinical_notes">Observações clínicas</Label>
                <Textarea id="clinical_notes" name="clinical_notes" value={form.clinical_notes} onChange={handleChange} rows={4} placeholder="Informações relevantes do quadro clínico..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => navigate("/")}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
