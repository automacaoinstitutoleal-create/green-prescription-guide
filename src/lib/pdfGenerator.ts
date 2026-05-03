import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PATHOLOGIES, getDoseRange, type Product, type TitulationStep, type TitulationConfig } from "./prescriptionData";

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

interface GuideScheduleStep {
  week: number;
  days: string;
  dropsPerDose: number;
  frequency: string;
  mgCanPerDose: number;
  mgCbdPerDose: number;
  mgCbdPerDay: number;
  mgKgPerDay: number;
  status: "titulação" | "dose_maxima";
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

function createGuideScheduleStep(
  week: number,
  dropsPerDose: number,
  intervalDays: number,
  product: Product,
  weightKg: number,
  status: GuideScheduleStep["status"],
): GuideScheduleStep {
  const mgCanPerDrop = product.mgMl / product.dropsPerMl;
  const mgCbdPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;
  const dayStart = (week - 1) * intervalDays + 1;
  const dayEnd = dayStart + intervalDays - 1;
  const dropsPerDay = dropsPerDose * 2;

  return {
    week,
    days: `Dia ${dayStart}–${dayEnd}`,
    dropsPerDose,
    frequency: "12/12h",
    mgCanPerDose: +(dropsPerDose * mgCanPerDrop).toFixed(1),
    mgCbdPerDose: +(dropsPerDose * mgCbdPerDrop).toFixed(1),
    mgCbdPerDay: +(dropsPerDay * mgCbdPerDrop).toFixed(1),
    mgKgPerDay: weightKg > 0 ? +(dropsPerDay * mgCbdPerDrop / weightKg).toFixed(2) : 0,
    status,
  };
}

function buildPatientGuideSchedule(pd: PrescriptionInfo, product: Product) {
  const pathology = PATHOLOGIES.find((item) => item.name === pd.pathology);
  const weightKg = pd.patientWeight ?? 0;

  if (!pathology || weightKg <= 0) {
    return {
      steps: pd.titulationSteps.map<GuideScheduleStep>((step) => ({
        week: step.week,
        days: step.days,
        dropsPerDose: step.dropsPerDose,
        frequency: step.frequency,
        mgCanPerDose: step.mgCanPerDose,
        mgCbdPerDose: step.mgCbdPerDose,
        mgCbdPerDay: step.mgCbdPerDay,
        mgKgPerDay: step.mgKgPerDay,
        status: step.status === "manutenção" ? "dose_maxima" : "titulação",
      })),
      maxMgDay: null as number | null,
    };
  }

  const doseRange = getDoseRange(pathology, weightKg);
  const mgCbdPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;
  const exactTargetDropsPerDose = doseRange.max / (mgCbdPerDrop * 2);
  const targetDropsPerDose = Math.max(pd.config.initialDrops, Math.round(exactTargetDropsPerDose));
  const steps: GuideScheduleStep[] = [];

  let week = 1;
  let dropsPerDose = pd.config.initialDrops;

  while (week <= 52) {
    const reachedMaxDose = dropsPerDose >= targetDropsPerDose;

    steps.push(
      createGuideScheduleStep(
        week,
        dropsPerDose,
        pd.config.intervalDays,
        product,
        weightKg,
        reachedMaxDose ? "dose_maxima" : "titulação",
      ),
    );

    if (reachedMaxDose) break;

    const nextDrops = dropsPerDose + pd.config.increment;
    dropsPerDose = nextDrops >= targetDropsPerDose ? targetDropsPerDose : nextDrops;
    week += 1;
  }

  return {
    steps,
    maxMgDay: doseRange.max,
  };
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
  const { steps: guideScheduleSteps, maxMgDay } = buildPatientGuideSchedule(pd, product);
  const finalGuideStep = guideScheduleSteps[guideScheduleSteps.length - 1];

  // Margens de segurança
  const M = 22;                       // margem esquerda/direita reforçada
  const INDENT = 4;                   // recuo para listas
  const CONTENT_W = pw - M * 2;       // largura útil para texto comum
  const INDENT_W = pw - M * 2 - INDENT; // largura útil para texto recuado

  let y = 20;

  // Helper: escreve um parágrafo já quebrado, paginando e respeitando maxWidth
  const writePara = (text: string, opts?: { x?: number; width?: number; size?: number; bold?: boolean; gap?: number }) => {
    const x = opts?.x ?? M;
    const width = opts?.width ?? CONTENT_W;
    const size = opts?.size ?? 9;
    const bold = opts?.bold ?? false;
    const gap = opts?.gap ?? 1;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");

    const paragraphs = String(text ?? "").split("\n");
    const lineH = size * 0.42;

    paragraphs.forEach((paragraph, index) => {
      const lines = doc.splitTextToSize(paragraph || " ", Math.max(40, width - 2));
      const blockHeight = lines.length * lineH;
      y = checkPageBreak(doc, y, blockHeight + 1);
      doc.text(lines, x, y, { maxWidth: Math.max(40, width - 2) });
      y += blockHeight;
      if (index < paragraphs.length - 1) y += 1.5;
    });

    y += gap;
  };

  const writeSectionTitle = (title: string) => {
    y = checkPageBreak(doc, y, 12);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(title, CONTENT_W - 2);
    const lineH = 4.8;
    lines.forEach((ln: string) => {
      doc.text(ln, M, y, { maxWidth: CONTENT_W - 2 });
      y += lineH;
    });
    y += 1;
  };

  // ── Cabeçalho minimalista (sem faixa colorida) ──
  const M_TOP = 18;
  doc.setTextColor(29, 78, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Guia de Uso — Greenlion Precision", pw / 2, M_TOP, { align: "center" });

  doc.setTextColor(90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headPatient = doc.splitTextToSize(`Paciente: ${patient.full_name} · ${patient.weight ?? "N/I"}kg`, pw - 40);
  doc.text(headPatient[0], pw / 2, M_TOP + 6, { align: "center" });

  const headProduct = doc.splitTextToSize(`Produto: ${pd.productFullLabel}`, pw - 40);
  doc.text(headProduct[0], pw / 2, M_TOP + 11, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(120);
  const headDoc = doc.splitTextToSize(
    `Médico: Dr(a). ${doctor.full_name} · CRM ${doctor.crm}${doctor.phone ? ` · Tel: ${doctor.phone}` : ""}`,
    pw - 40,
  );
  doc.text(headDoc[0], pw / 2, M_TOP + 16, { align: "center" });
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, M_TOP + 21, { align: "center" });

  // Linha divisória sutil
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.3);
  doc.line(M, M_TOP + 25, pw - M, M_TOP + 25);

  y = M_TOP + 32;
  doc.setTextColor(0);

  // ── Section 1: Por que ──
  writeSectionTitle("1. POR QUE ESTE PRODUTO FOI INDICADO PARA VOCÊ");
  writePara(product.clinicalJustification, { gap: 2 });
  writePara(product.cannabinoidJustification, { gap: 5 });

  // ── Section 2: Como tomar ──
  writeSectionTitle("2. COMO TOMAR O SEU MEDICAMENTO");
  const howLines = [
    "Passo a passo:",
    "1. Agite levemente o frasco antes de usar.",
    "2. Coloque as gotas EMBAIXO DA LÍNGUA.",
    "3. Segure por 60 a 90 segundos sem engolir.",
    "4. Depois engula normalmente.",
    `5. Tome SEMPRE nos mesmos horários: ${cfg.time1}h e ${cfg.time2}h.`,
    "6. Para melhor absorção, tome junto com alimento gorduroso (azeite, abacate, castanhas ou amendoim).",
  ];
  howLines.forEach(l => writePara(l, { x: M + INDENT, width: INDENT_W, gap: 0.5 }));
  y += 3;

  // ── Section 3: Cronograma ──
  writeSectionTitle("3. SEU CRONOGRAMA COMPLETO DE USO");
  writePara(
    "A receita mostra o início do ajuste; este guia traz a progressão completa até a dose máxima da patologia.",
    { size: 8, gap: 2 },
  );

  guideScheduleSteps.forEach((s) => {
    const title = s.status === "dose_maxima"
      ? `Semana ${s.week} (${s.days}) — Dose máxima da patologia:`
      : `Semana ${s.week} (${s.days}):`;
    writePara(title, { x: M + INDENT, width: INDENT_W, size: 9, bold: true, gap: 0.2 });
    writePara(
      `${cfg.time1}h → ${s.dropsPerDose} gotas · ${cfg.time2}h → ${s.dropsPerDose} gotas`,
      { x: M + INDENT + 4, width: INDENT_W - 4, size: 9, gap: 1.5 },
    );
  });

  if (finalGuideStep) {
    writePara(
      `Ao atingir a semana ${finalGuideStep.week}, correspondente à dose máxima prevista para ${pd.pathology}${maxMgDay ? ` (~${maxMgDay.toFixed(0)} mg CBD/dia)` : ""}, não aumente além disso sem nova orientação médica.`,
      { x: M + INDENT, width: INDENT_W, size: 9, gap: 1.5 },
    );
    writePara(
      "Se houver efeitos adversos, volte para a dose da semana anterior e entre em contato com o consultório.",
      { x: M + INDENT, width: INDENT_W, size: 9, gap: 3 },
    );
  }

  writePara("★ AO FINAL DE 30 DIAS: entre em contato com o consultório.", {
    x: M + INDENT, width: INDENT_W, size: 9, bold: true, gap: 0.5,
  });
  writePara("O médico vai avaliar sua resposta e decidir o próximo ajuste de dose.", {
    x: M + INDENT, width: INDENT_W, size: 8, gap: 5,
  });

  // Tabela resumida do cronograma
  y = checkPageBreak(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [["Semana", "Período", "Gotas/dose", "Frequência", "Total/dia", "Status"]],
    body: guideScheduleSteps.map(s => [
      `Sem. ${s.week}`,
      s.days,
      `${s.dropsPerDose} gotas`,
      s.frequency,
      `${Number(s.dropsPerDose) * 2} gotas`,
      s.status === "dose_maxima" ? "Dose máxima" : "Titulação",
    ]),
    theme: "grid",
    headStyles: { fillColor: [29, 158, 117], fontSize: 8, halign: "center", textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "middle" },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 30 },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 26, halign: "center" },
    },
    margin: { left: M, right: M },
    tableWidth: "auto",
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Section 4: Sinais de dose alta demais ──
  writeSectionTitle("4. SINAIS DE DOSE ALTA DEMAIS — O QUE FAZER");
  const excessLines = [
    "Se sentir qualquer um destes sinais:",
    "• Tontura",
    "• Sonolência excessiva",
    "• Boca muito seca",
    "• Náusea",
    "• Desorientação ou mal-estar",
    "",
    "NÃO SE PREOCUPE — não é perigoso. Significa que a dose está um pouco acima do seu limite individual.",
    "",
    "O QUE FAZER IMEDIATAMENTE:",
    "→ Volte para a dose da semana anterior.",
    `→ Entre em contato com o consultório${doctor.phone ? `: ${doctor.phone}` : "."}`,
    "→ Não retome a dose maior sem orientação médica.",
  ];
  excessLines.forEach(l => writePara(l, { x: M + INDENT, width: INDENT_W, gap: 0.5 }));
  y += 3;

  // ── Section 5: Cuidados importantes ──
  writeSectionTitle("5. CUIDADOS IMPORTANTES");
  const careLines = [
    "• Não pare de usar de repente — se precisar parar, reduza 25% por semana e avise o médico.",
    "• Informe TODOS os seus médicos que está usando este medicamento (pode interagir com anticoagulantes, antiepilépticos, antidepressivos).",
    "• Guarde em local fresco, seco e escuro, longe da luz solar.",
    "• Mantenha fora do alcance de crianças.",
    "• Verifique o número do lote e o COA no QR Code da embalagem.",
    "• Não tome com álcool.",
  ];
  careLines.forEach(l => writePara(l, { x: M + INDENT, width: INDENT_W, gap: 0.5 }));
  y += 3;

  // ── Section 6: Retorno ──
  writeSectionTitle("6. RETORNO E ACOMPANHAMENTO");
  const returnDateFormatted = cfg.returnDate
    ? new Date(cfg.returnDate + "T12:00:00").toLocaleDateString("pt-BR")
    : "A definir";
  const followLines = [
    `Sua consulta de retorno: ${returnDateFormatted}`,
    "",
    "Nessa consulta o médico vai avaliar:",
    "• Como você está respondendo ao tratamento.",
    "• Se a dose atual está adequada.",
    "• Se precisa aumentar, reduzir ou manter.",
    "• Se o produto segue sendo o mais indicado.",
    "",
    "Para se preparar, anote todo dia:",
    "• Dose que está tomando.",
    "• Nível de dor ou intensidade dos sintomas (0 a 10).",
    "• Qualidade do sono.",
    "• Qualquer efeito que tenha sentido.",
    "",
    "Contato para dúvidas ou efeitos adversos antes do retorno:",
    `Tel: ${doctor.phone || "(consulte o consultório)"}`,
  ];
  followLines.forEach(l => writePara(l, { x: M + INDENT, width: INDENT_W, gap: 0.5 }));
  y += 4;

  // ── Section 7: TCLE ──
  writeSectionTitle("7. TCLE — TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO");
  const tcle = `Eu, ${patient.full_name}, declaro ter sido informado(a) pelo médico ${doctor.full_name} sobre os potenciais benefícios e riscos do tratamento com ${pd.productFullLabel}, incluindo possibilidade de tontura, sonolência excessiva, boca seca, alterações de apetite e interações com outros medicamentos.

Fui orientado(a) sobre o protocolo de titulação e sei que devo entrar em contato com o médico ao sentir efeitos adversos ou ao final de 30 dias para continuidade do tratamento.

Autorizo o início do tratamento conforme prescrição médica.

Declaro ciência de que o produto não é isento de riscos e não substitui tratamentos convencionais já indicados.

Manter fora do alcance de crianças.`;
  tcle.split("\n\n").forEach(par => writePara(par, { size: 8, gap: 2 }));
  y += 4;

  // Assinatura
  y = checkPageBreak(doc, y, 20);
  writePara("Assinatura do paciente / responsável: _______________________", { size: 9, gap: 2 });
  writePara("Data: ___/___/______", { size: 9, gap: 5 });

  // Rodapé
  y = checkPageBreak(doc, y, 10);
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.3);
  doc.line(M, y, pw - M, y); y += 5;
  doc.setTextColor(120);
  writePara("Este guia é complementar à receita médica. Guarde os dois documentos juntos.", { size: 8 });

  doc.save(`guia_paciente_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
