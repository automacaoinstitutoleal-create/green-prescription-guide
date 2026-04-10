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

export interface Product {
  name: string;
  type: string; // "C" or "B"
  typeLabel: string;
  totalMg: number; // 7237
  mlPerBottle: number; // 30
  mgMl: number; // 241
  dropsPerMl: number; // 20
  dropsPerBottle: number; // 600
  cbdPct: number; // fraction, e.g. 0.65
  description: string;
  clinicalJustification: string;
  cannabinoidJustification: string;
  cannabinoids: CannabinoidRow[];
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
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
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
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
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
    description: "7237 mg/30 mL · 241 mg/mL · 20 gotas/mL",
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
  },
];

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

// ── Titulation Protocol ──

export interface TitulationStep {
  week: number;
  days: string;
  dropsPerDose: number;   // gotas por tomada (12/12h)
  frequency: string;
  mgCanPerDose: number;   // mg canabinoides por dose
  mgCbdPerDose: number;   // mg CBD por dose
  mgCbdPerDay: number;    // mg CBD por dia
  mgKgPerDay: number;     // mg/kg/dia
  dropsPerDay: number;    // gotas/dia
  status: "normal" | "target" | "above_max";
}

export function generateTitulationProtocol(
  initialDropsPerDose: number,
  product: Product,
  weightKg: number,
  doseTargetMgDay: number,
  doseMaxMgDay: number,
  intervalDays: number,
): TitulationStep[] {
  const steps: TitulationStep[] = [];
  let drops = initialDropsPerDose;
  let week = 1;
  const mgPerDrop = product.mgMl / product.dropsPerMl; // mg total per drop
  const mgCbdPerDrop = (product.mgMl * product.cbdPct) / product.dropsPerMl;

  while (week <= 12) {
    const dropsDay = drops * 2;
    const mgCanPerDose = +(drops * mgPerDrop).toFixed(1);
    const mgCbdPerDose = +(drops * mgCbdPerDrop).toFixed(1);
    const mgCbdDay = +(dropsDay * mgCbdPerDrop).toFixed(1);
    const mgKgDay = weightKg > 0 ? +(mgCbdDay / weightKg).toFixed(2) : 0;

    let status: TitulationStep["status"] = "normal";
    if (mgCbdDay >= doseTargetMgDay && mgCbdDay <= doseMaxMgDay) status = "target";
    if (mgCbdDay > doseMaxMgDay) status = "above_max";

    const dayStart = (week - 1) * intervalDays + 1;
    const dayEnd = week * intervalDays;

    steps.push({
      week,
      days: `Dia ${dayStart}–${dayEnd}`,
      dropsPerDose: drops,
      frequency: "12/12h",
      mgCanPerDose,
      mgCbdPerDose,
      mgCbdPerDay: mgCbdDay,
      mgKgPerDay: mgKgDay,
      dropsPerDay: dropsDay,
      status,
    });

    if (status === "above_max") break;
    drops = drops * 2;
    week++;
  }
  return steps;
}
