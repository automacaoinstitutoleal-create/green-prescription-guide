import { useState, useCallback, useMemo, Fragment } from "react";
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

      // Per-patient breakdown for this doctor
      const patientDetails = docPatients.map((pat) => {
        const patPrescs = docPrescriptions.filter((p) => p.patient_id === pat.id);
        const patBottles = patPrescs.reduce((sum, p) => {
          const pd = p.prescription_data as any;
          return sum + (pd?.bottles_per_month || pd?.frascosMes || 0);
        }, 0);
        const patProducts: Record<string, number> = {};
        patPrescs.forEach((p) => {
          patProducts[p.product] = (patProducts[p.product] || 0) + 1;
        });
        return { ...pat, totalPrescriptions: patPrescs.length, totalBottles: patBottles, products: patProducts };
      });

      return {
        ...doc,
        totalPatients: docPatients.length,
        totalPrescriptions: docPrescriptions.length,
        totalBottles,
        products,
        patientDetails,
      };
    });
  }, [doctors, patients, prescriptions]);

  // Global top products
  const globalTopProducts = useMemo(() => {
    const products: Record<string, number> = {};
    prescriptions.forEach((p) => {
      products[p.product] = (products[p.product] || 0) + 1;
    });
    return Object.entries(products).sort((a, b) => b[1] - a[1]);
  }, [prescriptions]);

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

        {/* Produtos mais receitados (global) */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Receitados (Todos os Médicos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {globalTopProducts.map(([prod, count]) => (
                <Badge key={prod} variant="outline" className="text-sm px-3 py-1">
                  {prod}: <strong className="ml-1">{count} prescrições</strong>
                </Badge>
              ))}
              {globalTopProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma prescrição encontrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Doctors Table with per-patient breakdown */}
        {doctorStats.map((doc) => (
          <Card key={doc.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  {doc.full_name || "Sem nome"}
                  <span className="text-sm font-normal text-muted-foreground">— CRM {doc.crm || "-"} · {doc.specialty || "-"}</span>
                </CardTitle>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{doc.totalPatients} pacientes</span>
                  <span>{doc.totalPrescriptions} prescrições</span>
                  <span className="font-semibold text-foreground">{doc.totalBottles} frascos total</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Produtos mais receitados:</span>
                  {Object.entries(doc.products)
                    .sort((a, b) => b[1] - a[1])
                    .map(([prod, count]) => (
                      <Badge key={prod} variant="secondary" className="text-xs">
                        {prod}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget({ id: doc.id, type: "doctor", name: doc.full_name })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Prescrições</TableHead>
                    <TableHead>Frascos/mês</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.patientDetails.map((pat) => (
                    <TableRow key={pat.id}>
                      <TableCell className="font-medium">{pat.full_name}</TableCell>
                      <TableCell>{pat.cpf}</TableCell>
                      <TableCell>{pat.totalPrescriptions}</TableCell>
                      <TableCell className="font-semibold">{pat.totalBottles}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(pat.products).map(([prod, count]) => (
                            <Badge key={prod} variant="outline" className="text-xs">
                              {prod}: {count}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
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
                  ))}
                  {doc.patientDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum paciente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
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
