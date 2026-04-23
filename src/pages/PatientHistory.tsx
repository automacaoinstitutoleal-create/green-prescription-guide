import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { generatePrescriptionPDF, generatePatientGuidePDF } from "@/lib/pdfGenerator";
import { PRODUCTS } from "@/lib/prescriptionData";

interface PrescriptionRow {
  id: string;
  pathology: string;
  product: string;
  calculated_dose: number | null;
  dose_per_kg: number | null;
  tcle_accepted: boolean;
  prescription_data: Record<string, unknown>;
  created_at: string;
}

interface Patient {
  id: string;
  full_name: string;
  cpf: string;
  rg: string | null;
  birth_date: string | null;
  weight: number | null;
  address: string | null;
  clinical_notes: string | null;
}

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<{ full_name: string; crm: string; specialty: string; phone: string | null; address: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !patientId) return;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("doctor_id", user.id).single(),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).eq("doctor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("doctor_profiles").select("full_name, crm, specialty, phone, address").eq("user_id", user.id).single(),
    ]).then(([patRes, prescRes, docRes]) => {
      if (patRes.data) setPatient(patRes.data);
      if (prescRes.data) setPrescriptions(prescRes.data as PrescriptionRow[]);
      if (docRes.data) setDoctor(docRes.data);
      setLoading(false);
    });
  }, [user, patientId]);

  const handleRedownload = (presc: PrescriptionRow) => {
    if (!patient || !doctor) return;
    const pd = presc.prescription_data as any;
    generatePrescriptionPDF({
      doctor,
      patient,
      prescriptionData: pd,
    });
  };

  const handleDownloadGuide = (presc: PrescriptionRow) => {
    if (!patient || !doctor) return;
    const pd = presc.prescription_data as any;
    const product = PRODUCTS.find((p) => p.name === presc.product);
    if (!product) return;
    generatePatientGuidePDF({
      doctor,
      patient,
      prescriptionData: pd,
      product,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 p-4">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico — {patient?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma prescrição registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Patologia</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Dose (mg/dia)</TableHead>
                    <TableHead>TCLE</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{p.pathology}</TableCell>
                      <TableCell>{p.product}</TableCell>
                      <TableCell>{p.calculated_dose ?? "—"}</TableCell>
                      <TableCell>{p.tcle_accepted ? "✓ Sim" : "✗ Não"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleRedownload(p)}>
                          <Download className="h-3 w-3 mr-1" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
