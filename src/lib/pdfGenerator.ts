import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Product, TitulationStep } from "./prescriptionData";

// ── Shared types ──

interface DoctorInfo {
  full_name: string;
  crm: string;
  specialty: string;
  phone?: string;
  address?: string;
}

interface PatientInfo {
  full_name: string;
  cpf: string;
  rg?: string | null;
  birth_date?: string | null;
  weight?: number | null;
  address?: string | null;
}

interface PrescriptionInfo {
  pathology: string;
  cid10: string;
  product: string;
  productType: string;
  doseStart: number;
  doseTarget: number;
  doseMax: number;
  titulationSteps: TitulationStep[];
  patientWeight?: number | null;
  intervalDays: number;
  via: string;
  initialDrops: number;
  durationMonths: number;
  bottles: number;
  mgPerDrop: number;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawDoctorHeader(doc: jsPDF, doctor: DoctorInfo, typeLabel: string): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 60);
  doc.text(`Dr(a). ${doctor.full_name}`, pw / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${doctor.specialty} — CRM: ${doctor.crm}`, pw / 2, y, { align: "center" });
  y += 5;
  if (doctor.phone || doctor.address) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text([doctor.address, doctor.phone].filter(Boolean).join(" | "), pw / 2, y, { align: "center" });
    y += 5;
  }
  // Badge
  doc.setFontSize(9);
  doc.setTextColor(29, 158, 117);
  doc.text(`${typeLabel}  ·  ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.5);
  doc.line(20, y, pw - 20, y);
  y += 8;
  return y;
}

// ═══════════════════════════════════════════════════
// DOCUMENTO 1 — RECEITA MÉDICA
// ═══════════════════════════════════════════════════

interface ReceitaParams {
  doctor: DoctorInfo;
  patient: PatientInfo;
  prescriptionData: PrescriptionInfo;
}

export function generatePrescriptionPDF({ doctor, patient, prescriptionData: pd }: ReceitaParams) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  let y = drawDoctorHeader(doc, doctor, `Receituário ${pd.productType}`);

  // Paciente
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${patient.full_name}`, 20, y); y += 5;
  doc.text(`CPF: ${patient.cpf}`, 20, y); y += 5;
  if (patient.birth_date) { doc.text(`Nascimento: ${new Date(patient.birth_date).toLocaleDateString("pt-BR")}`, 20, y); y += 5; }
  doc.text(`Peso: ${patient.weight ?? "N/I"} kg`, 20, y); y += 8;

  // Diagnóstico
  doc.setFont("helvetica", "bold");
  doc.text("DIAGNÓSTICO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${pd.pathology} — CID-10: ${pd.cid10}`, 20, y); y += 8;

  // Produto
  doc.setFont("helvetica", "bold");
  doc.text("PRODUTO PRESCRITO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${pd.product} — 7237 mg/30 mL — ${pd.productType}`, 20, y); y += 8;

  // Posologia
  doc.setFont("helvetica", "bold");
  doc.text("POSOLOGIA", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const posLines = [
    `Via: ${pd.via}`,
    `Dose inicial: ${pd.initialDrops} gotas por tomada, de 12/12 horas`,
    `Titulação: dobrar a dose a cada ${pd.intervalDays} dias até melhora clínica`,
    `Dose alvo: ${pd.doseTarget} mg/dia`,
    `Dose máxima: ${pd.doseMax} mg/dia`,
    `mg/gota: ${pd.mgPerDrop}`,
  ];
  posLines.forEach(l => { doc.text(l, 24, y); y += 5; });
  y += 3;
  doc.setFontSize(10);

  // Quantidade
  doc.setFont("helvetica", "bold");
  doc.text("QUANTIDADE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${pd.bottles} frasco(s) de 30 mL — duração ${pd.durationMonths} mês(es)`, 20, y); y += 15;

  // Assinaturas
  y = checkPageBreak(doc, y, 30);
  doc.line(20, y, 90, y);
  doc.line(pw - 90, y, pw - 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("Assinatura e carimbo", pw - 80, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pw - 80, y);
  y += 15;

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} | Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

  doc.save(`receita_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ═══════════════════════════════════════════════════
// DOCUMENTO 2 — GUIA DO PACIENTE
// ═══════════════════════════════════════════════════

interface GuiaParams {
  doctor: DoctorInfo;
  patient: PatientInfo;
  prescriptionData: PrescriptionInfo;
  product: Product;
}

export function generatePatientGuidePDF({ doctor, patient, prescriptionData: pd, product }: GuiaParams) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Green header
  doc.setFillColor(29, 158, 117);
  doc.rect(0, 0, pw, 35, "F");
  doc.setFontSize(16);
  doc.setTextColor(255);
  doc.text("Guia de Uso — Cannabis Medicinal", pw / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`${pd.product} · ${pd.productType}`, pw / 2, 25, { align: "center" });
  y = 45;

  // Identification
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Paciente: ${patient.full_name} · Peso: ${patient.weight ?? "N/I"} kg`, 20, y); y += 5;
  doc.text(`Produto: ${pd.product} (${pd.productType})`, 20, y); y += 5;
  doc.text(`Médico responsável: Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, 20, y); y += 10;

  // Section 1 - Why
  y = checkPageBreak(doc, y, 25);
  doc.setFont("helvetica", "bold");
  doc.text("1. POR QUE ESTE PRODUTO FOI INDICADO PARA VOCÊ", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const j1 = doc.splitTextToSize(product.clinicalJustification, pw - 40);
  doc.text(j1, 20, y); y += j1.length * 4 + 2;
  const j2 = doc.splitTextToSize(product.cannabinoidJustification, pw - 40);
  doc.text(j2, 20, y); y += j2.length * 4 + 6;

  // Section 2 - How to take
  y = checkPageBreak(doc, y, 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("2. COMO TOMAR O PRODUTO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const howLines = [
    `• Administrar por via ${pd.via}, de 12 em 12 horas.`,
    `• Se sublingual: pingar sob a língua e aguardar 60–90 segundos antes de engolir.`,
    `• Preferencialmente junto a alimento com gordura para melhor absorção.`,
    `• Dose inicial: ${pd.initialDrops} gotas por tomada.`,
  ];
  howLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 20, y); y += 5; });
  y += 4;

  // Section 3 - Titration schedule
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("3. CRONOGRAMA SEMANAL DE TITULAÇÃO", 20, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Semana", "Gotas/dose", "Gotas/dia", "mg CBD/dia", "Observação"]],
    body: pd.titulationSteps.map(s => [
      `Sem. ${s.week}`,
      s.dropsPerDose,
      s.dropsPerDay,
      s.mgCbdPerDay,
      s.status === "target" ? "→ Dose alvo" : s.status === "above_max" ? "⚠ Acima do máx." : "",
    ]),
    theme: "grid",
    headStyles: { fillColor: [29, 158, 117] },
    styles: { fontSize: 8 },
    margin: { left: 20, right: 20 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 4 - When to maintain
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("4. QUANDO MANTER A DOSE — DOSE DE EQUILÍBRIO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const maintainLines = [
    "Quando você perceber melhora significativa dos seus sintomas principais,",
    "essa é sua dose de equilíbrio. Mantenha-a sem aumentar.",
  ];
  maintainLines.forEach(l => { doc.text(l, 20, y); y += 5; });
  y += 4;

  // Section 5 - Excessive dose signs
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("5. SINAIS DE DOSE EXCESSIVA E O QUE FAZER", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const excessLines = [
    "• Sonolência excessiva, tontura, boca seca, alteração gastrointestinal.",
    "• Se ocorrer: VOLTE à dose da semana anterior e mantenha.",
    "• Comunique o médico na próxima consulta.",
  ];
  excessLines.forEach(l => { doc.text(l, 20, y); y += 5; });
  y += 4;

  // Section 6 - Important care
  y = checkPageBreak(doc, y, 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("6. CUIDADOS IMPORTANTES", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const careLines = [
    "• Informe ao médico todos os medicamentos em uso (risco de interações via CYP3A4).",
    "• Armazene em local fresco, ao abrigo da luz e fora do alcance de crianças.",
    "• Verifique sempre o Certificado de Análise (COA) do produto.",
    "• Não dirija ou opere máquinas pesadas até conhecer seus efeitos individuais.",
  ];
  careLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 20, y); y += 5; });
  y += 4;

  // Section 7 - Follow-up
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("7. RETORNO E ACOMPANHAMENTO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const followLines = [
    "• Consulta de retorno em 30 dias (ou antes se necessário).",
    "• Nos primeiros 3 meses, acompanhamento mais frequente para ajustes.",
    "• Mantenha um diário de sintomas: dose, horários, melhora e efeitos adversos.",
  ];
  followLines.forEach(l => { doc.text(l, 20, y); y += 5; });
  y += 8;

  // TCLE
  y = checkPageBreak(doc, y, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const tcle = `Eu, ${patient.full_name}, CPF ${patient.cpf}, declaro que fui devidamente informado(a) pelo(a) Dr(a). ${doctor.full_name} (CRM ${doctor.crm}) sobre a natureza do tratamento com produtos à base de Cannabis medicinal, os benefícios esperados e possíveis efeitos adversos, o produto prescrito (${pd.product} - ${pd.productType}), a posologia e o protocolo de titulação gradual, a necessidade de acompanhamento médico regular, e que o tratamento pode ser suspenso a qualquer momento. Declaro estar ciente e de acordo com o tratamento proposto.`;
  const tcleLines = doc.splitTextToSize(tcle, pw - 40);
  doc.text(tcleLines, 20, y);
  y += tcleLines.length * 4 + 15;

  // Signatures
  y = checkPageBreak(doc, y, 25);
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.line(20, y, 90, y);
  doc.line(pw - 90, y, pw - 20, y);
  y += 5;
  doc.text("Assinatura do Paciente", 25, y);
  doc.text("Assinatura do Médico", pw - 85, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(patient.full_name, 25, y);
  doc.text(`Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pw - 85, y);

  doc.save(`guia_paciente_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
