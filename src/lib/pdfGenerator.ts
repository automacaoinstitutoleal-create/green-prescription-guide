import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Product, TitulationStep, TitulationConfig } from "./prescriptionData";

// ── Shared types ──

interface DoctorInfo {
  full_name: string;
  crm: string;
  specialty: string;
  phone?: string;
  address?: string;
  email?: string;
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
  titulationSteps: TitulationStep[];
  patientWeight?: number | null;
  bottles: number;
  mgPerDrop: number;       // mg canabinoides totais per drop
  mgCbdPerDrop: number;    // mg CBD per drop
  config: TitulationConfig;
  productFullLabel: string;
  productComposition: string;
  receituarioType: string;
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

function viaLabel(via: string): string {
  if (via === "sublingual") return "sublingual (manter sob a língua por 60–90 segundos antes de engolir)";
  if (via === "oral") return "oral com alimento";
  if (via === "azeite") return "oral com azeite ou alimento gorduroso";
  return via;
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
  const cfg = pd.config;

  let y = drawDoctorHeader(doc, doctor, pd.receituarioType);

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

  // Produto prescrito — nome comercial completo
  doc.setFont("helvetica", "bold");
  doc.text("PRODUTO PRESCRITO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const labelLines = doc.splitTextToSize(pd.productFullLabel, pw - 40);
  doc.text(labelLines, 20, y); y += labelLines.length * 4 + 2;
  const compLines = doc.splitTextToSize(pd.productComposition, pw - 40);
  doc.text(compLines, 20, y); y += compLines.length * 4 + 2;
  doc.setFont("helvetica", "italic");
  doc.text(pd.receituarioType, 20, y); y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Posologia
  doc.setFont("helvetica", "bold");
  doc.text("POSOLOGIA", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const posLines: string[] = [
    `Via de administração: ${viaLabel(cfg.via)}, de 12 em 12 horas (${cfg.time1}h e ${cfg.time2}h).`,
    "",
  ];

  // Build titration weeks
  const titSteps = pd.titulationSteps.filter(s => s.status === "titulação");
  titSteps.forEach(s => {
    posLines.push(`${s.days}: ${s.dropsPerDose} gotas por dose · ${s.mgCbdPerDose}mg CBD/dose`);
  });
  const maintStep = pd.titulationSteps.find(s => s.status === "manutenção");
  if (maintStep) {
    posLines.push(`A partir do ${maintStep.days.replace("Dia ", "dia ").replace("+", "")}: ${maintStep.dropsPerDose} gotas por dose · ${maintStep.mgCbdPerDose}mg CBD/dose — até retorno médico.`);
  }
  posLines.push("");
  posLines.push(`Cada gota ≈ ${pd.mgPerDrop}mg canabinoides totais · ${pd.mgCbdPerDrop}mg CBD.`);
  posLines.push(`Cronograma completo no Guia do Paciente.`);

  posLines.forEach(l => {
    y = checkPageBreak(doc, y, 5);
    doc.text(l, 24, y); y += 5;
  });
  y += 3;
  doc.setFontSize(10);

  // Quantidade
  doc.setFont("helvetica", "bold");
  doc.text("QUANTIDADE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${pd.bottles} frasco(s) de 30ml — duração: 30 dias até retorno médico.`, 20, y); y += 10;

  // Retorno obrigatório
  y = checkPageBreak(doc, y, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Retorno obrigatório em 30 dias para avaliação e continuidade do ajuste de dose.", 20, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Assinaturas
  y = checkPageBreak(doc, y, 30);
  doc.line(pw - 90, y, pw - 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("Assinatura e carimbo", pw - 80, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pw - 80, y);
  if (doctor.phone) {
    y += 3;
    doc.text(`Tel: ${doctor.phone}`, pw - 80, y);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} | Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}${doctor.phone ? ` — Tel: ${doctor.phone}` : ""}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

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
  const cfg = pd.config;
  let y = 20;

  // Green header
  doc.setFillColor(29, 158, 117);
  doc.rect(0, 0, pw, 45, "F");
  doc.setFontSize(16);
  doc.setTextColor(255);
  doc.text("Guia de Uso — Greenlion Precision", pw / 2, 14, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Paciente: ${patient.full_name} · ${patient.weight ?? "N/I"}kg`, pw / 2, 22, { align: "center" });
  doc.text(`Produto: ${pd.productFullLabel}`, pw / 2, 28, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Médico: Dr(a). ${doctor.full_name} · CRM ${doctor.crm}${doctor.phone ? ` · Tel: ${doctor.phone}` : ""}`, pw / 2, 35, { align: "center" });
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 41, { align: "center" });
  y = 55;

  doc.setTextColor(0);

  // ── Section 1: Por que ──
  y = checkPageBreak(doc, y, 25);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. POR QUE ESTE PRODUTO FOI INDICADO PARA VOCÊ", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const j1 = doc.splitTextToSize(product.clinicalJustification, pw - 40);
  doc.text(j1, 20, y); y += j1.length * 4 + 2;
  const j2 = doc.splitTextToSize(product.cannabinoidJustification, pw - 40);
  doc.text(j2, 20, y); y += j2.length * 4 + 6;

  // ── Section 2: Como tomar ──
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("2. COMO TOMAR O SEU MEDICAMENTO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const howLines = [
    "Passo a passo:",
    "1. Agite levemente o frasco antes de usar",
    "2. Coloque as gotas EMBAIXO DA LÍNGUA",
    "3. Segure por 60 a 90 segundos sem engolir",
    "4. Depois engula normalmente",
    `5. Tome SEMPRE nos mesmos horários: ${cfg.time1}h e ${cfg.time2}h`,
    "6. Para melhor absorção: tome junto com alimento gorduroso",
    "   (azeite, abacate, castanhas ou amendoim)",
  ];
  howLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 24, y); y += 5; });
  y += 4;

  // ── Section 3: Cronograma ──
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("3. SEU CRONOGRAMA COMPLETO DE USO", 20, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("As primeiras 4 semanas também constam na sua receita médica.", 20, y); y += 5;

  // Build complete week-by-week schedule until day 30 (or return date)
  const totalDays = 30;
  const titSteps = pd.titulationSteps.filter(s => s.status === "titulação");
  const maintStep = pd.titulationSteps.find(s => s.status === "manutenção");
  const maintDrops = maintStep?.dropsPerDose || cfg.maintenanceDrops;

  // Show all titulation steps
  titSteps.forEach(s => {
    y = checkPageBreak(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.text(`Semana ${s.week} (${s.days}):`, 24, y); y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`  ${cfg.time1}h → ${s.dropsPerDose} gotas · ${cfg.time2}h → ${s.dropsPerDose} gotas`, 28, y); y += 5;
  });

  // Continue with maintenance weeks until day 30
  if (maintStep) {
    const lastTitStep = titSteps[titSteps.length - 1];
    // Parse last titulation day end
    const lastDayMatch = lastTitStep?.days.match(/(\d+)$/);
    const lastTitDay = lastDayMatch ? parseInt(lastDayMatch[1]) : 0;
    
    if (lastTitDay < totalDays) {
      let weekNum = (lastTitStep?.week || 0) + 1;
      let dayStart = lastTitDay + 1;
      
      while (dayStart <= totalDays) {
        const dayEnd = Math.min(dayStart + 6, totalDays);
        y = checkPageBreak(doc, y, 10);
        doc.setFont("helvetica", "bold");
        doc.text(`Semana ${weekNum} (Dia ${dayStart}–${dayEnd}) — Manutenção:`, 24, y); y += 4;
        doc.setFont("helvetica", "normal");
        doc.text(`  ${cfg.time1}h → ${maintDrops} gotas · ${cfg.time2}h → ${maintDrops} gotas`, 28, y); y += 5;
        dayStart = dayEnd + 1;
        weekNum++;
      }
    }
    
    y = checkPageBreak(doc, y, 8);
    doc.setFont("helvetica", "normal");
    doc.text("Manter esta dose até sua consulta de retorno.", 28, y); y += 5;
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("★ AO FINAL DE 30 DIAS: entre em contato com o consultório.", 24, y); y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("O médico vai avaliar sua resposta e decidir o próximo ajuste de dose.", 28, y); y += 8;

  // Also add detailed table
  y = checkPageBreak(doc, y, 20);
  autoTable(doc, {
    startY: y,
    head: [["Semana", "Período", "Gotas/dose", "Freq.", "mg can./dose", "mg CBD/dose", "mg CBD/dia", "mg/kg/dia", "Status"]],
    body: pd.titulationSteps.map(s => [
      `Sem. ${s.week}`,
      s.days,
      s.dropsPerDose,
      s.frequency,
      s.mgCanPerDose,
      s.mgCbdPerDose,
      s.mgCbdPerDay,
      s.mgKgPerDay,
      s.status === "manutenção" ? "Manutenção" : "Titulação",
    ]),
    theme: "grid",
    headStyles: { fillColor: [29, 158, 117], fontSize: 7 },
    styles: { fontSize: 7 },
    margin: { left: 20, right: 20 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Section 4: Sinais de dose alta demais ──
  y = checkPageBreak(doc, y, 35);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("4. SINAIS DE DOSE ALTA DEMAIS — O QUE FAZER", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const excessLines = [
    "Se sentir qualquer um destes sinais:",
    "• Tontura",
    "• Sonolência excessiva",
    "• Boca muito seca",
    "• Náusea",
    "• Desorientação ou mal-estar",
    "",
    "NÃO SE PREOCUPE — não é perigoso.",
    "Significa que a dose está um pouco acima do seu limite individual.",
    "",
    "O QUE FAZER IMEDIATAMENTE:",
    "→ Volte para a dose da semana anterior",
    `→ Entre em contato com o consultório: ${doctor.phone || ""}`,
    "→ Não retome a dose maior sem orientação médica",
  ];
  excessLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 24, y); y += 5; });
  y += 4;

  // ── Section 5: Cuidados importantes ──
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("5. CUIDADOS IMPORTANTES", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const careLines = [
    "• Não pare de usar de repente — se precisar parar, reduza 25% por semana e avise o médico",
    "• Informe TODOS os seus médicos que está usando este medicamento",
    "  (pode interagir com anticoagulantes, antiepilépticos, antidepressivos)",
    "• Guarde em local fresco, seco e escuro, longe da luz solar",
    "• Mantenha fora do alcance de crianças",
    "• Verifique o número do lote e o COA no QR Code da embalagem",
    "• Não tome com álcool",
  ];
  careLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 24, y); y += 5; });
  y += 4;

  // ── Section 6: Retorno ──
  y = checkPageBreak(doc, y, 35);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("6. RETORNO E ACOMPANHAMENTO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const returnDateFormatted = cfg.returnDate
    ? new Date(cfg.returnDate + "T12:00:00").toLocaleDateString("pt-BR")
    : "A definir";

  const followLines = [
    `Sua consulta de retorno: ${returnDateFormatted}`,
    "",
    "Nessa consulta o médico vai avaliar:",
    "• Como você está respondendo ao tratamento",
    "• Se a dose atual está adequada",
    "• Se precisa aumentar, reduzir ou manter",
    "• Se o produto segue sendo o mais indicado",
    "",
    "Para se preparar, anote todo dia:",
    "• Dose que está tomando",
    "• Nível de dor ou intensidade dos sintomas (0 a 10)",
    "• Qualidade do sono",
    "• Qualquer efeito que tenha sentido",
    "",
    `Contato para dúvidas ou efeitos adversos antes do retorno:`,
    `Tel: ${doctor.phone || ""}`,
  ];
  followLines.forEach(l => { y = checkPageBreak(doc, y, 5); doc.text(l, 24, y); y += 5; });
  y += 6;

  // ── Section 7: TCLE ──
  y = checkPageBreak(doc, y, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("7. TCLE — TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const tcle = `Eu, ${patient.full_name}, declaro ter sido informado(a) pelo médico ${doctor.full_name} sobre os potenciais benefícios e riscos do tratamento com ${pd.productFullLabel}, incluindo possibilidade de tontura, sonolência excessiva, boca seca, alterações de apetite e interações com outros medicamentos.\n\nFui orientado(a) sobre o protocolo de titulação e sei que devo entrar em contato com o médico ao sentir efeitos adversos ou ao final de 30 dias para continuidade do tratamento.\n\nAutorizo o início do tratamento conforme prescrição médica.\n\nDeclaro ciência de que o produto não é isento de riscos e não substitui tratamentos convencionais já indicados.\n\nProduto de uso sob controle especial — manter fora do alcance de crianças.`;
  const tcleLines = doc.splitTextToSize(tcle, pw - 40);
  doc.text(tcleLines, 20, y);
  y += tcleLines.length * 3.5 + 10;

  // Signature
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("Assinatura do paciente / responsável: _______________________", 20, y); y += 6;
  doc.text(`Data: ___/___/______`, 20, y); y += 10;

  // Footer
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.3);
  y = checkPageBreak(doc, y, 10);
  doc.line(20, y, pw - 20, y); y += 5;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Este guia é complementar à receita médica. Guarde os dois documentos juntos.", 20, y);

  doc.save(`guia_paciente_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
