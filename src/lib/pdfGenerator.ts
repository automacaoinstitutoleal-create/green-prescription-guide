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
import { formatDateBR } from "./utils";

// Re-export tipos para compatibilidade (mantém imports externos funcionando)
type DoctorInfo = ThemeDoctorInfo;
type PatientInfo = ThemePatientInfo;

interface PrescriptionInfo {
  pathology: string;
  cid10: string;
  /** Lista completa de patologias (comorbidades), quando houver mais de uma */
  pathologies?: { name: string; cid10: string }[];
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
  // Resolve todas as patologias (comorbidades). Fallback: nome único.
  const names = pd.pathologies?.length ? pd.pathologies.map((p) => p.name) : [pd.pathology];
  const resolved = names
    .map((n) => PATHOLOGIES.find((item) => item.name === n))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const weightKg = pd.patientWeight ?? 0;
  // Patologia mais exigente (maior dose máxima) governa o esquema
  const pathology = resolved.length
    ? resolved.reduce((acc, cur) =>
        getDoseRange(cur, weightKg).max > getDoseRange(acc, weightKg).max ? cur : acc
      )
    : undefined;

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
    const dob = formatDateBR(patient.birth_date);
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
      "Validade da prescrição: 1 (um) ano a partir da data de emissão. Validade estendida para tratamento contínuo.",
      { variant: "info", title: "Validade da prescrição", size: PDF_THEME.font.bodySm, gap: 4 }
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
// RELATÓRIO MÉDICO DETALHADO
//
// Documento médico fundamentado, gerado a partir da anamnese clínica
// detalhada. Sem termos jurídicos: a fundamentação processual é
// responsabilidade do advogado, em outro documento.
//
// Adaptações conforme cobertura do paciente:
//   • SUS: relata o esgotamento das alternativas disponíveis no sistema público
//   • Plano/Particular: relata o esgotamento das alternativas terapêuticas
//     convencionais sem mencionar SUS
// ═══════════════════════════════════════════════════════════════════

interface AnamneseAnswersForPdf {
  [key: string]: string;
}

interface LegalReportCustomField {
  id: string;
  label: string;
  type: "text" | "textarea";
  value: string;
}

/** Dados do responsável legal — incluídos apenas quando paciente é menor. */
interface LegalGuardianInfo {
  name: string;
  cpf: string;
  rg?: string | null;
  relationship: string;
  phone?: string | null;
}

interface LegalReportParams {
  doctor: DoctorInfo;
  patient: PatientInfo;
  prescriptionData: PrescriptionInfo;
  product: Product;
  answers: AnamneseAnswersForPdf;
  customFields?: LegalReportCustomField[];
  patientAge?: number | null;
  /** Cobertura de saúde — afeta a redação. */
  healthcareCoverage?: "SUS" | "PLANO" | "PARTICULAR";
  /** Dados do responsável legal — usado quando paciente é menor. */
  legalGuardian?: LegalGuardianInfo | null;
}

export function generateLegalReportPDF({
  doctor, patient, prescriptionData: pd, product, answers, customFields,
  patientAge, healthcareCoverage = "PARTICULAR", legalGuardian,
}: LegalReportParams) {
  const doc = new jsPDF();
  const isSUS = healthcareCoverage === "SUS";
  const isMinorWithGuardian = legalGuardian && patientAge != null && patientAge < 18;

  // ─── Cabeçalho ───
  let y = drawPageHeader(doc, {
    documentTitle: "Relatório Médico Detalhado",
    documentSubtitle: "Documento clínico fundamentado",
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
    const dob = formatDateBR(patient.birth_date);
    const ageStr = patientAge != null ? ` (${patientAge} anos)` : "";
    y = writeKeyValue(doc, y, "Data de nascimento", `${dob}${ageStr}`, { gap: 1 });
  }
  if (patient.weight) y = writeKeyValue(doc, y, "Peso", `${patient.weight} kg`, { gap: 1 });
  if (patient.address) y = writeKeyValue(doc, y, "Endereço", patient.address, { gap: 1 });
  y += 2;

  // ─── Responsável legal (apenas se menor de idade) ───
  if (isMinorWithGuardian && legalGuardian) {
    y = drawSectionHeader(doc, y, "Responsável legal");
    y = writeKeyValue(doc, y, "Nome", legalGuardian.name, { gap: 1 });
    const guardianId = [`CPF: ${legalGuardian.cpf}`, legalGuardian.rg ? `RG: ${legalGuardian.rg}` : null].filter(Boolean).join("  ·  ");
    y = writeParagraph(doc, y, guardianId, { gap: 1 });
    y = writeKeyValue(doc, y, "Vínculo com o paciente", legalGuardian.relationship, { gap: 1 });
    if (legalGuardian.phone) y = writeKeyValue(doc, y, "Telefone", legalGuardian.phone, { gap: 1 });
    y += 2;
  }

  // ─── 1. História da doença atual ───
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

  // ─── 4. Tratamentos prévios ───
  // Título e texto se ajustam ao perfil de cobertura.
  const treatmentSectionTitle = isSUS
    ? "Tratamentos prévios e esgotamento das alternativas disponíveis"
    : "Tratamentos prévios tentados";
  y = drawSectionHeader(doc, y, treatmentSectionTitle, { number: 4 });

  if (answers.tratamentos_lista) {
    y = writeParagraph(doc, y, "Histórico de medicamentos e terapias utilizadas:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.tratamentos_lista, { gap: 3 });
  }
  if (answers.ineficacia_justificativa) {
    y = writeParagraph(doc, y, "Justificativa clínica da inadequação dos tratamentos prévios:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.ineficacia_justificativa, { gap: 3 });
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
    y = writeParagraph(doc, y, "Justificativa da escolha do produto:", { bold: true, gap: 1 });
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
  y = writeKeyValue(doc, y, "Quantidade prescrita por mês", `${pd.bottles} frasco(s) de 30 mL`, { gap: 2 });

  // ─── 8. Riscos clínicos da interrupção ───
  if (answers.riscos_interrupcao || answers.urgencia === "sim" || answers.urgencia_motivo) {
    y = drawSectionHeader(doc, y, "Riscos clínicos da interrupção do tratamento", { number: 8 });
    if (answers.riscos_interrupcao) {
      y = writeParagraph(doc, y, answers.riscos_interrupcao, { gap: 2 });
    }
    if (answers.urgencia === "sim") {
      y = writeParagraph(doc, y,
        "Há urgência clínica reconhecida pelo médico assistente para o início ou continuidade imediata do tratamento.",
        { bold: true, gap: 2 }
      );
    }
    if (answers.urgencia_motivo) {
      y = writeKeyValue(doc, y, "Motivo clínico da urgência", answers.urgencia_motivo, { gap: 2 });
    }
  }

  // ─── 9. Custo do tratamento ───
  if (answers.custo_mensal_estimado) {
    y = drawSectionHeader(doc, y, "Custo do tratamento", { number: 9 });
    y = writeKeyValue(doc, y, "Custo mensal estimado", answers.custo_mensal_estimado, { gap: 2 });
  }

  // ─── 10. Informações Adicionais (campos custom) ───
  const filledCustomFields = (customFields || []).filter((f) => f.value && f.value.trim());
  let conclusionNumber = 10;
  if (filledCustomFields.length > 0) {
    y = drawSectionHeader(doc, y, "Informações adicionais relatadas pelo médico assistente", { number: 10 });
    filledCustomFields.forEach((field) => {
      const labelClean = field.label.replace(/[:?]+\s*$/, "");
      y = writeKeyValue(doc, y, labelClean, field.value, { gap: 2 });
    });
    conclusionNumber = 11;
  }

  // ─── Conclusão clínica ───
  y = drawSectionHeader(doc, y, "Conclusão clínica", { number: conclusionNumber });

  // Parágrafo-padrão com as palavras-chave jurídico-clínicas exigidas
  // para maximizar a possibilidade de ganho do paciente ao tratamento.
  const keywordText = isSUS
    ? `Considerando o quadro clínico apresentado, o esgotamento das alternativas terapêuticas disponíveis no sistema público de saúde e o perfil de segurança e eficácia do canabidiol, o tratamento com ${pd.productFullLabel} é IMPRESCINDÍVEL para este paciente. Trata-se de conduta SEGURA e EFICAZ, FUNDAMENTADA EM EVIDÊNCIAS CIENTÍFICAS ROBUSTAS, e consiste na ÚLTIMA TERAPÊUTICA APLICÁVEL diante da ineficácia das opções prévias. O início e a continuidade do tratamento são URGENTES, sob risco de agravamento clínico irreversível e comprometimento da capacidade funcional e da qualidade de vida do paciente.`
    : `Considerando o quadro clínico apresentado, os resultados insatisfatórios das alternativas terapêuticas previamente tentadas e o perfil de segurança e eficácia do canabidiol, o tratamento com ${pd.productFullLabel} é IMPRESCINDÍVEL para este paciente. Trata-se de conduta SEGURA e EFICAZ, FUNDAMENTADA EM EVIDÊNCIAS CIENTÍFICAS ROBUSTAS, e consiste na ÚLTIMA TERAPÊUTICA APLICÁVEL diante da ineficácia das opções prévias. O início e a continuidade do tratamento são URGENTES, sob risco de agravamento clínico irreversível e comprometimento da capacidade funcional e da qualidade de vida do paciente.`;
  y = writeParagraph(doc, y, keywordText, { bold: true, gap: 2 });

  if (answers.conclusao_texto) {
    y = writeParagraph(doc, y, "Considerações complementares do médico assistente:", { bold: true, gap: 1 });
    y = writeParagraph(doc, y, answers.conclusao_texto, { gap: 2 });
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
    text: `Relatório Médico Detalhado · ${patient.full_name}`,
    doctorName: doctor.full_name,
    doctorCrm: doctor.crm,
  });

  doc.save(`relatorio_medico_${patient.full_name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

