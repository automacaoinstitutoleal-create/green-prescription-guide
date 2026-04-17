// ── Pathologies with CID-10, dose type, dose ranges, recommended product ──

export interface PathologyInfo {
  name: string;
  cid10: string;
  doseType: "fixo" | "mg_kg";
  doseStart: number;
  doseTarget: number;
  doseMax: number;
  recommendedProduct: string;
}

const PATHOLOGIES_UNSORTED: PathologyInfo[] = [
  { name: "Ansiedade / TEPT", cid10: "F41.1", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 600, recommendedProduct: "HARMONY" },
  { name: "Câncer / Cuidados paliativos", cid10: "C80", doseType: "fixo", doseStart: 25, doseTarget: 200, doseMax: 600, recommendedProduct: "RELIEF" },
  { name: "Autismo (TEA)", cid10: "F84.0", doseType: "mg_kg", doseStart: 1, doseTarget: 5, doseMax: 10, recommendedProduct: "HARMONY" },
  { name: "Doença de Alzheimer", cid10: "G30", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 300, recommendedProduct: "HARMONY" },
  { name: "Doença de Parkinson", cid10: "G20", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 300, recommendedProduct: "HARMONY" },
  { name: "Dor crônica", cid10: "R52", doseType: "fixo", doseStart: 20, doseTarget: 80, doseMax: 300, recommendedProduct: "RELIEF" },
  { name: "Enxaqueca crônica", cid10: "G43", doseType: "fixo", doseStart: 20, doseTarget: 100, doseMax: 200, recommendedProduct: "RELIEF" },
  { name: "Epilepsia", cid10: "G40.9", doseType: "mg_kg", doseStart: 2.5, doseTarget: 10, doseMax: 20, recommendedProduct: "HARMONY" },
  { name: "Esclerose múltipla", cid10: "G35", doseType: "fixo", doseStart: 20, doseTarget: 100, doseMax: 300, recommendedProduct: "RELIEF" },
  { name: "Fibromialgia", cid10: "M79.7", doseType: "fixo", doseStart: 20, doseTarget: 80, doseMax: 200, recommendedProduct: "RELIEF" },
  { name: "Insônia", cid10: "G47.0", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 300, recommendedProduct: "BALANCE" },
  { name: "TDAH", cid10: "F90.0", doseType: "fixo", doseStart: 25, doseTarget: 100, doseMax: 200, recommendedProduct: "HARMONY" },
  { name: "TOC (Transtorno Obsessivo Compulsivo)", cid10: "F42", doseType: "fixo", doseStart: 50, doseTarget: 200, doseMax: 600, recommendedProduct: "HARMONY" },
  { name: "Transtorno bipolar", cid10: "F31", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 300, recommendedProduct: "HARMONY" },
  { name: "Transtorno do pânico", cid10: "F41.0", doseType: "fixo", doseStart: 25, doseTarget: 150, doseMax: 300, recommendedProduct: "HARMONY" },
  { name: "Transtornos psicóticos", cid10: "F29", doseType: "fixo", doseStart: 50, doseTarget: 200, doseMax: 600, recommendedProduct: "HARMONY" },
];

// Ordenação alfabética automática (ignora acentos)
export const PATHOLOGIES: PathologyInfo[] = PATHOLOGIES_UNSORTED.sort((a, b) =>
  a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
);

// ── Products with full cannabinoid composition ──

export interface CannabinoidRow {
  name: string;
  pct: number;
  mg30ml: number;
  mgMl: number;
  mgDrop: number;
  effect: string;
}

export type ProductLine = "PRECISION" | "LINE_6000";

export interface Product {
  name: string;
  type: string; // "A", "B" or "C"
  typeLabel: string;
  totalMg: number;
  mlPerBottle: number;
  mgMl: number;
  dropsPerMl: number;
  dropsPerBottle: number;
  cbdPct: number;
  cbdMg: number;
  description: string;
  fullLabel: string;
  compositionLabel: string;
  receituarioType: string;
  clinicalJustification: string;
  cannabinoidJustification: string;
  cannabinoids: CannabinoidRow[];
  /** Group used in product selection step */
  productLine: ProductLine;
  /** For LINE_6000: which Precision product this is a second-choice alternative for. */
  secondChoiceFor?: string; // "HARMONY" | "RELIEF" etc.
  /** Restricts product visibility to specific pathologies (by exact name). When set, product is ONLY shown for these pathologies. */
  restrictToPathologies?: string[];
  /** Whether to show a red Type A warning banner (controlled substance — palliative care only). */
  requiresTypeAWarning?: boolean;
}

function makeCanRow(name: string, pct: number, totalMg: number, effect: string): CannabinoidRow {
  const mg30ml = Math.round(totalMg * pct);
  return { name, pct: pct * 100, mg30ml, mgMl: +(mg30ml / 30).toFixed(1), mgDrop: +(mg30ml / 600).toFixed(2), effect };
}

export const PRODUCTS: Product[] = [
  {
    name: "HARMONY",
    type: "C",
    typeLabel: "Tipo C (sem THC)",
    totalMg: 7237,
    mlPerBottle: 30,
    mgMl: 241,
    dropsPerMl: 20,
    dropsPerBottle: 600,
    cbdPct: 0.65,
    cbdMg: 4704,
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
    fullLabel: "GREENLION HARMONY 7237MG — Óleo de canabinoides de amplo espectro",
    compositionLabel: "Concentração: 7237mg / 30ml (241mg/mL) — Sem THC\nComposição: CBD 65% (4704mg) · CBG-A 10% · CBD-A 10% · CBN 4% · CBC 4% · CBDV 5% · Terpenos 2%",
    receituarioType: "Receituário tipo C — Controle especial",
    clinicalJustification: "Formulação livre de THC, indicada para pacientes que necessitam de efeito ansiolítico e neuroprotetor sem componentes psicoativos.",
    cannabinoidJustification: "Alto teor de CBD (65%) com CBG-A e CBD-A como precursores que potencializam o efeito entourage. CBN auxilia no sono e CBC contribui com efeito anti-inflamatório.",
    cannabinoids: [
      makeCanRow("CBD", 0.65, 7237, "Ansiolítico, anticonvulsivante, neuroprotetor"),
      makeCanRow("CBG-A", 0.10, 7237, "Anti-inflamatório, neuroprotetor"),
      makeCanRow("CBD-A", 0.10, 7237, "Antiemético, anti-inflamatório"),
      makeCanRow("CBN", 0.04, 7237, "Sedativo, auxílio no sono"),
      makeCanRow("CBC", 0.04, 7237, "Anti-inflamatório, antidepressivo"),
      makeCanRow("CBDV", 0.05, 7237, "Antiemético, auxílio em epilepsia"),
      makeCanRow("Terpenos", 0.02, 7237, "Linalol, pineno, nerolidol — efeito entourage"),
    ],
    productLine: "PRECISION",
  },
  {
    name: "BALANCE",
    type: "B",
    typeLabel: "Tipo B (Δ8-THC ≤0,2%)",
    totalMg: 7237,
    mlPerBottle: 30,
    mgMl: 241,
    dropsPerMl: 20,
    dropsPerBottle: 600,
    cbdPct: 0.60,
    cbdMg: 4342,
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
    fullLabel: "GREENLION BALANCE 7237MG — Óleo de canabinoides de amplo espectro",
    compositionLabel: "Concentração: 7237mg / 30ml (241mg/mL) — Δ8-THC ≤ 0,2%\nComposição: CBD 60% (4342mg) · CBG-A 10% · CBN 6% · CBC-A 9% · CBDV 5% · Terpenos 9,7%",
    receituarioType: "Receituário tipo B — Controle especial",
    clinicalJustification: "Formulação balanceada com traços de Δ8-THC, indicada para insônia, doenças autoimunes e condições onde o efeito entourage completo é desejável.",
    cannabinoidJustification: "CBD 60% como base com micro-doses de Δ8-THC (0,2%) que potencializam o efeito analgésico sem psicoatividade significativa. Alto teor de terpenos (9,7%) maximiza o efeito entourage.",
    cannabinoids: [
      makeCanRow("CBD", 0.60, 7237, "Ansiolítico, anti-inflamatório"),
      makeCanRow("Δ8-THC", 0.002, 7237, "Analgésico leve, antiemético"),
      makeCanRow("THCV", 0.001, 7237, "Modulador metabólico"),
      makeCanRow("CBN", 0.06, 7237, "Sedativo, auxílio no sono"),
      makeCanRow("CBC-A", 0.09, 7237, "Anti-inflamatório"),
      makeCanRow("CBG-A", 0.10, 7237, "Neuroprotetor, antibacteriano"),
      makeCanRow("CBDV", 0.05, 7237, "Antiemético"),
      makeCanRow("Terpenos", 0.097, 7237, "Mirceno, limoneno, eucaliptol — efeito entourage"),
    ],
    productLine: "PRECISION",
  },
  {
    name: "RELIEF",
    type: "B",
    typeLabel: "Tipo B (Δ9-THC ≤0,2%)",
    totalMg: 7237,
    mlPerBottle: 30,
    mgMl: 241,
    dropsPerMl: 20,
    dropsPerBottle: 600,
    cbdPct: 0.58,
    cbdMg: 4198,
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
    fullLabel: "GREENLION RELIEF 7237MG — Óleo de canabinoides de amplo espectro",
    compositionLabel: "Concentração: 7237mg / 30ml (241mg/mL) — Δ9-THC ≤ 0,2%\nComposição: CBD 58% (4198mg) · CBG 10% · CBN 6% · CBC 8% · CBL 5% · Terpenos 12,7%",
    receituarioType: "Receituário tipo B — Controle especial",
    clinicalJustification: "Formulação para dor e inflamação com traços de Δ9-THC, indicada para dor crônica, fibromialgia, câncer e esclerose múltipla.",
    cannabinoidJustification: "CBD 58% combinado com micro-doses de Δ9-THC (0,2%) e alto teor de CBG (10%) e CBC (8%) para potente efeito anti-inflamatório e analgésico. Terpenos 12,7% maximizam a biodisponibilidade.",
    cannabinoids: [
      makeCanRow("CBD", 0.58, 7237, "Anti-inflamatório, analgésico"),
      makeCanRow("Δ9-THC", 0.002, 7237, "Analgésico, antiemético"),
      makeCanRow("THCA", 0.0005, 7237, "Anti-inflamatório"),
      makeCanRow("THCV", 0.0005, 7237, "Modulador metabólico"),
      makeCanRow("CBN", 0.06, 7237, "Sedativo, miorrelaxante"),
      makeCanRow("CBC", 0.08, 7237, "Anti-inflamatório, analgésico"),
      makeCanRow("CBG", 0.10, 7237, "Antibacteriano, neuroprotetor"),
      makeCanRow("CBL", 0.05, 7237, "Modulador imunológico"),
      makeCanRow("Terpenos", 0.127, 7237, "Mirceno, linalol — efeito entourage"),
    ],
    productLine: "PRECISION",
  },
  // ── LINHA 6000mg — Segunda opção / alternativa de entrada ──
  {
    name: "BROAD SPECTRUM 6000",
    type: "C",
    typeLabel: "Tipo C (sem THC)",
    totalMg: 6525,
    mlPerBottle: 30,
    mgMl: 200,
    dropsPerMl: 20,
    dropsPerBottle: 600,
    cbdPct: 0.972,
    cbdMg: 6346,
    description: "6525 mg/30 mL · 200 mg/mL · 20 gotas/mL · 10,0 mg can./gota",
    fullLabel: "GREENLION BROAD SPECTRUM 6000MG — Óleo de CBD amplo espectro",
    compositionLabel: "Concentração: 6525mg / 30ml (200mg/mL) — Sem THC\nComposição: CBD 97,2% (6346mg) · CBG 2,7% (179mg)",
    receituarioType: "Receituário tipo C — Controle especial",
    clinicalJustification: "CBD de alta pureza (97,2%) sem THC. Alternativa mais simples ao GREENLION HARMONY 7237MG, indicada quando a Linha Precision não estiver disponível ou como opção de entrada ao tratamento.",
    cannabinoidJustification: "Formulação concentrada em CBD isolado de alta pureza com pequena fração de CBG, ideal para pacientes que necessitam efeito ansiolítico e neuroprotetor sem complexidade de espectro completo.",
    cannabinoids: [
      { name: "CBD", pct: 97.2, mg30ml: 6346, mgMl: +(6346 / 30).toFixed(1), mgDrop: +(6346 / 600).toFixed(2), effect: "Ansiolítico, anticonvulsivante, neuroprotetor" },
      { name: "CBG", pct: 2.7, mg30ml: 179, mgMl: +(179 / 30).toFixed(1), mgDrop: +(179 / 600).toFixed(2), effect: "Antibacteriano, neuroprotetor" },
    ],
    productLine: "LINE_6000",
    secondChoiceFor: "HARMONY",
  },
  {
    name: "FULL SPECTRUM 6000",
    type: "A",
    typeLabel: "Tipo A (Δ9-THC 1,4%)",
    totalMg: 7109,
    mlPerBottle: 30,
    mgMl: 200,
    dropsPerMl: 20,
    dropsPerBottle: 600,
    cbdPct: 0.963,
    cbdMg: 6846,
    description: "7109 mg/30 mL · 200 mg/mL · 20 gotas/mL · 10,0 mg can./gota · Δ9-THC 1,4%",
    fullLabel: "GREENLION FULL SPECTRUM 6000MG — Óleo de CBD espectro completo",
    compositionLabel: "Concentração: 7109mg / 30ml (200mg/mL) — Δ9-THC 1,4% (100mg/frasco · 0,09mg/gota)\nComposição: CBD 96,3% (6846mg) · Δ9-THC 1,4% (100mg) · CBC 1,9% (133mg) · CBDV 0,4% (29mg)",
    receituarioType: "Receituário tipo A — Uso exclusivo em cuidados paliativos (Notificação de Receita A)",
    clinicalJustification: "Δ9-THC 1,4% — Receituário tipo A obrigatório. Indicado exclusivamente para cuidados paliativos em situação clínica irreversível ou terminal (RDC Anvisa 327/2019).",
    cannabinoidJustification: "Espectro completo com 1,4% de Δ9-THC para potencialização do efeito analgésico, antiemético e orexígeno em cuidados paliativos oncológicos. CBC e CBDV complementam ação anti-inflamatória.",
    cannabinoids: [
      { name: "CBD", pct: 96.3, mg30ml: 6846, mgMl: +(6846 / 30).toFixed(1), mgDrop: +(6846 / 600).toFixed(2), effect: "Anti-inflamatório, analgésico, ansiolítico" },
      { name: "Δ9-THC", pct: 1.4, mg30ml: 100, mgMl: +(100 / 30).toFixed(2), mgDrop: +(100 / 600).toFixed(2), effect: "Analgésico, antiemético, orexígeno (paliativo)" },
      { name: "CBC", pct: 1.9, mg30ml: 133, mgMl: +(133 / 30).toFixed(1), mgDrop: +(133 / 600).toFixed(2), effect: "Anti-inflamatório, analgésico" },
      { name: "CBDV", pct: 0.4, mg30ml: 29, mgMl: +(29 / 30).toFixed(2), mgDrop: +(29 / 600).toFixed(2), effect: "Antiemético, anticonvulsivante" },
    ],
    productLine: "LINE_6000",
    restrictToPathologies: ["Câncer / Cuidados paliativos"],
    requiresTypeAWarning: true,
  },
];

// ── Pathology → Product visibility helper ──

/** Returns true if `product` should be visible/selectable for the given pathology. */
export function isProductAvailableForPathology(product: Product, pathology: PathologyInfo | null): boolean {
  if (!pathology) return true;
  if (product.restrictToPathologies && product.restrictToPathologies.length > 0) {
    return product.restrictToPathologies.includes(pathology.name);
  }
  return true;
}

// ── Dose calculation helpers ──

/** Calculate dose ranges for a pathology considering weight (for mg/kg types) */
export function getDoseRange(pathology: PathologyInfo, weightKg: number) {
  if (pathology.doseType === "mg_kg") {
    return {
      start: Math.round(pathology.doseStart * weightKg * 100) / 100,
      target: Math.round(pathology.doseTarget * weightKg * 100) / 100,
      max: Math.round(pathology.doseMax * weightKg * 100) / 100,
    };
  }
  return { start: pathology.doseStart, target: pathology.doseTarget, max: pathology.doseMax };
}

/** mg → gotas (each dose is split in 2 takes/day) */
export function mgToDrops(mgPerDose: number, product: Product): number {
  const mgPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;
  return Math.round(mgPerDose / mgPerDrop);
}

/** mg/dia → gotas/dia */
export function mgDayToDropsDay(mgDay: number, product: Product): number {
  const mgPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;
  return Math.round(mgDay / mgPerDrop);
}

/** gotas/dia → frascos/mês */
export function dropsToBottlesPerMonth(dropsPerDay: number, product: Product): number {
  const daysPerBottle = product.dropsPerBottle / dropsPerDay;
  return Math.ceil(30 / daysPerBottle);
}

/** Calculate number of bottles for a given duration */
export function calcBottles(dropsPerDay: number, product: Product, months: number): number {
  const totalDrops = dropsPerDay * 30 * months;
  return Math.ceil(totalDrops / product.dropsPerBottle);
}

// ── New Titulation Protocol (start low, go slow — fixed increments) ──

export interface TitulationStep {
  week: number;
  days: string;
  dropsPerDose: number;
  frequency: string;
  mgCanPerDose: number;
  mgCbdPerDose: number;
  mgCbdPerDay: number;
  mgKgPerDay: number;
  dropsPerDay: number;
  status: "titulação" | "manutenção";
}

export interface TitulationConfig {
  initialDrops: number;       // 1-10
  increment: number;          // +1, +2, or +3
  intervalDays: number;       // 5, 7, or 14
  maintenanceDrops: number;   // dose de manutenção
  via: string;
  time1: string;              // e.g. "08:00"
  time2: string;              // e.g. "20:00"
  returnDate: string;         // ISO date
}

export function generateTitulationProtocol(
  config: TitulationConfig,
  product: Product,
  weightKg: number,
): TitulationStep[] {
  const steps: TitulationStep[] = [];
  const mgPerDrop = product.mgMl / product.dropsPerMl; // mg total per drop
  const mgCbdPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;

  let drops = config.initialDrops;
  let week = 1;

  // Titulation weeks: increment until reaching maintenance dose
  while (drops < config.maintenanceDrops && week <= 12) {
    const dropsDay = drops * 2;
    const dayStart = (week - 1) * config.intervalDays + 1;
    const dayEnd = week * config.intervalDays;

    steps.push({
      week,
      days: `Dia ${dayStart}–${dayEnd}`,
      dropsPerDose: drops,
      frequency: "12/12h",
      mgCanPerDose: +(drops * mgPerDrop).toFixed(1),
      mgCbdPerDose: +(drops * mgCbdPerDrop).toFixed(1),
      mgCbdPerDay: +(dropsDay * mgCbdPerDrop).toFixed(1),
      mgKgPerDay: weightKg > 0 ? +(dropsDay * mgCbdPerDrop / weightKg).toFixed(2) : 0,
      dropsPerDay: dropsDay,
      status: "titulação",
    });

    drops += config.increment;
    week++;
  }

  // Maintenance step
  const maintDrops = config.maintenanceDrops;
  const maintDropsDay = maintDrops * 2;
  const dayStart = (week - 1) * config.intervalDays + 1;
  steps.push({
    week,
    days: `Dia ${dayStart}+`,
    dropsPerDose: maintDrops,
    frequency: "12/12h",
    mgCanPerDose: +(maintDrops * mgPerDrop).toFixed(1),
    mgCbdPerDose: +(maintDrops * mgCbdPerDrop).toFixed(1),
    mgCbdPerDay: +(maintDropsDay * mgCbdPerDrop).toFixed(1),
    mgKgPerDay: weightKg > 0 ? +(maintDropsDay * mgCbdPerDrop / weightKg).toFixed(2) : 0,
    dropsPerDay: maintDropsDay,
    status: "manutenção",
  });

  return steps;
}

/** Calculate total drops consumed over the titration + remaining days up to 30,
 *  then convert to bottles. Returns { totalDrops, weeklyBreakdown, bottles }. */
export function calcBottlesFromSchedule(
  config: TitulationConfig,
  product: Product,
): { totalDrops: number; weeklyBreakdown: { week: number; drops: number; dropsPerDose: number; days: number }[]; bottles: number } {
  const breakdown: { week: number; drops: number; dropsPerDose: number; days: number }[] = [];
  let totalDrops = 0;
  let daysUsed = 0;
  let drops = config.initialDrops;
  let week = 1;

  // Titration weeks
  while (drops < config.maintenanceDrops && daysUsed < 30 && week <= 12) {
    const daysThisWeek = Math.min(config.intervalDays, 30 - daysUsed);
    const weekDrops = drops * 2 * daysThisWeek;
    breakdown.push({ week, drops: weekDrops, dropsPerDose: drops, days: daysThisWeek });
    totalDrops += weekDrops;
    daysUsed += daysThisWeek;
    drops += config.increment;
    week++;
  }

  // Remaining days at maintenance dose
  if (daysUsed < 30) {
    const remainingDays = 30 - daysUsed;
    const weekDrops = config.maintenanceDrops * 2 * remainingDays;
    breakdown.push({ week, drops: weekDrops, dropsPerDose: config.maintenanceDrops, days: remainingDays });
    totalDrops += weekDrops;
  }

  return {
    totalDrops,
    weeklyBreakdown: breakdown,
    bottles: Math.ceil(totalDrops / product.dropsPerBottle),
  };
}
