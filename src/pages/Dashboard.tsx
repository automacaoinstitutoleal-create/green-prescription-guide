import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Leaf, LogOut, Plus, Search, FileText, User, StickyNote } from "lucide-react";
import { toast } from "sonner";

interface Patient {
  id: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  weight: number | null;
  created_at: string;
  last_prescription?: { created_at: string; product: string } | null;
}

interface DoctorProfile {
  full_name: string;
  crm: string;
  specialty: string;
}

interface Annotation {
  id: string;
  date: string;
  text: string;
  current_dose: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Annotation dialog
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
    const [docRes, patRes] = await Promise.all([
      supabase.from("doctor_profiles").select("full_name, crm, specialty").eq("user_id", user.id).single(),
      supabase.from("patients").select("id, full_name, cpf, birth_date, weight, created_at").eq("doctor_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (docRes.data) setDoctor(docRes.data);

    if (patRes.data) {
      // Fetch last prescription for each patient
      const patientsWithPrescriptions = await Promise.all(
        patRes.data.map(async (p) => {
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
    toast.success("Anotação salva!");
    setNewAnnotation({ text: "", current_dose: "" });
    loadAnnotations(annotationPatientId);
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const annotationPatient = patients.find(p => p.id === annotationPatientId);

  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Greenlion Precision</h1>
              {doctor && (
                <p className="text-xs text-muted-foreground">
                  {doctor.full_name} — CRM {doctor.crm} — {doctor.specialty}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              <User className="h-4 w-4 mr-1" /> Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Pacientes</h2>
            <p className="text-muted-foreground">{patients.length} paciente(s) cadastrado(s)</p>
          </div>
          <Button onClick={() => navigate("/pacientes/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Paciente
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => navigate("/pacientes/novo")}>
                  <Plus className="h-4 w-4 mr-1" /> Cadastrar Paciente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Última consulta</TableHead>
                  <TableHead>Produto em uso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.full_name}</TableCell>
                    <TableCell>{patient.cpf}</TableCell>
                    <TableCell>{patient.weight ? `${patient.weight} kg` : "—"}</TableCell>
                    <TableCell>
                      {patient.last_prescription
                        ? new Date(patient.last_prescription.created_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>{patient.last_prescription?.product ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/prescricao/${patient.id}`)}>
                        <FileText className="h-3 w-3 mr-1" /> Nova Receita
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/pacientes/${patient.id}/historico`)}>
                        Histórico
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => loadAnnotations(patient.id)}>
                            <StickyNote className="h-3 w-3 mr-1" /> Anotações
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Anotações — {annotationPatient?.full_name ?? patient.full_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Add new */}
                            <div className="space-y-2 p-3 rounded-lg bg-muted">
                              <Label>Nova anotação</Label>
                              <Textarea
                                placeholder="Observações clínicas..."
                                value={newAnnotation.text}
                                onChange={e => setNewAnnotation({...newAnnotation, text: e.target.value})}
                              />
                              <div>
                                <Label>Dose atual</Label>
                                <Input
                                  placeholder="Ex: 10 gotas 12/12h"
                                  value={newAnnotation.current_dose}
                                  onChange={e => setNewAnnotation({...newAnnotation, current_dose: e.target.value})}
                                />
                              </div>
                              <Button size="sm" onClick={handleAddAnnotation} disabled={!newAnnotation.text.trim()}>
                                Salvar anotação
                              </Button>
                            </div>

                            {/* List */}
                            {loadingAnnotations ? (
                              <p className="text-sm text-muted-foreground">Carregando...</p>
                            ) : annotations.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhuma anotação registrada.</p>
                            ) : (
                              annotations.map(a => (
                                <div key={a.id} className="p-3 rounded-lg border">
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>{new Date(a.date).toLocaleDateString("pt-BR")}</span>
                                    {a.current_dose && <span>Dose: {a.current_dose}</span>}
                                  </div>
                                  <p className="text-sm">{a.text}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
}
