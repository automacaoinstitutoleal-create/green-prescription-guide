export const PATHOLOGIES = [
  "Autismo / TEA",
  "Epilepsia",
  "Dor Crônica",
  "Ansiedade",
  "Insônia",
  "Fibromialgia",
  "Esclerose Múltipla",
  "Parkinson",
  "Alzheimer",
  "TDAH",
  "Depressão",
  "Síndrome de Tourette",
  "Espasticidade",
] as const;

export type Pathology = (typeof PATHOLOGIES)[number];

export interface Product {
  name: string;
  type: string;
  description: string;
  concentration: number; // mg/mL
  defaultDosePerKg: number; // mg/kg/dia
}

export const PRODUCTS: Product[] = [
  {
    name: "Harmony",
    type: "Tipo C (CBD predominante)",
    description: "CBD Full Spectrum — indicado para condições neurológicas e comportamentais",
    concentration: 20,
    defaultDosePerKg: 0.5,
  },
  {
    name: "Balance",
    type: "Tipo B (CBD:THC balanceado)",
    description: "CBD:THC 1:1 — indicado para dor, espasticidade e condições mistas",
    concentration: 10,
    defaultDosePerKg: 0.25,
  },
  {
    name: "Relief",
    type: "Tipo B (THC predominante)",
    description: "THC predominante — indicado para dor intensa, náusea e espasticidade severa",
    concentration: 10,
    defaultDosePerKg: 0.1,
  },
];

export const PATHOLOGY_PRODUCT_MAP: Record<Pathology, string[]> = {
  "Autismo / TEA": ["Harmony", "Balance"],
  "Epilepsia": ["Harmony"],
  "Dor Crônica": ["Balance", "Relief"],
  "Ansiedade": ["Harmony"],
  "Insônia": ["Harmony", "Balance"],
  "Fibromialgia": ["Balance", "Relief"],
  "Esclerose Múltipla": ["Balance", "Relief"],
  "Parkinson": ["Harmony", "Balance"],
  "Alzheimer": ["Harmony"],
  "TDAH": ["Harmony"],
  "Depressão": ["Harmony", "Balance"],
  "Síndrome de Tourette": ["Harmony", "Balance"],
  "Espasticidade": ["Balance", "Relief"],
};

export function calculateDose(weight: number, dosePerKg: number) {
  return Math.round(weight * dosePerKg * 100) / 100;
}

export function calculateVolume(doseMg: number, concentrationMgMl: number) {
  return Math.round((doseMg / concentrationMgMl) * 100) / 100;
}

export interface TitulationStep {
  week: number;
  days: string;
  doseMorning: number;
  doseEvening: number;
  totalDaily: number;
  volumeMorning: number;
  volumeEvening: number;
}

export function generateTitulationProtocol(
  initialDailyDose: number,
  targetDailyDose: number,
  concentration: number
): TitulationStep[] {
  const steps: TitulationStep[] = [];
  let currentDose = initialDailyDose;
  let week = 1;

  while (currentDose <= targetDailyDose && week <= 8) {
    const halfDose = currentDose / 2;
    steps.push({
      week,
      days: `Dia ${(week - 1) * 7 + 1} a ${week * 7}`,
      doseMorning: Math.round(halfDose * 100) / 100,
      doseEvening: Math.round(halfDose * 100) / 100,
      totalDaily: Math.round(currentDose * 100) / 100,
      volumeMorning: calculateVolume(halfDose, concentration),
      volumeEvening: calculateVolume(halfDose, concentration),
    });
    currentDose *= 2;
    week++;
  }

  return steps;
}
