import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfParams {
  doctor: {
    full_name: string;
    crm: string;
    specialty: string;
    phone?: string | null;
    address?: string | null;
  };
  patient: {
    full_name: string;
    cpf: string;
    rg?: string | null;
    birth_date?: string | null;
    weight?: number | null;
    address?: string | null;
  };
  prescriptionData: {
    pathology: string;
    product: string;
    productType: string;
    dosePerKg: number;
    calculatedDose: number;
    concentration: number;
    titulationSteps: Array<{
      week: number;
      days: string;
      doseMorning: number;
      doseEvening: number;
      totalDaily: number;
      volumeMorning: number;
      volumeEvening: number;
    }>;
    patientWeight?: number | null;
  };
  tcleAccepted: boolean;
}

const BOTTLE_ML = 30;

function calcBottlesPerMonth(dailyVolumeMl: number): number {
  const monthlyMl = dailyVolumeMl * 30;
  return Math.ceil(monthlyMl / BOTTLE_ML);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generatePrescriptionPDF({ doctor, patient, prescriptionData, tcleAccepted }: PdfParams) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Header ──
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 60);
  doc.text(`Dr(a). ${doctor.full_name}`, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${doctor.specialty} — CRM: ${doctor.crm}`, pageWidth / 2, y, { align: "center" });
  y += 5;
  if (doctor.phone || doctor.address) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const contactInfo = [doctor.phone, doctor.address].filter(Boolean).join(" | ");
    doc.text(contactInfo, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Receituário — Cannabis Medicinal", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // ── Paciente ──
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${patient.full_name}`, 20, y); y += 5;
  doc.text(`CPF: ${patient.cpf}${patient.rg ? ` | RG: ${patient.rg}` : ""}`, 20, y); y += 5;
  if (patient.birth_date) { doc.text(`Data de nascimento: ${new Date(patient.birth_date).toLocaleDateString("pt-BR")}`, 20, y); y += 5; }
  doc.text(`Peso: ${patient.weight ?? "N/I"} kg`, 20, y); y += 5;
  if (patient.address) { doc.text(`Endereço: ${patient.address}`, 20, y); y += 5; }
  y += 5;

  // ── Prescrição ──
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIÇÃO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Patologia / Indicação clínica: ${prescriptionData.pathology}`, 20, y); y += 5;
  doc.text(`Produto: ${prescriptionData.product} (${prescriptionData.productType})`, 20, y); y += 5;
  doc.text(`Concentração: ${prescriptionData.concentration} mg/mL — Frasco de ${BOTTLE_ML} mL`, 20, y); y += 5;

  // Dose calculations
  const targetDailyVolume = Math.round((prescriptionData.calculatedDose / prescriptionData.concentration) * 100) / 100;
  const initialStep = prescriptionData.titulationSteps[0];
  const initialDailyVolume = initialStep
    ? Math.round((initialStep.totalDaily / prescriptionData.concentration) * 100) / 100
    : targetDailyVolume / 4;

  const bottlesInitial = calcBottlesPerMonth(initialDailyVolume);
  const bottlesMaintenance = calcBottlesPerMonth(targetDailyVolume);

  doc.text(`Dose alvo: ${prescriptionData.dosePerKg} mg/kg/dia = ${prescriptionData.calculatedDose} mg/dia (${targetDailyVolume} mL/dia)`, 20, y); y += 5;
  doc.text(`Dose inicial: ${initialStep ? initialStep.totalDaily : "—"} mg/dia (${initialDailyVolume} mL/dia)`, 20, y); y += 5;

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Quantidade de frascos por mês:", 20, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`• Fase de titulação (dose inicial): ${bottlesInitial} frasco(s)/mês`, 24, y); y += 5;
  doc.text(`• Dose de manutenção (dose alvo): ${bottlesMaintenance} frasco(s)/mês`, 24, y); y += 5;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`* A quantidade de frascos pode variar durante a titulação conforme ajuste semanal da dose.`, 24, y); y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0);

  // ── Posologia ──
  y = checkPageBreak(doc, y, 15);
  doc.setFont("helvetica", "bold");
  doc.text("POSOLOGIA E MODO DE USO", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const posLines = [
    `Administrar por via oral (sublingual), de 12 em 12 horas.`,
    ``,
    `1. Iniciar com a DOSE MÍNIMA conforme a tabela de titulação abaixo.`,
    `2. Dobrar a dose a cada 7 dias, conforme tolerância do paciente.`,
    `3. Manter a dose na qual ocorrer melhora satisfatória dos sintomas da queixa principal.`,
    `4. Se houver efeitos adversos (sonolência excessiva, tontura, alteração gastrointestinal),`,
    `   RETORNAR À DOSE DA SEMANA ANTERIOR e manter como dose de manutenção.`,
    `5. Não ultrapassar a dose alvo sem orientação médica.`,
  ];
  posLines.forEach((line) => {
    y = checkPageBreak(doc, y, 5);
    doc.text(line, 24, y);
    y += line === "" ? 2 : 4;
  });
  y += 4;
  doc.setFontSize(10);

  // ── Tabela de titulação ──
  y = checkPageBreak(doc, y, 30);
  doc.setFont("helvetica", "bold");
  doc.text("PROTOCOLO DE TITULAÇÃO", 20, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Semana", "Período", "Manhã (mg)", "Noite (mg)", "Total/dia (mg)", "Vol. manhã (mL)", "Vol. noite (mL)"]],
    body: prescriptionData.titulationSteps.map((s) => [
      s.week, s.days, s.doseMorning, s.doseEvening, s.totalDaily, s.volumeMorning, s.volumeEvening,
    ]),
    theme: "grid",
    headStyles: { fillColor: [29, 158, 117] },
    styles: { fontSize: 8 },
    margin: { left: 20, right: 20 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Orientações clínicas ──
  y = checkPageBreak(doc, y, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORIENTAÇÕES AO PACIENTE", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const orientations = [
    "• O tratamento com Cannabis medicinal é individualizado. A dose ideal varia de pessoa para pessoa.",
    "• Inicie sempre pela dose mínima e aumente gradualmente conforme a tabela de titulação.",
    "• A cada semana, observe a melhora dos sintomas da queixa principal antes de aumentar a dose.",
    "• Caso apresente efeitos adversos como sonolência excessiva, tontura ou desconforto gastrointestinal,",
    "  retorne à dose da semana anterior e mantenha-a como dose de manutenção.",
    "• NÃO aumente a dose por conta própria além do protocolo estabelecido.",
    "",
    "• CONSULTAS DE CONTROLE: É fundamental o acompanhamento médico regular, especialmente nos",
    "  primeiros 3 meses de tratamento, para adequação das doses e avaliação da resposta terapêutica.",
    "  Agende retorno em 30 dias ou antes, caso necessário.",
    "",
    "• Mantenha um diário de sintomas anotando: dose utilizada, horários, melhora percebida e",
    "  eventuais efeitos adversos. Traga essas anotações nas consultas de retorno.",
    "• Armazene o produto em local fresco, ao abrigo da luz e fora do alcance de crianças.",
  ];

  orientations.forEach((line) => {
    y = checkPageBreak(doc, y, 5);
    doc.text(line, 24, y);
    y += line === "" ? 2 : 4;
  });
  y += 6;

  // ── TCLE ──
  y = checkPageBreak(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)", 20, y); y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const tcleText = `Eu, ${patient.full_name}, CPF ${patient.cpf}, declaro que fui devidamente informado(a) pelo(a) Dr(a). ${doctor.full_name} (CRM ${doctor.crm}) sobre a natureza do tratamento com produtos à base de Cannabis medicinal, os benefícios esperados e possíveis efeitos adversos, o produto prescrito (${prescriptionData.product} - ${prescriptionData.productType}), a posologia e o protocolo de titulação gradual, a necessidade de acompanhamento médico regular especialmente nos primeiros meses, e que o tratamento pode ser suspenso a qualquer momento. Declaro estar ciente e de acordo com o tratamento proposto.`;

  const lines = doc.splitTextToSize(tcleText, pageWidth - 40);
  doc.text(lines, 20, y);
  y += lines.length * 4 + 10;

  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(9);
  doc.text(`Status do TCLE: ${tcleAccepted ? "ACEITO" : "PENDENTE"}`, 20, y); y += 15;

  // ── Assinaturas ──
  y = checkPageBreak(doc, y, 25);
  doc.line(20, y, 90, y);
  doc.line(pageWidth - 90, y, pageWidth - 20, y);
  y += 5;
  doc.text("Assinatura do Paciente", 30, y);
  doc.text("Assinatura do Médico", pageWidth - 80, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pageWidth - 80, y);
  y += 10;

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")} | Dr(a). ${doctor.full_name} — CRM: ${doctor.crm}`, pageWidth / 2, y, { align: "center" });

  doc.save(`receita_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
