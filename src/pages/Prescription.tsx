import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Download, AlertTriangle, Search, Pencil, Save, X } from "lucide-react";
import {
  PATHOLOGIES, PRODUCTS,
  getDoseRange, mgDayToDropsDay,
  generateTitulationProtocol, calcBottlesFromSchedule,
  isProductAvailableForPathology,
  type PathologyInfo, type Product, type TitulationStep, type TitulationConfig,
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

  // Step 2 - Patient edit mode
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({
    full_name: "", cpf: "", rg: "", birth_date: "", weight: "", address: "", clinical_notes: "",
  });
  const [savingPatient, setSavingPatient] = useState(false);

  const startEditPatient = () => {
    if (!patient) return;
    setPatientForm({
      full_name: patient.full_name || "",
      cpf: patient.cpf || "",
      rg: patient.rg || "",
      birth_date: patient.birth_date || "",
      weight: patient.weight ? String(patient.weight) : "",
      address: patient.address || "",
      clinical_notes: patient.clinical_notes || "",
    });
    setEditingPatient(true);
  };

  const savePatient = async () => {
    if (!patient) return;
    setSavingPatient(true);
    const { data, error } = await supabase
      .from("patients")
      .update({
        full_name: patientForm.full_name,
        cpf: patientForm.cpf,
        rg: patientForm.rg || null,
        birth_date: patientForm.birth_date || null,
        weight: patientForm.weight ? parseFloat(patientForm.weight) : null,
        address: patientForm.address || null,
        clinical_notes: patientForm.clinical_notes || null,
      })
      .eq("id", patient.id)
      .select()
      .single();
    setSavingPatient(false);
    if (error) {
      toast.error("Erro ao atualizar paciente: " + error.message);
    } else {
      setPatient(data as Patient);
      setEditingPatient(false);
      toast.success("Dados do paciente atualizados!");
    }
  };

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

  // Step 5 - Posology (new fields)
  const [initialDrops, setInitialDrops] = useState(2);
  const [increment, setIncrement] = useState(2);
  const [intervalDays, setIntervalDays] = useState(7);
  const [maintenanceDrops, setMaintenanceDrops] = useState(10);
  const [via, setVia] = useState("sublingual");
  const [time1, setTime1] = useState("08:00");
  const [time2, setTime2] = useState("20:00");
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [editableBottles, setEditableBottles] = useState(1);
  const [titulationSteps, setTitulationSteps] = useState<TitulationStep[]>([]);
  const [bottleBreakdown, setBottleBreakdown] = useState<{ week: number; drops: number; dropsPerDose: number; days: number }[]>([]);
  const [totalDrops30, setTotalDrops30] = useState(0);

  // Step 6 - Editable fields for documents
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  const titConfig: TitulationConfig = useMemo(() => ({
    initialDrops, increment, intervalDays, maintenanceDrops, via, time1, time2, returnDate,
  }), [initialDrops, increment, intervalDays, maintenanceDrops, via, time1, time2, returnDate]);

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
    if (!selectedProduct || !patient?.weight) return;
    const steps = generateTitulationProtocol(titConfig, selectedProduct, patient.weight);
    setTitulationSteps(steps);

    const calc = calcBottlesFromSchedule(titConfig, selectedProduct);
    setBottleBreakdown(calc.weeklyBreakdown);
    setTotalDrops30(calc.totalDrops);
    setEditableBottles(calc.bottles);
  }, [selectedProduct, patient?.weight, titConfig]);

  // Set edit fields when pathology changes
  useEffect(() => {
    if (selectedPathology) {
      setEditDiagnosis(`${selectedPathology.name} (CID-10: ${selectedPathology.cid10})`);
    }
    setSelectedProduct(null);
  }, [selectedPathology]);

  useEffect(() => {
    if (selectedProduct) {
      setEditQuantity(`${editableBottles} frasco(s) de 30 mL — 30 dias até retorno médico`);
    }
  }, [editableBottles, selectedProduct]);

  const handleSaveAndDownload = async (docType: "receita" | "guia" | "ambos") => {
    if (!user || !patient || !doctor || !selectedProduct || !selectedPathology) return;
    setSaving(true);

    const mgPerDrop = +(selectedProduct.mgMl / selectedProduct.dropsPerMl).toFixed(2);
    const mgCbdPerDrop = +((selectedProduct.mgMl * selectedProduct.cbdPct) / selectedProduct.dropsPerMl).toFixed(2);

    const prescriptionData = {
      pathology: selectedPathology.name,
      cid10: selectedPathology.cid10,
      product: selectedProduct.name,
      productType: selectedProduct.typeLabel,
      titulationSteps,
      patientWeight: patient.weight,
      bottles: editableBottles,
      mgPerDrop,
      mgCbdPerDrop,
      config: titConfig,
      productFullLabel: selectedProduct.fullLabel,
      productComposition: selectedProduct.compositionLabel,
      receituarioType: selectedProduct.receituarioType,
    };

    const insertData = {
      doctor_id: user.id,
      patient_id: patient.id,
      pathology: selectedPathology.name,
      product: selectedProduct.name,
      dose_per_kg: selectedPathology.doseType === "mg_kg" ? selectedPathology.doseTarget : null,
      calculated_dose: maintenanceDrops * 2 * mgCbdPerDrop,
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
      toast.success("PDF gerado com sucesso! Você pode gerar outro documento ou finalizar.");
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Receita salva, mas houve erro ao gerar o PDF.");
    }
    setSaving(false);
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
        <p className="text-sm text-muted-foreground mb-2">Etapa {step} de 6</p>
        <p className="text-xs text-muted-foreground italic mb-4">⚕ Todas as sugestões são baseadas em literatura clínica. O médico tem autonomia total para ajustar qualquer valor.</p>

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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>2. Paciente</CardTitle>
                  <CardDescription>Dados do paciente selecionado</CardDescription>
                </div>
                {!editingPatient && (
                  <Button variant="outline" size="sm" onClick={startEditPatient}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingPatient ? (
                <>
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
                    <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Peso não informado. Clique em Editar para informar o peso do paciente.</p>
                  )}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                    <Button onClick={() => setStep(3)} disabled={!patient.weight}>Próximo <ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_full_name">Nome completo *</Label>
                      <Input id="p_full_name" value={patientForm.full_name} onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_cpf">CPF *</Label>
                      <Input id="p_cpf" value={patientForm.cpf} onChange={(e) => setPatientForm({ ...patientForm, cpf: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_rg">RG</Label>
                      <Input id="p_rg" value={patientForm.rg} onChange={(e) => setPatientForm({ ...patientForm, rg: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_birth">Data de nascimento</Label>
                      <Input id="p_birth" type="date" value={patientForm.birth_date} onChange={(e) => setPatientForm({ ...patientForm, birth_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p_weight">Peso (kg) *</Label>
                      <Input id="p_weight" type="number" step="0.1" value={patientForm.weight} onChange={(e) => setPatientForm({ ...patientForm, weight: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_address">Endereço</Label>
                      <Input id="p_address" value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="p_notes">Observações clínicas</Label>
                      <Input id="p_notes" value={patientForm.clinical_notes} onChange={(e) => setPatientForm({ ...patientForm, clinical_notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingPatient(false)} disabled={savingPatient}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button onClick={savePatient} disabled={savingPatient || !patientForm.full_name || !patientForm.cpf}>
                      <Save className="h-4 w-4 mr-1" /> {savingPatient ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </div>
                </>
              )}
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
        {step === 5 && selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>5. Posologia</CardTitle>
              <CardDescription>Defina os valores exatos do protocolo de titulação — "start low, go slow"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selectors row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Dose inicial (gotas/tomada)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={initialDrops}
                    onChange={e => setInitialDrops(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sugerido: 1–10 gotas. Ajuste conforme conduta clínica.</p>
                </div>
                <div>
                  <Label>Incremento (gotas/dose)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={increment}
                    onChange={e => setIncrement(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sugerido: +1 a +3 gotas. Personalize se necessário.</p>
                </div>
                <div>
                  <Label>Intervalo de ajuste</Label>
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
                  <Label>Dose de manutenção (gotas/tomada)</Label>
                  <Input type="number" min={1} max={50} value={maintenanceDrops} onChange={e => setMaintenanceDrops(Number(e.target.value) || 1)} />
                </div>
              </div>

              {/* Selectors row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Via de administração</Label>
                  <Select value={via} onValueChange={setVia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sublingual">Sublingual 60–90s</SelectItem>
                      <SelectItem value="oral">Oral com alimento</SelectItem>
                      <SelectItem value="azeite">Com azeite/gordura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário 1 (manhã)</Label>
                  <Input type="time" value={time1} onChange={e => setTime1(e.target.value)} />
                </div>
                <div>
                  <Label>Horário 2 (noite)</Label>
                  <Input type="time" value={time2} onChange={e => setTime2(e.target.value)} />
                </div>
                <div>
                  <Label>Data de retorno</Label>
                  <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                </div>
              </div>

              {/* Titulation table */}
              <div>
                <h3 className="font-semibold mb-2">Cronograma de Titulação</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sem.</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Gotas/dose</TableHead>
                        <TableHead>Freq.</TableHead>
                        <TableHead>mg can./dose</TableHead>
                        <TableHead>mg CBD/dose</TableHead>
                        <TableHead>mg CBD/dia</TableHead>
                        <TableHead>mg/kg/dia</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {titulationSteps.map((s) => (
                        <TableRow key={s.week} className={
                          s.status === "manutenção" ? "bg-primary/10" : ""
                        }>
                          <TableCell className="font-medium">{s.week}</TableCell>
                          <TableCell>{s.days}</TableCell>
                          <TableCell>{s.dropsPerDose}</TableCell>
                          <TableCell>{s.frequency}</TableCell>
                          <TableCell>{s.mgCanPerDose}</TableCell>
                          <TableCell>{s.mgCbdPerDose}</TableCell>
                          <TableCell className="font-semibold">{s.mgCbdPerDay}</TableCell>
                          <TableCell>{s.mgKgPerDay}</TableCell>
                          <TableCell>
                            {s.status === "manutenção" && <Badge className="bg-primary">Manutenção</Badge>}
                            {s.status === "titulação" && <Badge variant="secondary">Titulação</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Maintenance info */}
              {titulationSteps.find(s => s.status === "manutenção") && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-semibold text-primary">Dose de manutenção</p>
                  <p className="text-sm">
                    {maintenanceDrops} gotas/dose (12/12h) = {maintenanceDrops * 2} gotas/dia = {titulationSteps.find(s => s.status === "manutenção")!.mgCbdPerDay} mg CBD/dia — até retorno médico em 30 dias
                  </p>
                </div>
              )}

              {/* Bottle calculation */}
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <p className="font-semibold">Cálculo de frascos (30 dias)</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Semana</TableHead>
                        <TableHead>Gotas/dose</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Gotas consumidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bottleBreakdown.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>{b.week}</TableCell>
                          <TableCell>{b.dropsPerDose}</TableCell>
                          <TableCell>{b.days}</TableCell>
                          <TableCell>{b.drops}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>Total de gotas em 30 dias</TableCell>
                        <TableCell>{totalDrops30}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm">{totalDrops30} gotas ÷ 600 gotas/frasco = <strong>{Math.ceil(totalDrops30 / 600)}</strong> frasco(s)</p>
                  <div className="flex items-center gap-2">
                    <Label>Frascos (editável):</Label>
                    <Input type="number" min={1} className="w-20" value={editableBottles} onChange={e => setEditableBottles(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium">⚠ Nota clínica:</p>
                <p>Canabinoides são metabolizados via CYP3A4 e CYP2C19. Verificar possíveis interações medicamentosas, especialmente com anticoagulantes, antiepilépticos e benzodiazepínicos.</p>
              </div>

              <p className="text-xs text-muted-foreground italic">⚕ Todas as sugestões são baseadas em literatura clínica. O médico tem autonomia total para ajustar qualquer valor.</p>

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
                  <p className="font-medium">{selectedProduct.fullLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProduct.receituarioType}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Posologia resumida</p>
                  <p className="font-medium text-sm">
                    Via {via} · {time1}h e {time2}h · Dose inicial: {initialDrops} gotas · Incremento: +{increment} gotas a cada {intervalDays} dias · Manutenção: {maintenanceDrops} gotas/dose
                  </p>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Data de retorno</p>
                  <p className="font-medium">{returnDate ? new Date(returnDate + "T12:00:00").toLocaleDateString("pt-BR") : "A definir"}</p>
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

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
                <Button onClick={() => navigate(`/pacientes/${patient.id}/historico`)}>
                  Finalizar Prescrição
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
