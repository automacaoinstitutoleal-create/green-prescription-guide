import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import {
  PATHOLOGIES, PRODUCTS, PATHOLOGY_PRODUCT_MAP,
  calculateDose, calculateVolume, generateTitulationProtocol,
  type Pathology, type Product, type TitulationStep,
} from "@/lib/prescriptionData";
import { generatePrescriptionPDF } from "@/lib/pdfGenerator";

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

interface DoctorProfile {
  full_name: string;
  crm: string;
  specialty: string;
  phone: string | null;
  address: string | null;
}

export default function Prescription() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prescription state
  const [selectedPathology, setSelectedPathology] = useState<Pathology | "">("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dosePerKg, setDosePerKg] = useState(0);
  const [calculatedDose, setCalculatedDose] = useState(0);
  const [titulationSteps, setTitulationSteps] = useState<TitulationStep[]>([]);
  const [tcleAccepted, setTcleAccepted] = useState(false);

  useEffect(() => {
    if (!user || !patientId) return;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("doctor_id", user.id).single(),
      supabase.from("doctor_profiles").select("full_name, crm, specialty, phone, address").eq("user_id", user.id).single(),
    ]).then(([patRes, docRes]) => {
      if (patRes.data) setPatient(patRes.data);
      if (docRes.data) setDoctor(docRes.data);
      setLoading(false);
    });
  }, [user, patientId]);

  // When pathology changes, reset product
  useEffect(() => {
    setSelectedProduct(null);
  }, [selectedPathology]);

  // When product changes, recalculate
  useEffect(() => {
    if (selectedProduct && patient?.weight) {
      const dpk = selectedProduct.defaultDosePerKg;
      setDosePerKg(dpk);
      const dose = calculateDose(patient.weight, dpk);
      setCalculatedDose(dose);
      const initialDose = dose / 4; // start at 25% of target
      setTitulationSteps(generateTitulationProtocol(initialDose, dose, selectedProduct.concentration));
    }
  }, [selectedProduct, patient?.weight]);

  const recommendedProducts = selectedPathology
    ? PRODUCTS.filter((p) => PATHOLOGY_PRODUCT_MAP[selectedPathology]?.includes(p.name))
    : [];

  const handleSaveAndDownload = async () => {
    if (!user || !patient || !doctor || !selectedProduct || !selectedPathology) return;
    setSaving(true);

    const prescriptionData = {
      pathology: selectedPathology,
      product: selectedProduct.name,
      productType: selectedProduct.type,
      dosePerKg,
      calculatedDose,
      concentration: selectedProduct.concentration,
      titulationSteps,
      patientWeight: patient.weight,
    };

    // Save to DB
    const insertData = {
      doctor_id: user.id,
      patient_id: patient.id,
      pathology: selectedPathology,
      product: selectedProduct.name,
      dose_per_kg: dosePerKg,
      calculated_dose: calculatedDose,
      titulation_protocol: JSON.parse(JSON.stringify(titulationSteps)),
      tcle_accepted: tcleAccepted,
      prescription_data: JSON.parse(JSON.stringify(prescriptionData)),
    };
    const { error } = await supabase.from("prescriptions").insert(insertData);

    if (error) {
      toast.error("Erro ao salvar receita: " + error.message);
      setSaving(false);
      return;
    }

    // Generate PDF
    generatePrescriptionPDF({ doctor, patient, prescriptionData, tcleAccepted });
    toast.success("Receita salva e PDF gerado!");
    setSaving(false);
    navigate(`/pacientes/${patient.id}/historico`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Paciente não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 p-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Dashboard
        </Button>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-4">Etapa {step} de 6 — Paciente: {patient.full_name}</p>

        {/* Step 1: Pathology */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1. Selecionar Patologia</CardTitle>
              <CardDescription>Escolha a condição clínica do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPathology} onValueChange={(v) => setSelectedPathology(v as Pathology)}>
                <SelectTrigger><SelectValue placeholder="Selecione a patologia" /></SelectTrigger>
                <SelectContent>
                  {PATHOLOGIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!selectedPathology}>
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Product */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Selecionar Produto</CardTitle>
              <CardDescription>Produtos recomendados para {selectedPathology}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedProducts.map((product) => (
                <div
                  key={product.name}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedProduct?.name === product.name ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.type}</p>
                      <p className="text-sm">{product.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Concentração: {product.concentration} mg/mL | Dose sugerida: {product.defaultDosePerKg} mg/kg/dia</p>
                    </div>
                    {selectedProduct?.name === product.name && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedProduct}>
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Dose */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Cálculo de Dose</CardTitle>
              <CardDescription>Dose automática baseada no peso do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Peso do paciente</p>
                  <p className="text-2xl font-bold">{patient.weight || "N/I"} kg</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Dose por kg</p>
                  <p className="text-2xl font-bold">{dosePerKg} mg/kg/dia</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Dose diária alvo</p>
                  <p className="text-2xl font-bold text-primary">{calculatedDose} mg/dia</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Volume diário alvo</p>
                  <p className="text-2xl font-bold text-primary">
                    {selectedProduct ? calculateVolume(calculatedDose, selectedProduct.concentration) : 0} mL/dia
                  </p>
                </div>
              </div>
              {!patient.weight && (
                <p className="text-sm text-destructive">⚠ Peso não informado. Cadastre o peso do paciente para cálculo preciso.</p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={() => setStep(4)} disabled={!patient.weight}>
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Titulation */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>4. Protocolo de Titulação</CardTitle>
              <CardDescription>Administração 12/12h, dobrando a dose a cada 5–7 dias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Manhã (mg)</TableHead>
                    <TableHead>Noite (mg)</TableHead>
                    <TableHead>Total/dia</TableHead>
                    <TableHead>Vol. manhã (mL)</TableHead>
                    <TableHead>Vol. noite (mL)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulationSteps.map((s) => (
                    <TableRow key={s.week}>
                      <TableCell className="font-medium">{s.week}</TableCell>
                      <TableCell>{s.days}</TableCell>
                      <TableCell>{s.doseMorning}</TableCell>
                      <TableCell>{s.doseEvening}</TableCell>
                      <TableCell className="font-semibold">{s.totalDaily}</TableCell>
                      <TableCell>{s.volumeMorning}</TableCell>
                      <TableCell>{s.volumeEvening}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={() => setStep(5)}>
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: TCLE */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>5. Termo de Consentimento (TCLE)</CardTitle>
              <CardDescription>O paciente deve concordar com o tratamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted text-sm space-y-2 max-h-64 overflow-y-auto">
                <p className="font-semibold">TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</p>
                <p>Eu, <strong>{patient.full_name}</strong>, CPF <strong>{patient.cpf}</strong>, declaro que fui devidamente informado(a) pelo(a) Dr(a). <strong>{doctor?.full_name}</strong> (CRM <strong>{doctor?.crm}</strong>) sobre:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A natureza do tratamento com produtos à base de Cannabis medicinal;</li>
                  <li>Os benefícios esperados e os possíveis efeitos adversos;</li>
                  <li>O produto prescrito: <strong>{selectedProduct?.name} ({selectedProduct?.type})</strong>;</li>
                  <li>A posologia e o protocolo de titulação gradual;</li>
                  <li>A necessidade de acompanhamento médico regular;</li>
                  <li>Que o tratamento pode ser suspenso a qualquer momento;</li>
                  <li>Que devo comunicar qualquer efeito adverso imediatamente ao médico.</li>
                </ul>
                <p>Declaro estar ciente e de acordo com o tratamento proposto.</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tcle"
                  checked={tcleAccepted}
                  onCheckedChange={(checked) => setTcleAccepted(checked === true)}
                />
                <Label htmlFor="tcle">Paciente leu e concordou com o TCLE</Label>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={() => setStep(6)} disabled={!tcleAccepted}>
                  Próximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Review & Generate */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>6. Revisão e Geração da Receita</CardTitle>
              <CardDescription>Confira os dados antes de gerar o PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium">{patient.full_name} — CPF: {patient.cpf}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Patologia</p>
                  <p className="font-medium">{selectedPathology}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium">{selectedProduct?.name} — {selectedProduct?.type}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Posologia</p>
                  <p className="font-medium">{calculatedDose} mg/dia ({dosePerKg} mg/kg) — {selectedProduct ? calculateVolume(calculatedDose, selectedProduct.concentration) : 0} mL/dia</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">TCLE</p>
                  <p className="font-medium text-primary">✓ Aceito</p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button onClick={handleSaveAndDownload} disabled={saving}>
                  <Download className="h-4 w-4 mr-1" />
                  {saving ? "Gerando..." : "Salvar e Baixar PDF"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
