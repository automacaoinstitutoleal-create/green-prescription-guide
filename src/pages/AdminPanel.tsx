import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, Trash2, RefreshCw, Users, Stethoscope, FileText, FlaskConical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  crm: string;
  specialty: string;
}

interface Patient {
  id: string;
  doctor_id: string;
  full_name: string;
  cpf: string;
}

interface Prescription {
  id: string;
  doctor_id: string;
  patient_id: string;
  product: string;
  pathology: string;
  calculated_dose: number | null;
  created_at: string;
  prescription_data: any;
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string; name: string } | null>(null);

  const callAdmin = useCallback(async (action: string, extra: any = {}) => {
    const pwd = storedPassword || password;
    const { data, error } = await supabase.functions.invoke("admin-panel", {
      body: { action, password: pwd, ...extra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, [password, storedPassword]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const data = await callAdmin("getData", { filters: {} });
      setDoctors(data.doctors || []);
      setPatients(data.patients || []);
      setPrescriptions(data.prescriptions || []);
      setStoredPassword(password);
      setAuthenticated(true);
      toast.success("Acesso autorizado");
    } catch {
      toast.error("Senha incorreta");
    } finally {
      setLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      const data = await callAdmin("getData", { filters });
      setDoctors(data.doctors || []);
      setPatients(data.patients || []);
      setPrescriptions(data.prescriptions || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [callAdmin, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await callAdmin("delete", { targetId: deleteTarget.id, targetType: deleteTarget.type });
      toast.success(`${deleteTarget.name} removido com sucesso`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated stats per doctor
  const doctorStats = useMemo(() => {
    return doctors.map((doc) => {
      const docPrescriptions = prescriptions.filter((p) => p.doctor_id === doc.user_id);
      const docPatients = patients.filter((p) => p.doctor_id === doc.user_id);
      const totalBottles = docPrescriptions.reduce((sum, p) => {
        const pd = p.prescription_data as any;
        return sum + (pd?.bottles_per_month || pd?.frascosMes || 0);
      }, 0);
      const products: Record<string, number> = {};
      docPrescriptions.forEach((p) => {
        products[p.product] = (products[p.product] || 0) + 1;
      });
      return {
        ...doc,
        totalPatients: docPatients.length,
        totalPrescriptions: docPrescriptions.length,
        totalBottles,
        products,
      };
    });
  }, [doctors, patients, prescriptions]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <CardTitle>Painel Administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} disabled={loading || !password} className="w-full">
              {loading ? "Verificando..." : "Acessar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <Button variant="outline" onClick={() => setAuthenticated(false)}>Sair</Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Stethoscope className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{doctors.length}</p>
                <p className="text-sm text-muted-foreground">Médicos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Pacientes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Prescrições</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FlaskConical className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {doctorStats.reduce((s, d) => s + d.totalBottles, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Frascos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-6">
            <div>
              <label className="text-sm font-medium">Data início</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Data fim</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </CardContent>
        </Card>

        {/* Doctors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Médicos e Prescrições</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Médico</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Pacientes</TableHead>
                  <TableHead>Prescrições</TableHead>
                  <TableHead>Frascos</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorStats.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.full_name || "Sem nome"}</TableCell>
                    <TableCell>{doc.crm || "-"}</TableCell>
                    <TableCell>{doc.specialty || "-"}</TableCell>
                    <TableCell>{doc.totalPatients}</TableCell>
                    <TableCell>{doc.totalPrescriptions}</TableCell>
                    <TableCell>{doc.totalBottles}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(doc.products).map(([prod, count]) => (
                          <Badge key={prod} variant="secondary" className="text-xs">
                            {prod}: {count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ id: doc.id, type: "doctor", name: doc.full_name })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Prescrições</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((pat) => {
                  const doc = doctors.find((d) => d.user_id === pat.doctor_id);
                  const patPrescriptions = prescriptions.filter((p) => p.patient_id === pat.id);
                  return (
                    <TableRow key={pat.id}>
                      <TableCell className="font-medium">{pat.full_name}</TableCell>
                      <TableCell>{pat.cpf}</TableCell>
                      <TableCell>{doc?.full_name || "-"}</TableCell>
                      <TableCell>{patPrescriptions.length}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ id: pat.id, type: "patient", name: pat.full_name })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
              {deleteTarget?.type === "doctor" && " Todos os pacientes e prescrições deste médico serão removidos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
