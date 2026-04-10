import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Leaf, LogOut, Plus, Search, FileText, User } from "lucide-react";
import { toast } from "sonner";

interface Patient {
  id: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  weight: number | null;
  created_at: string;
}

interface DoctorProfile {
  full_name: string;
  crm: string;
  specialty: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("doctor_profiles").select("full_name, crm, specialty").eq("user_id", user.id).single(),
      supabase.from("patients").select("id, full_name, cpf, birth_date, weight, created_at").eq("doctor_id", user.id).order("created_at", { ascending: false }),
    ]).then(([docRes, patRes]) => {
      if (docRes.data) setDoctor(docRes.data);
      if (patRes.data) setPatients(patRes.data);
      setLoading(false);
    });
  }, [user]);

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.full_name}</TableCell>
                    <TableCell>{patient.cpf}</TableCell>
                    <TableCell>{patient.weight ? `${patient.weight} kg` : "—"}</TableCell>
                    <TableCell>{new Date(patient.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/prescricao/${patient.id}`)}>
                        <FileText className="h-3 w-3 mr-1" /> Prescrever
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/pacientes/${patient.id}/historico`)}>
                        Histórico
                      </Button>
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
