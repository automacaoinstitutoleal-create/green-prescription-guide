import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PATHOLOGIES, getDoseRange, type Product, type TitulationStep, type TitulationConfig } from "./prescriptionData";
import {
  PDF_THEME,
  drawPageHeader,
  drawPageFooter,
  drawSectionHeader,
  drawCallout,
  drawHorizontalRule,
  drawSignatureBlock,
  writeParagraph,
  writeKeyValue,
  ensureSpace,
  contentWidth,
  type DoctorInfo as ThemeDoctorInfo,
  type PatientInfo as ThemePatientInfo,
} from "./pdfTheme";

// Re-export tipos para compatibilidade (mantém imports externos funcionando)
type DoctorInfo = ThemeDoctorInfo;
type PatientInfo = ThemePatientInfo;

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
  /** When true, the prescription is for legal/judicial purposes:
   * dose máxima fixa, validade 1 ano, sem titulação. */
  isLegalCase?: boolean;
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
  // Mantido para uso em autoTable e legacy. Wrapper sobre ensureSpace.
  return ensureSpace(doc, y, needed);
}

function viaLabel(via: string): string {
  if (via === "sublingual") return "sublingual (manter sob a língua por 60 a 90 segundos antes de engolir)";
  if (via === "oral") return "oral, com alimento";
  if (via === "azeite") return "oral, junto com azeite ou alimento gorduroso";
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
  const cfg = pd.config;
  const pw = doc.internal.pageSize.getWidth();
  const M = PDF_THEME.layout.marginX;

  // ─── Cabeçalho ───
  let y = drawPageHeader(doc, {
    documentTitle: "Receita Médica",
    documentSubtitle: pd.isLegalCase
      ? "Receita branca · uso contínuo · validade 1 ano"
      : "Receita branca · ajuste progressivo de dose",
    doctor,
  });

  // ─── Identificação do paciente ───
  y = drawSectionHeader(doc, y, "Identificação do paciente");
  y = writeKeyValue(doc, y, "Nome", patient.full_name, { gap: 1 });
  const idLine = [
    `CPF: ${patient.cpf}`,
    patient.rg ? `RG: ${patient.rg}` : null,
  ].filter(Boolean).join("  ·  ");
  y = writeParagraph(doc, y, idLine, { gap: 1 });
  if (patient.birth_date) {
    const dob = new Date(patient.birth_date).toLocaleDateString("pt-BR");
    y = writeParagraph(doc, y, `Data de nascimento: ${dob}`, { gap: 1 });
  }
  if (patient.weight) {
    y = writeParagraph(doc, y, `Peso: ${patient.weight} kg`, { gap: 1 });
  }
  if (patient.address) {
    y = writeParagraph(doc, y, `Endereço: ${patient.address}`, { size: PDF_THEME.font.bodySm, color: PDF_THEME.color.textMuted, gap: 1 });
  }
  y += 3;

  // ─── Diagnóstico ───
  y = drawSectionHeader(doc, y, "Diagnóstico");
  y = writeParagraph(doc, y, `${pd.pathology}`, { bold: true, gap: 0.5 });
  y = writeParagraph(doc, y, `CID-10: ${pd.cid10}`, { color: PDF_THEME.color.textMuted, size: PDF_THEME.font.bodySm });

  // ─── Produto prescrito ───
  y = drawSectionHeader(doc, y, "Produto prescrito");
  y = writeParagraph(doc, y, pd.productFullLabel, { bold: true, gap: 0.5 });
  y = writeParagraph(doc, y, pd.productComposition, { size: PDF_THEME.font.bodySm, gap: 1 });
  y = writeParagraph(doc, y, pd.receituarioType, { italic: true, color: PDF_THEME.color.textMuted, size: PDF_THEME.font.bodySm });

  // ─── Posologia ───
  y = drawSectionHeader(doc, y, "Posologia");
  y = writeParagraph(doc, y, `Via de administração: ${viaLabel(cfg.via)}.`, { gap: 1.5 });
  y = writeParagraph(doc, y, `Frequência: 2 vezes ao dia, às ${cfg.time1} e às ${cfg.time2} (intervalo de 12 horas).`, { gap: 2 });

  if (pd.isLegalCase) {
    // Em judicialização: dose máxima fixa, sem titulação.
    const drops = cfg.maintenanceDrops;
    const mgCbd = +(drops * pd.mgCbdPerDrop).toFixed(1);
    const mgCan = +(drops * pd.mgPerDrop).toFixed(1);
    y = writeParagraph(doc, y, "Dose:", { bold: true, gap: 0.5 });
    y = writeParagraph(doc, y, `${drops} gota(s) por tomada — ${mgCbd} mg de CBD por tomada (${mgCan} mg de canabinoides totais).`, { gap: 1 });
    y = writeParagraph(doc, y, `Dose diária total: ${(+(mgCbd * 2)).toFixed(1)} mg de CBD.`, { gap: 2 });
  } else {
    // Compra direta: cronograma de titulação resumido.
    y = writeParagraph(doc, y, "Cronograma de ajuste de dose:", { bold: true, gap: 1 });

    const titSteps = pd.titulationSteps.filter(s => s.status === "titulação");
    const maintStep = pd.titulationSteps.find(s => s.status === "manutenção");

    titSteps.forEach(s => {
      y = writeParagraph(doc, y,
        `• ${s.days}: ${s.dropsPerDose} gotas por tomada · ${s.mgCbdPerDose} mg de CBD por tomada`,
        { x: M + 4, width: contentWidth(doc) - 4, gap: 0.8 }
      );
    });

    if (maintStep) {
      y = writeParagraph(doc, y,
        `• A partir do ${maintStep.days.toLowerCase().replace("+", "")}: ${maintStep.dropsPerDose} gotas por tomada · ${maintStep.mgCbdPerDose} mg de CBD por tomada — manter até nova orientação.`,
        { x: M + 4, width: contentWidth(doc) - 4, gap: 1.5, bold: true }
      );
    }
  }

  // Concentração do produto (referência rápida)
  y = writeParagraph(doc, y,
    `Concentração: cada gota contém aproximadamente ${pd.mgPerDrop} mg de canabinoides totais (${pd.mgCbdPerDrop} mg de CBD).`,
    { size: PDF_THEME.font.bodySm, color: PDF_THEME.color.textMuted, gap: 2 }
  );

  if (!pd.isLegalCase) {
    y = drawCallout(doc, y,
      "O cronograma completo, com explicações para o paciente, está no Guia de Uso anexo.",
      { variant: "info", size: PDF_THEME.font.bodySm, gap: 4 }
    );
  }

  // ─── Quantidade ───
  y = drawSectionHeader(doc, y, "Quantidade prescrita");
  if (pd.isLegalCase) {
    y = writeParagraph(doc, y,
      `${pd.bottles} frasco(s) de 30 mL por mês — uso contínuo.`,
      { bold: true, gap: 1 }
    );
    y = drawCallout(doc, y,
      "Validade da prescrição: 1 (um) ano a partir da data de emissão. Esta validade estendida visa garantir a continuidade do tratamento durante eventuais entraves no fornecimento judicial.",
      { variant: "legal", title: "Validade especial", size: PDF_THEME.font.bodySm, gap: 4 }
    );
    y = writeParagraph(doc, y,
      "Acompanhamento clínico mínimo a cada 90 dias para reavaliação da resposta terapêutica.",
      { size: PDF_THEME.font.bodySm, color: PDF_THEME.color.textMuted, gap: 2 }
    );
  } else {
    y = writeParagraph(doc, y,
      `${pd.bottles} frasco(s) de 30 mL — duração estimada de 30 dias.`,
      { bold: true, gap: 1 }
    );
    y = drawCallout(doc, y,
      "Retorno em 30 dias para avaliação da resposta terapêutica e ajuste de dose, se necessário.",
      { variant: "info", title: "Retorno obrigatório", size: PDF_THEME.font.bodySm, gap: 4 }
    );
  }

  // ─── Bloco de assinatura ───
  y = drawSignatureBlock(doc, y, { doctor, align: "right" });

  // ─── Rodapé padronizado em todas as páginas ───
  drawPageFooter(doc, {
    text: "Receita Médica · Greenlion",
    doctorName: doctor.full_name,
    doctorCrm: doctor.crm,
  });

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
  const cfg = pd.config;
  const { steps: guideScheduleSteps, maxMgDay } = buildPatientGuideSchedule(pd, product);
  const finalGuideStep = guideScheduleSteps[guideScheduleSteps.length - 1];
  const M = PDF_THEME.layout.marginX;
  const CW = contentWidth(doc);

  // ─── Cabeçalho ───
  let y = drawPageHeader(doc, {
    documentTitle: "Guia de Uso do Paciente",
    documentSubtitle: `${pd.productFullLabel}`,
    doctor,
  });

  // Bloco do paciente
  y = writeKeyValue(doc, y, "Paciente", `${patient.full_name}${patient.weight ? ` · ${patient.weight} kg` : ""}`, { gap: 1 });
  y = writeKeyValue(doc, y, "Tratamento para", `${pd.pathology} (CID-10: ${pd.cid10})`, { gap: 4 });

  // ───────────────────────────────────────
  // 1. POR QUE ESTE PRODUTO FOI INDICADO
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Por que este produto foi indicado para você", { number: 1 });
  y = writeParagraph(doc, y, product.clinicalJustification, { gap: 2 });
  y = writeParagraph(doc, y, product.cannabinoidJustification, { gap: 4 });

  // ───────────────────────────────────────
  // 2. COMO TOMAR
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Como tomar o seu medicamento", { number: 2 });

  const steps: string[] = [
    "Agite levemente o frasco antes de cada uso.",
    "Pingue as gotas embaixo da língua.",
    "Mantenha as gotas embaixo da língua por 60 a 90 segundos, sem engolir.",
    "Depois desse tempo, engula normalmente.",
    `Tome sempre nos mesmos horários: ${cfg.time1} pela manhã e ${cfg.time2} à noite (intervalo de 12 horas entre as doses).`,
    "Para melhor absorção, tome junto com algum alimento gorduroso — por exemplo: azeite, abacate, castanhas ou amendoim.",
  ];
  steps.forEach((step, i) => {
    y = writeParagraph(doc, y, `${i + 1}. ${step}`, {
      x: M + 4, width: CW - 4, size: PDF_THEME.font.body, gap: 1.5,
    });
  });
  y += 2;

  // ───────────────────────────────────────
  // 3. CRONOGRAMA
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Seu cronograma de uso", { number: 3 });
  y = writeParagraph(doc, y,
    "O tratamento começa com uma dose pequena e aumenta aos poucos. Esse aumento gradual permite que seu corpo se acostume com o medicamento e ajuda a identificar a dose ideal para você, com menos efeitos indesejados.",
    { gap: 3 }
  );

  // Tabela do cronograma (mais legível, fonte maior)
  y = ensureSpace(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [["Semana", "Período", "Gotas por tomada", "Frequência", "Total no dia", "Status"]],
    body: guideScheduleSteps.map(s => [
      `${s.week}`,
      s.days,
      `${s.dropsPerDose} gotas`,
      "12 em 12h",
      `${Number(s.dropsPerDose) * 2} gotas`,
      s.status === "dose_maxima" ? "Dose final" : "Aumento gradual",
    ]),
    theme: "grid",
    headStyles: {
      fillColor: PDF_THEME.color.primary as unknown as [number, number, number],
      fontSize: 9,
      halign: "center",
      textColor: 255,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
      textColor: PDF_THEME.color.text as unknown as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 17, halign: "center" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 28, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 38, halign: "center" },
    },
    alternateRowStyles: { fillColor: [248, 249, 250] as unknown as [number, number, number] },
    margin: { left: M, right: M },
    tableWidth: "auto",
  });
  // @ts-expect-error jspdf-autotable adds lastAutoTable to doc instance
  y = doc.lastAutoTable.finalY + 5;

  if (finalGuideStep) {
    const maxDoseInfo = maxMgDay ? `, equivalente a aproximadamente ${maxMgDay.toFixed(0)} mg de CBD por dia` : "";
    y = drawCallout(doc, y,
      `Ao chegar na semana ${finalGuideStep.week}, você atinge a dose máxima recomendada para ${pd.pathology}${maxDoseInfo}. A partir daí, mantenha essa dose. Não aumente mais sem orientação do seu médico.`,
      { variant: "success", title: "Dose final do tratamento", size: PDF_THEME.font.bodySm, gap: 4 }
    );
  }

  // ───────────────────────────────────────
  // 4. SE A DOSE ESTIVER ALTA DEMAIS
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Se a dose estiver alta demais", { number: 4 });
  y = writeParagraph(doc, y, "Fique atento(a) a estes sinais:", { gap: 1 });

  const excessSigns = [
    "Tontura ou sensação de cabeça leve",
    "Sono excessivo ou cansaço fora do normal",
    "Boca muito seca",
    "Náusea ou enjoo",
    "Sensação de mal-estar ou desorientação",
  ];
  excessSigns.forEach(sign => {
    y = writeParagraph(doc, y, `• ${sign}`, {
      x: M + 4, width: CW - 4, size: PDF_THEME.font.body, gap: 0.8,
    });
  });
  y += 2;

  y = drawCallout(doc, y,
    "Esses sinais não são perigosos. Eles apenas indicam que a dose está um pouco acima do que o seu corpo tolera bem. Eles passam ao reduzir a dose.",
    { variant: "info", size: PDF_THEME.font.bodySm, gap: 3 }
  );

  y = writeParagraph(doc, y, "O que fazer se sentir esses sinais:", { bold: true, gap: 1 });
  const whatToDo = [
    `Volte à dose da semana anterior (uma dose menor).`,
    `Entre em contato com o consultório${doctor.phone ? ` pelo telefone ${doctor.phone}` : ""}.`,
    `Não volte a aumentar a dose sem orientação médica.`,
  ];
  whatToDo.forEach((step, i) => {
    y = writeParagraph(doc, y, `${i + 1}. ${step}`, {
      x: M + 4, width: CW - 4, size: PDF_THEME.font.body, gap: 1.5,
    });
  });
  y += 3;

  // ───────────────────────────────────────
  // 5. CUIDADOS IMPORTANTES
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Cuidados importantes durante o tratamento", { number: 5 });

  const careItems = [
    {
      title: "Não interrompa o tratamento de forma abrupta.",
      detail: "Se for necessário parar, faça uma redução gradual de cerca de 25% por semana, sempre com orientação médica.",
    },
    {
      title: "Avise todos os seus médicos sobre este medicamento.",
      detail: "O canabidiol pode interagir com outros remédios — especialmente anticoagulantes (que afinam o sangue), antiepilépticos e antidepressivos.",
    },
    {
      title: "Guarde o frasco em local fresco, seco e protegido da luz.",
      detail: "Evite expor o produto à luz solar direta ou a temperaturas elevadas. A luz e o calor podem reduzir a eficácia do medicamento.",
    },
    {
      title: "Mantenha fora do alcance de crianças e animais domésticos.",
    },
    {
      title: "Não consuma bebidas alcoólicas durante o tratamento.",
      detail: "O álcool pode potencializar efeitos indesejados, como sonolência e tontura.",
    },
    {
      title: "Confira o lote e o laudo de qualidade (COA) na embalagem.",
      detail: "O QR Code do frasco dá acesso ao certificado de análise do produto.",
    },
  ];
  careItems.forEach(item => {
    y = writeParagraph(doc, y, `• ${item.title}`, {
      x: M + 4, width: CW - 4, bold: true, size: PDF_THEME.font.body, gap: 0.5,
    });
    if (item.detail) {
      y = writeParagraph(doc, y, item.detail, {
        x: M + 8, width: CW - 8, size: PDF_THEME.font.bodySm, color: PDF_THEME.color.textMuted, gap: 1.5,
      });
    }
  });
  y += 2;

  // ───────────────────────────────────────
  // 6. RETORNO
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Retorno e acompanhamento", { number: 6 });

  const returnDateFormatted = cfg.returnDate
    ? new Date(cfg.returnDate + "T12:00:00").toLocaleDateString("pt-BR")
    : "a definir com o consultório";

  y = drawCallout(doc, y,
    `Sua próxima consulta: ${returnDateFormatted}`,
    { variant: "success", size: PDF_THEME.font.body, gap: 3 }
  );

  y = writeParagraph(doc, y, "Nessa consulta, o médico vai avaliar:", { gap: 1 });
  const evalItems = [
    "Como você está respondendo ao tratamento.",
    "Se a dose atual está adequada para o seu caso.",
    "Se é preciso aumentar, reduzir ou manter a dose.",
    "Se o produto continua sendo o mais indicado.",
  ];
  evalItems.forEach(item => {
    y = writeParagraph(doc, y, `• ${item}`, {
      x: M + 4, width: CW - 4, size: PDF_THEME.font.body, gap: 0.8,
    });
  });
  y += 2;

  y = writeParagraph(doc, y, "Para se preparar bem para a consulta, anote diariamente:", { bold: true, gap: 1 });
  const trackItems = [
    "A dose que você está tomando.",
    "Sua dor ou seus sintomas em uma escala de 0 (nenhum) a 10 (insuportável).",
    "Como está sendo a qualidade do sono.",
    "Qualquer efeito que você tenha sentido — bom ou ruim.",
  ];
  trackItems.forEach(item => {
    y = writeParagraph(doc, y, `• ${item}`, {
      x: M + 4, width: CW - 4, size: PDF_THEME.font.body, gap: 0.8,
    });
  });
  y += 3;

  if (doctor.phone) {
    y = drawCallout(doc, y,
      `Para dúvidas ou efeitos adversos antes do retorno, ligue para o consultório: ${doctor.phone}`,
      { variant: "info", size: PDF_THEME.font.bodySm, gap: 4 }
    );
  }

  // ───────────────────────────────────────
  // 7. TCLE
  // ───────────────────────────────────────
  y = drawSectionHeader(doc, y, "Termo de Consentimento Livre e Esclarecido", { number: 7 });
  y = writeParagraph(doc, y,
    `Eu, ${patient.full_name}, declaro ter sido informado(a) pelo(a) médico(a) Dr(a). ${doctor.full_name} sobre os possíveis benefícios e riscos do tratamento com ${pd.productFullLabel}.`,
    { size: PDF_THEME.font.bodySm, gap: 2 }
  );
  y = writeParagraph(doc, y,
    "Estou ciente de que o medicamento pode causar efeitos como tontura, sonolência, boca seca, alterações no apetite e que pode interagir com outros remédios em uso.",
    { size: PDF_THEME.font.bodySm, gap: 2 }
  );
  y = writeParagraph(doc, y,
    "Fui orientado(a) sobre o ajuste gradual da dose e sei que devo entrar em contato com o consultório caso sinta efeitos adversos, ou ao final de 30 dias para a continuidade do tratamento.",
    { size: PDF_THEME.font.bodySm, gap: 2 }
  );
  y = writeParagraph(doc, y,
    "Declaro ciência de que o produto não é isento de riscos e não substitui outros tratamentos já prescritos.",
    { size: PDF_THEME.font.bodySm, gap: 2 }
  );
  y = writeParagraph(doc, y,
    "Autorizo o início do tratamento conforme a prescrição médica recebida.",
    { size: PDF_THEME.font.bodySm, gap: 4 }
  );

  // Linha de assinatura do paciente
  y = ensureSpace(doc, y, 25);
  y += 5;
  doc.setDrawColor(PDF_THEME.color.text[0], PDF_THEME.color.text[1], PDF_THEME.color.text[2]);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 90, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_THEME.font.bodySm);
  doc.setTextColor(PDF_THEME.color.text[0], PDF_THEME.color.text[1], PDF_THEME.color.text[2]);
  doc.text("Assinatura do paciente ou responsável legal", M, y);
  y += 5;
  doc.text(`Data: ___ / ___ / ______`, M, y);

  // ─── Rodapé padronizado ───
  drawPageFooter(doc, {
    text: "Guia de Uso · Greenlion",
    doctorName: doctor.full_name,
    doctorCrm: doctor.crm,
  });

  doc.save(`guia_paciente_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════
// RELATÓRIO MÉDICO CIRCUNSTANCIADO — Judicialização
//
// Gerado a partir das respostas da Anamnese Expandida.
// Atende:
//  • Tema 106 STJ (REsp 1.657.156/RJ): laudo fundamentado e circunstanciado
//  • Tema 1161 STF (RE 1.165.959): produto sem registro com importação ANVISA
// ═══════════════════════════════════════════════════════════════════

interface AnamneseAnswersForPdf {
  [key: string]: string;
}

/** Custom field added by the doctor (matches CustomAnamneseField in anamneseSchema). */
interface LegalReportCustomField {
  id: string;
  label: string;
  type: "text" | "textarea";
  value: string;
}

interface LegalReportParams {
  doctor: DoctorInfo;
  patient: PatientInfo;
  prescriptionData: PrescriptionInfo;
  product: Product;
  answers: AnamneseAnswersForPdf;
  /** Custom fields the doctor added on-the-fly during the anamnesis. */
  customFields?: LegalReportCustomField[];
  /** Patient's age computed at the time of report. */
  patientAge?: number | null;
}

export function generateLegalReportPDF({ doctor, patient, prescriptionData: pd, product, answers, customFields, patientAge }: LegalReportParams) {
  const doc = new jsPDF();
  const M = PDF_THEME.layout.marginX;
  const CW = contentWidth(doc);

  // ─── Cabeçalho ───
  let y = drawPageHeader(doc, {
    documentTitle: "Relatório Médico Circunstanciado",
    documentSubtitle: "Pleito de fornecimento de medicamento — Tema 106 STJ · Tema 1161 STF",
    doctor,
  });

  // ─── Identificação do médico ───
  y = drawSectionHeader(doc, y, "Identificação do médico assistente");
  y = writeKeyValue(doc, y, "Médico(a)", `Dr(a). ${doctor.full_name}`, { gap: 1 });
  y = writeKeyValue(doc, y, "Especialidade", doctor.specialty, { gap: 1 });
  y = writeKeyValue(doc, y, "Registro profissional", `CRM ${doctor.crm}`, { gap: 1 });
  if (doctor.address) y = writeKeyValue(doc, y, "Endereço profissional", doctor.address, { gap: 1 });
  if (doctor.phone) y = writeKeyValue(doc, y, "Telefone", doctor.phone, { gap: 1 });
  if (doctor.email) y = writeKeyValue(doc, y, "E-mail", doctor.email, { gap: 1 });
  y += 2;

  // ─── Identificação do paciente ───
  y = drawSectionHeader(doc, y, "Identificação do paciente");
  y = writeKeyValue(doc, y, "Nome", patient.full_name, { gap: 1 });
  const idLine = [`CPF: ${patient.cpf}`, patient.rg ? `RG: ${patient.rg}` : null].filter(Boolean).join("  ·  ");
  y = writeParagraph(doc, y, idLine, { gap: 1 });
  if (patient.birth_date) {
    const dob = new Date(patient.birth_date).toLocaleDateString("pt-BR");
    const ageStr = patientAge != null ? ` (${patientAge} anos)` : "";
    y = writeKeyValue(doc, y, "Data de nascimento", `${dob}${ageStr}`, { gap: 1 });
  }
  if (patient.weight) y = writeKeyValue(doc, y, "Peso", `${patient.weight} kg`, { gap: 1 });
  if (patient.address) y = writeKeyValue(doc, y, "Endereço", patient.address, { gap: 1 });
  y += 2;

  // ─── 1. História da Doença Atual ───
  if (answers.inicio_sintomas || answers.evolucao || answers.sintomas_atuais || answers.impacto_funcional || answers.exames_realizados) {
    y = drawSectionHeader(doc, y, "História da doença atual", { number: 1 });
    if (answers.inicio_sintomas) y = writeKeyValue(doc, y, "Início dos sintomas", answers.inicio_sintomas, { gap: 2 });
    if (answers.evolucao) {
      y = writeParagraph(doc, y, "Evolução clínica:", { bold: true, gap: 1 });
      y = writeParagraph(doc, y, answers.evolucao, { gap: 2 });
    }
    if (answers.sintomas_atuais) {
      y = writeParagraph(doc, y, "Sintomas atuais:", { bold: true, gap: 1 });
      y = writeParagraph(doc, y, answers.sintomas_atuais, { gap: 2 });
    }
    if (answers.impacto_funcional) {
      y = writeParagraph(doc, y, "Impacto funcional na vida do paciente:", { bold: true, gap: 1 });
      y = writeParagraph(doc, y, answers.impacto_funcional, { gap: 2 });
    }
    if (answers.exames_realizados) {
      y = writeParagraph(doc, y, "Exames complementares realizados:", { bold: true, gap: 1 });
      y = writeParagraph(doc, y, answers.exames_realizados, { gap: 2 });
    }
  }

  // ─── 2. Antecedentes e Comorbidades ───
  if (answers.comorbidades || answers.alergias || answers.antecedentes_familiares || answers.internacoes) {
    y = drawSectionHeader(doc, y, "Antecedentes e comorbidades", { number: 2 });
    if (answers.comorbidades) y = writeKeyValue(doc, y, "Comorbidades", answers.comorbidades, { gap: 2 });
    if (answers.alergias) y = writeKeyValue(doc, y, "Alergias medicamentosas", answers.alergias, { gap: 2 });
    if (answers.antecedentes_familiares) y = writeKeyValue(doc, y, "Antecedentes familiares", answers.antecedentes_familiares, { gap: 2 });
    if (answers.internacoes) y = writeKeyValue(doc, y, "Internações e cirurgias prévias", answers.internacoes, { gap: 2 });
  }

  // ─── 3. Diagnóstico ───
  y = drawSectionHeader(doc, y, "Diagnóstico", { number: 3 });
  y = writeParagraph(doc, y, pd.pathology, { bold: true, gap: 1 });
  y = writeKeyValue(doc, y, "CID-10", pd.cid10, { gap: 2 });

  // ─── 4. Tratamentos prévios — CRÍTICO ───
  y = drawSectionHeader(doc, y, "Tratamentos prévios e ineficácia das alternativas do SUS", { number: 4 });
  y = drawCallout(doc, y,
    "Esta seção atende ao requisito (i) do Tema 106 do STJ: comprovação, por meio de laudo médico fundamentado e circunstanciado, da imprescindibilidade do medicamento e da ineficácia, para o tratamento da moléstia, dos fármacos fornecidos pelo SUS.",
    { variant: "legal", title: "Fundamentação legal", size: PDF_THEME.font.bodySm, gap: 4 }
  );

  if (answers.tratamentos_lista) {
    y = writeParagraph(doc, y, "Histórico de medicamentos e terapias utilizadas:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.tratamentos_lista, { gap: 3 });
  }
  if (answers.tentativas_sus) {
    const text = answers.tentativas_sus === "sim"
      ? "O paciente tentou as alternativas terapêuticas oferecidas pelo SUS e pelo RENAME para esta condição."
      : "As alternativas terapêuticas oferecidas pelo SUS e pelo RENAME não foram adequadas ou aplicáveis a este paciente.";
    y = writeParagraph(doc, y, text, { gap: 2 });
  }
  if (answers.ineficacia_sus_justificativa) {
    y = writeParagraph(doc, y, "Justificativa da ineficácia dos fármacos do SUS para este paciente:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.ineficacia_sus_justificativa, { gap: 3 });
  }
  if (answers.efeitos_adversos_previos) {
    y = writeKeyValue(doc, y, "Efeitos adversos significativos com tratamentos anteriores", answers.efeitos_adversos_previos, { gap: 2 });
  }

  // ─── 5. Justificativa Clínica do Canabidiol ───
  y = drawSectionHeader(doc, y, "Justificativa clínica para o tratamento com canabidiol", { number: 5 });
  if (answers.fundamento_indicacao) {
    y = writeParagraph(doc, y, "Fundamento clínico da indicação:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.fundamento_indicacao, { gap: 2 });
  }
  if (answers.expectativa_resposta) {
    y = writeParagraph(doc, y, "Expectativa de resposta terapêutica:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.expectativa_resposta, { gap: 2 });
  }
  if (answers.produto_escolhido_justificativa) {
    y = writeParagraph(doc, y, "Justificativa da escolha deste produto específico:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.produto_escolhido_justificativa, { gap: 2 });
  }

  // ─── 6. Produto Prescrito ───
  y = drawSectionHeader(doc, y, "Produto prescrito", { number: 6 });
  y = writeParagraph(doc, y, pd.productFullLabel, { bold: true, gap: 1 });
  y = writeParagraph(doc, y, pd.productComposition, { gap: 2 });

  // ─── 7. Protocolo Terapêutico ───
  y = drawSectionHeader(doc, y, "Protocolo terapêutico proposto", { number: 7 });
  const dropsPerDose = pd.config.maintenanceDrops || pd.titulationSteps[pd.titulationSteps.length - 1]?.dropsPerDose || 0;
  const mgCbdPerDay = +(dropsPerDose * pd.mgCbdPerDrop * 2).toFixed(1);
  const mgCanPerDay = +(dropsPerDose * pd.mgPerDrop * 2).toFixed(1);

  y = writeKeyValue(doc, y, "Posologia",
    `${dropsPerDose} gota(s) por tomada, ${pd.config.via || "via sublingual"}, a cada 12 horas (${pd.config.time1 || "08:00"} e ${pd.config.time2 || "20:00"}).`,
    { gap: 1 }
  );
  y = writeKeyValue(doc, y, "Dose diária total",
    `${mgCanPerDay} mg de canabinoides totais (sendo ${mgCbdPerDay} mg de CBD).`,
    { gap: 1 }
  );
  if (pd.patientWeight) {
    const mgKgDay = +(mgCbdPerDay / pd.patientWeight).toFixed(2);
    y = writeKeyValue(doc, y, "Dose por peso corporal", `${mgKgDay} mg de CBD por kg, por dia.`, { gap: 1 });
  }
  if (answers.duracao_tratamento) {
    y = writeKeyValue(doc, y, "Duração estimada do tratamento", answers.duracao_tratamento, { gap: 1 });
  }
  if (answers.monitoramento) {
    y = writeParagraph(doc, y, "Plano de monitoramento e acompanhamento:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.monitoramento, { gap: 2 });
  }
  y = drawCallout(doc, y,
    `Quantidade prescrita: ${pd.bottles} frasco(s) por mês. Receita emitida com validade de 1 (um) ano para garantir a continuidade do tratamento durante eventuais entraves no fornecimento judicial.`,
    { variant: "legal", title: "Quantidade e validade da prescrição", size: PDF_THEME.font.bodySm, gap: 4 }
  );

  // ─── 8. Riscos da Interrupção ───
  if (answers.riscos_interrupcao || answers.urgencia === "sim" || answers.urgencia_motivo) {
    y = drawSectionHeader(doc, y, "Riscos da interrupção do tratamento (periculum in mora)", { number: 8 });
    y = drawCallout(doc, y,
      "Esta seção fundamenta o pedido de tutela de urgência (liminar) ao demonstrar o risco concreto à saúde do paciente em caso de interrupção ou postergação do tratamento.",
      { variant: "legal", title: "Fundamentação para tutela de urgência", size: PDF_THEME.font.bodySm, gap: 4 }
    );
    if (answers.riscos_interrupcao) {
      y = writeParagraph(doc, y, answers.riscos_interrupcao, { gap: 2 });
    }
    if (answers.urgencia === "sim") {
      y = writeParagraph(doc, y,
        "Há urgência clínica reconhecida pelo médico assistente para o início ou a continuidade imediata do tratamento.",
        { bold: true, gap: 2 }
      );
    }
    if (answers.urgencia_motivo) {
      y = writeKeyValue(doc, y, "Justificativa específica da urgência", answers.urgencia_motivo, { gap: 2 });
    }
  }

  // ─── 9. Hipossuficiência ───
  if (answers.custo_mensal_estimado || answers.hipossuficiencia_observacao) {
    y = drawSectionHeader(doc, y, "Custo do tratamento e capacidade financeira", { number: 9 });
    y = drawCallout(doc, y,
      "A comprovação documental da hipossuficiência financeira é responsabilidade do advogado (declaração de rendimentos, IR, comprovantes de despesas). As informações abaixo são prestadas pelo conhecimento clínico do médico assistente.",
      { variant: "info", size: PDF_THEME.font.bodySm, gap: 4 }
    );
    if (answers.custo_mensal_estimado) {
      y = writeKeyValue(doc, y, "Custo mensal estimado do tratamento", answers.custo_mensal_estimado, { gap: 2 });
    }
    if (answers.hipossuficiencia_observacao) {
      y = writeParagraph(doc, y, answers.hipossuficiencia_observacao, { gap: 2 });
    }
  }

  // ─── 10. Fundamentação Regulatória ───
  y = drawSectionHeader(doc, y, "Fundamentação regulatória", { number: 10 });
  y = drawCallout(doc, y,
    "Esta seção atende ao requisito (iii) do Tema 106 do STJ, na forma do Tema 1161 do STF: o medicamento, embora sem registro em listas de dispensação do SUS, possui importação autorizada pela ANVISA por pessoa física para uso próprio mediante prescrição médica.",
    { variant: "legal", title: "Tema 106 STJ · Tema 1161 STF", size: PDF_THEME.font.bodySm, gap: 4 }
  );
  y = writeParagraph(doc, y,
    "O produto prescrito é regularmente importado por pessoa física para uso próprio, sob prescrição médica, conforme regulamentação da ANVISA. A regulamentação vigente permite a importação para fins terapêuticos com a devida autorização sanitária individual.",
    { gap: 2 }
  );
  if (answers.anvisa_autorizacao === "sim") {
    y = writeParagraph(doc, y, "O paciente já possui autorização de importação ANVISA vigente.", { gap: 2 });
  } else if (answers.anvisa_autorizacao === "solicitando") {
    y = writeParagraph(doc, y, "A autorização de importação ANVISA está em processo de solicitação.", { gap: 2 });
  } else if (answers.anvisa_autorizacao === "nao") {
    y = writeParagraph(doc, y, "A autorização de importação ANVISA será solicitada após a confirmação do tratamento.", { gap: 2 });
  }
  if (answers.anvisa_processo) {
    y = writeKeyValue(doc, y, "Número do processo ANVISA", answers.anvisa_processo, { gap: 2 });
  }

  // ─── 11. Informações Adicionais (campos personalizados do médico) ───
  const filledCustomFields = (customFields || []).filter((f) => f.value && f.value.trim());
  let conclusionNumber = 11;
  if (filledCustomFields.length > 0) {
    y = drawSectionHeader(doc, y, "Informações adicionais relatadas pelo médico assistente", { number: 11 });
    y = drawCallout(doc, y,
      "Os itens abaixo foram acrescentados pelo médico assistente para detalhar aspectos do caso que não estão cobertos pelas seções anteriores.",
      { variant: "info", size: PDF_THEME.font.bodySm, gap: 4 }
    );
    filledCustomFields.forEach((field) => {
      const labelClean = field.label.replace(/[:?]+\s*$/, "");
      y = writeKeyValue(doc, y, labelClean, field.value, { gap: 2 });
    });
    conclusionNumber = 12;
  }

  // ─── Conclusão ───
  y = drawSectionHeader(doc, y, "Conclusão e declaração de imprescindibilidade", { number: conclusionNumber });
  if (answers.conclusao_texto) {
    y = writeParagraph(doc, y, answers.conclusao_texto, { gap: 2 });
  } else {
    y = writeParagraph(doc, y,
      `Pelo exposto, ATESTO que o tratamento com ${pd.productFullLabel} é IMPRESCINDÍVEL para o paciente acima identificado, considerando o quadro clínico apresentado, a falha das alternativas terapêuticas disponíveis no SUS e o perfil de segurança e eficácia do canabidiol nas condições deste paciente. A interrupção ou ausência de acesso ao tratamento implicará prejuízo grave e potencialmente irreversível à sua saúde, conforme detalhado nas seções anteriores.`,
      { gap: 2 }
    );
  }
  if (answers.observacoes_finais) {
    y = writeParagraph(doc, y, "Observações adicionais:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.observacoes_finais, { gap: 2 });
  }

  // ─── Assinatura ───
  y = writeParagraph(doc, y,
    `Local e data: _______________________________________________, ${new Date().toLocaleDateString("pt-BR")}`,
    { size: PDF_THEME.font.bodySm, color: PDF_THEME.color.textMuted, gap: 4 }
  );
  y = drawSignatureBlock(doc, y, { doctor, align: "center" });

  // ─── Rodapé padronizado ───
  drawPageFooter(doc, {
    text: `Relatório Médico · ${patient.full_name}`,
    doctorName: doctor.full_name,
    doctorCrm: doctor.crm,
  });

  doc.save(`relatorio_medico_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

