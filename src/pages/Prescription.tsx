import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Download, AlertTriangle, Search } from "lucide-react";
import {
  PATHOLOGIES, PRODUCTS,
  getDoseRange, mgDayToDropsDay, dropsToBottlesPerMonth, calcBottles,
  generateTitulationProtocol,
  type PathologyInfo, type Product, type TitulationStep,
} from "@/lib/prescriptionData";
import { generatePrescriptionPDF, generatePatientGuidePDF } from "@/lib/pdfGenerator";

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

  // Step 1 - Doctor (editable for this prescription)
  const [editDoctor, setEditDoctor] = useState({ full_name: "", crm: "", specialty: "", phone: "", address: "" });

  // Step 3 - Pathology
  const [selectedPathology, setSelectedPathology] = useState<PathologyInfo | null>(null);
  const [pathologySearch, setPathologySearch] = useState("");
  const filteredPathologies = useMemo(() => {
    if (!pathologySearch.trim()) return PATHOLOGIES;
    const term = pathologySearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return PATHOLOGIES.filter((p) =>
      p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
    );
  }, [pathologySearch]);

  // Step 4 - Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Step 5 - Posology
  const [intervalDays, setIntervalDays] = useState(7);
  const [via, setVia] = useState("sublingual");
  const [initialDrops, setInitialDrops] = useState(2);
  const [titulationSteps, setTitulationSteps] = useState<TitulationStep[]>([]);
  const [durationMonths, setDurationMonths] = useState(1);
  const [bottleBasis, setBottleBasis] = useState<"target" | "max" | "initial">("target");
  const [editableBottles, setEditableBottles] = useState(1);

  // Step 6 - Editable fields for documents
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  useEffect(() => {
    if (!user || !patientId) return;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("doctor_id", user.id).single(),
      supabase.from("doctor_profiles").select("full_name, crm, specialty, phone, address").eq("user_id", user.id).single(),
    ]).then(([patRes, docRes]) => {
      if (patRes.data) setPatient(patRes.data);
      if (docRes.data) {
        setDoctor(docRes.data);
        setEditDoctor({
          full_name: docRes.data.full_name,
          crm: docRes.data.crm,
          specialty: docRes.data.specialty,
          phone: docRes.data.phone || "",
          address: docRes.data.address || "",
        });
      }
      setLoading(false);
    });
  }, [user, patientId]);

  // Recalculate titulation when relevant deps change
  useEffect(() => {
    if (!selectedProduct || !selectedPathology || !patient?.weight) return;
    const range = getDoseRange(selectedPathology, patient.weight);
    const steps = generateTitulationProtocol(
      initialDrops, selectedProduct, patient.weight, range.target, range.max, intervalDays
    );
    setTitulationSteps(steps);

    // Calculate bottles
    const targetStep = steps.find(s => s.status === "target");
    const basisDrops = bottleBasis === "initial" ? initialDrops * 2
      : bottleBasis === "max" ? (steps[steps.length - 1]?.dropsPerDay ?? initialDrops * 2)
      : (targetStep?.dropsPerDay ?? initialDrops * 2);
    const bottles = calcBottles(basisDrops, selectedProduct, durationMonths);
    setEditableBottles(bottles);
  }, [selectedProduct, selectedPathology, patient?.weight, initialDrops, intervalDays, durationMonths, bottleBasis]);

  // Set edit fields when pathology changes
  useEffect(() => {
    if (selectedPathology) {
      setEditDiagnosis(`${selectedPathology.name} (CID-10: ${selectedPathology.cid10})`);
    }
    setSelectedProduct(null);
  }, [selectedPathology]);

  useEffect(() => {
    if (selectedProduct && selectedPathology && patient?.weight) {
      const range = getDoseRange(selectedPathology, patient.weight);
      const targetDrops = mgDayToDropsDay(range.target, selectedProduct);
      setEditQuantity(`${editableBottles} frasco(s) de 30 mL — ${durationMonths} mês(es)`);
    }
  }, [editableBottles, durationMonths]);

  const handleSaveAndDownload = async (docType: "receita" | "guia" | "ambos") => {
    if (!user || !patient || !doctor || !selectedProduct || !selectedPathology) return;
    setSaving(true);

    const range = getDoseRange(selectedPathology, patient.weight || 0);
    const prescriptionData = {
      pathology: selectedPathology.name,
      cid10: selectedPathology.cid10,
      product: selectedProduct.name,
      productType: selectedProduct.typeLabel,
      doseStart: range.start,
      doseTarget: range.target,
      doseMax: range.max,
      titulationSteps,
      patientWeight: patient.weight,
      intervalDays,
      via,
      initialDrops,
      durationMonths,
      bottles: editableBottles,
      mgPerDrop: +((selectedProduct.mgMl * selectedProduct.cbdPct) / selectedProduct.dropsPerMl).toFixed(2),
    };

    const insertData = {
      doctor_id: user.id,
      patient_id: patient.id,
      pathology: selectedPathology.name,
      product: selectedProduct.name,
      dose_per_kg: selectedPathology.doseType === "mg_kg" ? selectedPathology.doseTarget : null,
      calculated_dose: range.target,
      titulation_protocol: JSON.parse(JSON.stringify(titulationSteps)),
      tcle_accepted: docType === "guia" || docType === "ambos",
      prescription_data: JSON.parse(JSON.stringify(prescriptionData)),
    };

    const { error } = await supabase.from("prescriptions").insert(insertData);
    if (error) {
      toast.error("Erro ao salvar receita: " + error.message);
      setSaving(false);
      return;
    }

    try {
      const pdfDoctor = editDoctor;
      if (docType === "receita" || docType === "ambos") {
        generatePrescriptionPDF({ doctor: pdfDoctor, patient, prescriptionData });
      }
      if (docType === "guia" || docType === "ambos") {
        generatePatientGuidePDF({ doctor: pdfDoctor, patient, prescriptionData, product: selectedProduct });
      }
      toast.success("Receita salva e PDF(s) gerado(s)!");
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Receita salva, mas houve erro ao gerar o PDF.");
    }
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

  const weight = patient.weight || 0;
  const doseRange = selectedPathology ? getDoseRange(selectedPathology, weight) : null;

  return (
    <div className="min-h-screen bg-secondary/20 p-4">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Dashboard
        </Button>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-4">Etapa {step} de 6</p>

        {/* ═══ Step 1: Médico ═══ */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1. Dados do Médico</CardTitle>
              <CardDescription>Dados pré-preenchidos do seu perfil. Edite se necessário para esta receita.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={editDoctor.full_name} onChange={e => setEditDoctor({...editDoctor, full_name: e.target.value})} />
                </div>
                <div>
                  <Label>CRM</Label>
                  <Input value={editDoctor.crm} onChange={e => setEditDoctor({...editDoctor, crm: e.target.value})} />
                </div>
                <div>
                  <Label>Especialidade</Label>
                  <Input value={editDoctor.specialty} onChange={e => setEditDoctor({...editDoctor, specialty: e.target.value})} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editDoctor.phone} onChange={e => setEditDoctor({...editDoctor, phone: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={editDoctor.address} onChange={e => setEditDoctor({...editDoctor, address: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 2: Paciente ═══ */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Paciente</CardTitle>
              <CardDescription>Dados do paciente selecionado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{patient.full_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{patient.cpf}</p>
                </div>
                {patient.rg && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">RG</p>
                    <p className="font-medium">{patient.rg}</p>
                  </div>
                )}
                {patient.birth_date && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Data de nascimento</p>
                    <p className="font-medium">{new Date(patient.birth_date).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="text-xl font-bold text-primary">{patient.weight ? `${patient.weight} kg` : "Não informado"}</p>
                </div>
                {patient.address && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="font-medium">{patient.address}</p>
                  </div>
                )}
              </div>
              {!patient.weight && (
                <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Peso não informado. Cadastre o peso do paciente para cálculo preciso de doses.</p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!patient.weight}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 3: Patologia ═══ */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Patologia</CardTitle>
              <CardDescription>Selecione a condição clínica do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar condição..."
                  value={pathologySearch}
                  onChange={(e) => setPathologySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {filteredPathologies.map((p) => {
                  const range = getDoseRange(p, weight);
                  const isSelected = selectedPathology?.name === p.name;
                  return (
                    <div
                      key={p.name}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedPathology(p)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{p.name}</p>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <Badge variant="outline" className="text-xs mb-2">CID-10: {p.cid10}</Badge>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">Início: {range.start} mg</Badge>
                        <Badge className="text-xs bg-primary/80">Alvo: {range.target} mg</Badge>
                        <Badge variant="destructive" className="text-xs">Máx: {range.max} mg</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Rec.: {p.recommendedProduct}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground italic">⚕ Todos os valores são sugestões baseadas na literatura. O médico é soberano na decisão terapêutica.</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(4)} disabled={!selectedPathology}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 4: Produto ═══ */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>4. Produto</CardTitle>
              <CardDescription>Selecione o produto a ser prescrito</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PRODUCTS.map((product) => {
                const isRecommended = selectedPathology?.recommendedProduct === product.name;
                const isSelected = selectedProduct?.name === product.name;
                return (
                  <div
                    key={product.name}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{product.name}</p>
                        <Badge variant="outline">{product.typeLabel}</Badge>
                        {isRecommended && <Badge className="bg-primary text-primary-foreground">✓ Indicado para este caso</Badge>}
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                    {isSelected && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 rounded bg-muted text-sm">
                          <p className="font-medium mb-1">Justificativa clínica:</p>
                          <p>{product.clinicalJustification}</p>
                        </div>
                        <div className="p-3 rounded bg-muted text-sm">
                          <p className="font-medium mb-1">Justificativa canabínica:</p>
                          <p>{product.cannabinoidJustification}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">mg/gota: {((product.mgMl * product.cbdPct) / product.dropsPerMl).toFixed(2)}</Badge>
                          {doseRange && (
                            <>
                              <Badge variant="secondary">Alvo: {mgDayToDropsDay(doseRange.target, product)} gotas/dia</Badge>
                              <Badge variant="secondary">Máx: {mgDayToDropsDay(doseRange.max, product)} gotas/dia</Badge>
                            </>
                          )}
                        </div>
                        {/* Composition table */}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Canabinoide</TableHead>
                              <TableHead>%</TableHead>
                              <TableHead>mg/30mL</TableHead>
                              <TableHead>mg/mL</TableHead>
                              <TableHead>mg/gota</TableHead>
                              <TableHead>Efeito</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {product.cannabinoids.map((c) => (
                              <TableRow key={c.name}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.pct.toFixed(1)}%</TableCell>
                                <TableCell>{c.mg30ml}</TableCell>
                                <TableCell>{c.mgMl}</TableCell>
                                <TableCell>{c.mgDrop}</TableCell>
                                <TableCell className="text-xs">{c.effect}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground italic">⚕ O médico pode escolher qualquer produto — a recomendação é uma sugestão baseada na literatura.</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(5)} disabled={!selectedProduct}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 5: Posologia ═══ */}
        {step === 5 && selectedProduct && doseRange && (
          <Card>
            <CardHeader>
              <CardTitle>5. Posologia</CardTitle>
              <CardDescription>Configure o protocolo de titulação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Intervalo de titulação</Label>
                  <Select value={String(intervalDays)} onValueChange={v => setIntervalDays(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Via de administração</Label>
                  <Select value={via} onValueChange={setVia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sublingual">Sublingual</SelectItem>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="azeite">Com azeite/alimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dose inicial (gotas/tomada)</Label>
                  <Select value={String(initialDrops)} onValueChange={v => setInitialDrops(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map(d => <SelectItem key={d} value={String(d)}>{d} gotas</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Titulation table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sem.</TableHead>
                      <TableHead>Gotas/dose</TableHead>
                      <TableHead>Freq.</TableHead>
                      <TableHead>mg can./dose</TableHead>
                      <TableHead>mg CBD/dose</TableHead>
                      <TableHead>mg CBD/dia</TableHead>
                      <TableHead>mg/kg/dia</TableHead>
                      <TableHead>Gotas/dia</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {titulationSteps.map((s) => (
                      <TableRow key={s.week} className={
                        s.status === "target" ? "bg-primary/10" : s.status === "above_max" ? "bg-destructive/10" : ""
                      }>
                        <TableCell className="font-medium">{s.week}</TableCell>
                        <TableCell>{s.dropsPerDose}</TableCell>
                        <TableCell>{s.frequency}</TableCell>
                        <TableCell>{s.mgCanPerDose}</TableCell>
                        <TableCell>{s.mgCbdPerDose}</TableCell>
                        <TableCell className="font-semibold">{s.mgCbdPerDay}</TableCell>
                        <TableCell>{s.mgKgPerDay}</TableCell>
                        <TableCell>{s.dropsPerDay}</TableCell>
                        <TableCell>
                          {s.status === "target" && <Badge className="bg-primary">Dose alvo</Badge>}
                          {s.status === "above_max" && <Badge variant="destructive">Acima do máx.</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Equilibrium box */}
              {titulationSteps.find(s => s.status === "target") && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-semibold text-primary">Dose de equilíbrio estimada</p>
                  <p className="text-sm">
                    {titulationSteps.find(s => s.status === "target")!.dropsPerDose} gotas/dose (12/12h) = {titulationSteps.find(s => s.status === "target")!.dropsPerDay} gotas/dia = {titulationSteps.find(s => s.status === "target")!.mgCbdPerDay} mg CBD/dia
                  </p>
                </div>
              )}

              {/* Bottle calculation */}
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <p className="font-semibold">Cálculo de frascos</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Duração</Label>
                    <Select value={String(durationMonths)} onValueChange={v => setDurationMonths(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 6].map(m => <SelectItem key={m} value={String(m)}>{m} mês(es)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Base do cálculo</Label>
                    <Select value={bottleBasis} onValueChange={v => setBottleBasis(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial">Dose inicial</SelectItem>
                        <SelectItem value="target">Dose alvo</SelectItem>
                        <SelectItem value="max">Dose máxima</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frascos</Label>
                    <Input type="number" min={1} value={editableBottles} onChange={e => setEditableBottles(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">600 gotas/frasco ÷ gotas/dia × dias = frascos necessários. Todos os campos são editáveis.</p>
              </div>

              <div className="p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium">⚠ Nota clínica:</p>
                <p>Canabinoides são metabolizados via CYP3A4 e CYP2C19. Verificar possíveis interações medicamentosas, especialmente com anticoagulantes, antiepilépticos e benzodiazepínicos.</p>
              </div>

              <p className="text-xs text-muted-foreground italic">⚕ Todos os campos são editáveis — o médico é soberano na decisão terapêutica.</p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => setStep(6)}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Step 6: Documentos ═══ */}
        {step === 6 && selectedProduct && selectedPathology && (
          <Card>
            <CardHeader>
              <CardTitle>6. Documentos</CardTitle>
              <CardDescription>Revise os dados e gere os PDFs. Todos os campos são editáveis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Médico</p>
                  <p className="font-medium">Dr(a). {editDoctor.full_name} — CRM {editDoctor.crm} — {editDoctor.specialty}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium">{patient.full_name} — CPF: {patient.cpf} — Peso: {patient.weight} kg</p>
                </div>
                <div>
                  <Label>Diagnóstico + CID-10</Label>
                  <Input value={editDiagnosis} onChange={e => setEditDiagnosis(e.target.value)} />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium">{selectedProduct.name} — {selectedProduct.typeLabel}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Posologia resumida</p>
                  <p className="font-medium">
                    Via {via} · Dose inicial: {initialDrops} gotas (12/12h) · Titulação a cada {intervalDays} dias ·
                    Dose alvo: {doseRange?.target} mg/dia · Dose máxima: {doseRange?.max} mg/dia ·
                    mg/gota: {((selectedProduct.mgMl * selectedProduct.cbdPct) / selectedProduct.dropsPerMl).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold">Gerar documentos:</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleSaveAndDownload("receita")} disabled={saving} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Receita Médica (PDF)"}
                  </Button>
                  <Button onClick={() => handleSaveAndDownload("guia")} disabled={saving} variant="outline">
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Guia do Paciente (PDF)"}
                  </Button>
                  <Button onClick={() => handleSaveAndDownload("ambos")} disabled={saving}>
                    <Download className="h-4 w-4 mr-1" /> {saving ? "Gerando..." : "Gerar Ambos"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
