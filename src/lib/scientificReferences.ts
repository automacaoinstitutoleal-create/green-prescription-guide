// Scientific references database for prescription support.
// Visible ONLY to logged-in doctors. Never included in any PDF (prescription or guide).

export interface ScientificReference {
  authors: string;
  title: string;
  journal: string;
  year: number;
  doseInfo: string;
  doi: string; // e.g. "10.1111/bcp.14038"
}

export interface PathologyReferences {
  /** Pathology name — must match exactly the names in PATHOLOGIES (prescriptionData.ts). */
  pathology: string;
  /** Reference dose range to display in the card subtitle. */
  doseReference: string;
  refs: ScientificReference[];
}

/** General references — appended to every pathology block. */
export const GENERAL_REFERENCES: ScientificReference[] = [
  {
    authors: "Chesney E. et al.",
    title: "A Systematic Review of the Dosing of CBD in Clinical Populations",
    journal: "British Journal of Clinical Pharmacology",
    year: 2020,
    doseInfo: "<1 a 50 mg/kg/dia · 35 estudos · 13 condições clínicas",
    doi: "10.1111/bcp.14038",
  },
  {
    authors: "Arnold JC. et al.",
    title: "The Safety and Efficacy of Low Oral Doses of CBD",
    journal: "Clinical and Translational Science",
    year: 2023,
    doseInfo: "300–400 mg/dia com melhor evidência clínica",
    doi: "10.1111/cts.13425",
  },
  {
    authors: "Pamplona FA. et al.",
    title: "Potential Clinical Benefits of CBD-Rich Cannabis Extracts Over Purified CBD in Treatment-Resistant Epilepsy",
    journal: "Frontiers in Neurology",
    year: 2018,
    doseInfo: "Extratos full spectrum eficazes em dose menor — efeito entourage",
    doi: "10.3389/fneur.2018.00759",
  },
];

/** Per-pathology references. Pathology names MUST match exactly PATHOLOGIES from prescriptionData.ts. */
export const PATHOLOGY_REFERENCES: PathologyReferences[] = [
  {
    pathology: "Epilepsia",
    doseReference: "2,5–20 mg/kg/dia",
    refs: [
      {
        authors: "Devinsky O. et al.",
        title: "Trial of Cannabidiol for Drug-Resistant Seizures in the Dravet Syndrome",
        journal: "New England Journal of Medicine",
        year: 2017,
        doseInfo: "20 mg/kg/dia · n=120 · RCT fase III",
        doi: "10.1056/NEJMoa1611618",
      },
      {
        authors: "Thiele EA. et al.",
        title: "Cannabidiol in Patients with Seizures Associated with Lennox-Gastaut Syndrome",
        journal: "Lancet",
        year: 2018,
        doseInfo: "10–20 mg/kg/dia · n=225 · RCT fase III",
        doi: "10.1016/S0140-6736(18)30136-3",
      },
      {
        authors: "Epidiolex (cannabidiol) — FDA Prescribing Information",
        title: "Greenwich Biosciences — Prescribing Information",
        journal: "FDA",
        year: 2018,
        doseInfo: "Dose aprovada: início 2,5 mg/kg/dia · alvo 10 mg/kg/dia · máximo 20 mg/kg/dia",
        doi: "10.1056/NEJMoa1611618",
      },
    ],
  },
  {
    pathology: "Ansiedade / TEPT",
    doseReference: "3–8 mg/kg/dia (150–600 mg/dia)",
    refs: [
      {
        authors: "Han K. et al.",
        title: "Therapeutic Potential of CBD in Anxiety Disorders: Systematic Review and Meta-Analysis",
        journal: "Psychiatry Research",
        year: 2024,
        doseInfo: "25–800 mg/dia · 8 RCTs · n=316 · efeito g=-0.92",
        doi: "10.1016/j.psychres.2024.116049",
      },
      {
        authors: "Coelho CF. et al.",
        title: "The Impact of CBD Treatment on Anxiety Disorders: Systematic Review of RCTs",
        journal: "Life (Basel)",
        year: 2024,
        doseInfo: "25–800 mg/dia · 11 RCTs",
        doi: "10.3390/life14111373",
      },
      {
        authors: "Arnold JC. et al.",
        title: "Safety and Efficacy of Low Oral Doses of CBD",
        journal: "Clinical and Translational Science",
        year: 2023,
        doseInfo: "300–400 mg/dia com melhor evidência para ansiedade",
        doi: "10.1111/cts.13425",
      },
      {
        authors: "Gruber SA. et al.",
        title: "Clinical and Cognitive Improvement Following Full-Spectrum High-CBD Treatment for Anxiety",
        journal: "NPJ Mental Health Research",
        year: 2022,
        doseInfo: "~30 mg/dia full spectrum · melhora em 4 semanas",
        doi: "10.1038/s44184-022-00013-0",
      },
    ],
  },
  {
    pathology: "Autismo (TEA)",
    doseReference: "1–10 mg/kg/dia",
    refs: [
      {
        authors: "Efron D. et al.",
        title: "Effects of CBD on Social Relating, Anxiety and Parental Stress in Autistic Children: RCT Crossover",
        journal: "medRxiv",
        year: 2024,
        doseInfo: "10 mg/kg/dia · n=29 · crianças 5–12 anos · 12 semanas",
        doi: "10.1101/2024.06.19.24309024",
      },
      {
        authors: "Aran A. et al.",
        title: "Cannabidiol-Rich Cannabis in Children with Autism Spectrum Disorder",
        journal: "Journal of Autism and Developmental Disorders",
        year: 2019,
        doseInfo: "Até 16 mg/kg/dia · melhora comportamento e comunicação",
        doi: "10.1007/s10803-018-3808-2",
      },
      {
        authors: "Silva Junior EA. et al.",
        title: "Cannabidiol for Autism Spectrum Disorder: A Systematic Review",
        journal: "Frontiers in Psychiatry",
        year: 2024,
        doseInfo: "Revisão · doses 1–10 mg/kg/dia",
        doi: "10.3389/fpsyt.2024.1287530",
      },
    ],
  },
  {
    pathology: "Dor crônica",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Mohammed SY. et al.",
        title: "Effectiveness of CBD to Manage Chronic Pain: A Systematic Review",
        journal: "Pain Management Nursing",
        year: 2024,
        doseInfo: "15 estudos · redução de dor 42–66%",
        doi: "10.1016/j.pmn.2023.10.002",
      },
      {
        authors: "Vučković S. et al.",
        title: "Cannabinoids and Pain: New Insights From Old Molecules",
        journal: "Frontiers in Pharmacology",
        year: 2018,
        doseInfo: "Doses terapêuticas 2,5–20 mg/kg",
        doi: "10.3389/fphar.2018.01259",
      },
      {
        authors: "Mlost J. et al.",
        title: "Cannabidiol for Pain Treatment: Focus on Pharmacology and Mechanism of Action",
        journal: "International Journal of Molecular Sciences",
        year: 2020,
        doseInfo: "Revisão mecanismos CB1/CB2/TRPV1",
        doi: "10.3390/ijms21228870",
      },
    ],
  },
  {
    pathology: "Fibromialgia",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Ergisi M. et al.",
        title: "Comparison of Cannabis-Based Products for Fibromyalgia: A Cohort Study",
        journal: "Journal of Pain & Palliative Care Pharmacotherapy",
        year: 2024,
        doseInfo: "n=148 · UK Medical Cannabis Registry · melhora com CBMPs",
        doi: "10.1080/15360288.2024.2414073",
      },
      {
        authors: "Boehnke KF. et al.",
        title: "CBD Product Dosing and Decision-Making in Fibromyalgia",
        journal: "Journal of Pain",
        year: 2022,
        doseInfo: "n=878 · doses <50 mg/dia insuficientes · suporte para doses maiores por peso",
        doi: "10.1016/j.jpain.2021.06.007",
      },
      {
        authors: "Rasmussen MU. et al.",
        title: "Cannabidiol versus Placebo in Patients with Fibromyalgia: RCT",
        journal: "Annals of the Rheumatic Diseases",
        year: 2025,
        doseInfo: "50 mg/dia não superior ao placebo — reforça necessidade de doses maiores por peso",
        doi: "10.1016/j.ard.2025.07.008",
      },
    ],
  },
  {
    pathology: "Câncer / Cuidados paliativos",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Good P. et al.",
        title: "A Phase 2 Placebo-Controlled Trial of CBD in Patients with Advanced Cancer",
        journal: "Journal of Pain and Symptom Management",
        year: 2022,
        doseInfo: "Até 300 mg/dia · bem tolerado · melhora de sintomas",
        doi: "10.1016/j.jpainsymman.2022.09.004",
      },
      {
        authors: "Aviram J. & Samuelly-Leichtag G.",
        title: "Efficacy of Cannabis-Based Medicines for Pain Management: A Systematic Review",
        journal: "Journal of Pain Research",
        year: 2017,
        doseInfo: "THC+CBD superiores ao CBD isolado em dor oncológica",
        doi: "10.2147/JPR.S145928",
      },
    ],
  },
  {
    pathology: "Insônia",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Narayan AJ. et al.",
        title: "Cannabidiol for Moderate-Severe Insomnia: A Randomized Controlled Pilot Trial of 150 mg Nightly",
        journal: "Journal of Clinical Sleep Medicine",
        year: 2024,
        doseInfo: "150 mg/noite · RCT · melhora significativa do sono",
        doi: "10.5664/jcsm.10998",
      },
      {
        authors: "Shannon S. et al.",
        title: "Cannabidiol in Anxiety and Sleep: A Large Case Series",
        journal: "The Permanente Journal",
        year: 2019,
        doseInfo: "n=72 · 25 mg/dia · melhora sono em 66,7% no 1º mês",
        doi: "10.7812/TPP/18-041",
      },
    ],
  },
  // Depressão (mapeada para Transtorno bipolar e ausente do enum atual — incluímos como referência geral em humor)
  {
    pathology: "Transtorno bipolar",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Melas PA. et al.",
        title: "CBD as Potential Treatment for Anxiety and Mood Disorders: Molecular Targets and Epigenetic Insights",
        journal: "International Journal of Molecular Sciences",
        year: 2021,
        doseInfo: "Doses terapêuticas 150–600 mg/dia para distúrbios do humor",
        doi: "10.3390/ijms22041863",
      },
      {
        authors: "de Aquino JP. et al.",
        title: "CBD and Brain Circuits Implicated in Stress-Related Disorders",
        journal: "Frontiers in Neuroscience",
        year: 2020,
        doseInfo: "Mecanismo 5-HT1A · doses 150–300 mg/dia",
        doi: "10.3389/fnins.2020.00979",
      },
    ],
  },
  {
    pathology: "Doença de Parkinson",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Chagas MH. et al.",
        title: "CBD Can Improve Complex Sleep-Related Behaviours Associated with Parkinson's Disease",
        journal: "Journal of Clinical Pharmacy and Therapeutics",
        year: 2014,
        doseInfo: "75–300 mg/dia · melhora distúrbios do sono e tremores",
        doi: "10.1111/jcpt.12179",
      },
      {
        authors: "Fernández-Ruiz J. et al.",
        title: "Cannabidiol for Neurodegenerative Disorders: A Translational Overview",
        journal: "Frontiers in Pharmacology",
        year: 2020,
        doseInfo: "Doses 150–300 mg/dia com efeito neuroprotetor documentado",
        doi: "10.3389/fphar.2020.00593",
      },
    ],
  },
  {
    pathology: "Doença de Alzheimer",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Watt G. & Karl T.",
        title: "In vivo Evidence for Therapeutic Properties of CBD in Alzheimer's Disease",
        journal: "Frontiers in Pharmacology",
        year: 2017,
        doseInfo: "Revisão neuroproteção · doses 10–50 mg/kg em modelos",
        doi: "10.3389/fphar.2017.00020",
      },
      {
        authors: "Fernández-Ruiz J. et al.",
        title: "Cannabidiol for Neurodegenerative Disorders: A Translational Overview",
        journal: "Frontiers in Pharmacology",
        year: 2020,
        doseInfo: "Doses 150–300 mg/dia com efeito neuroprotetor documentado",
        doi: "10.3389/fphar.2020.00593",
      },
    ],
  },
  {
    pathology: "TOC (Transtorno Obsessivo Compulsivo)",
    doseReference: "5–15 mg/kg/dia",
    refs: [
      {
        authors: "McGuire P. et al.",
        title: "CBD as an Adjunctive Therapy in Schizophrenia: A Multicenter RCT",
        journal: "American Journal of Psychiatry",
        year: 2018,
        doseInfo: "1000 mg/dia · n=88 · melhora sintomas psicóticos",
        doi: "10.1176/appi.ajp.2017.17030325",
      },
      {
        authors: "Zuardi AW. et al.",
        title: "CBD Monotherapy for Treatment-Resistant Schizophrenia",
        journal: "Journal of Psychopharmacology",
        year: 2006,
        doseInfo: "Até 1280 mg/dia · caso clínico documentado",
        doi: "10.1177/0269881106060967",
      },
    ],
  },
  {
    pathology: "Transtornos psicóticos",
    doseReference: "5–15 mg/kg/dia",
    refs: [
      {
        authors: "McGuire P. et al.",
        title: "CBD as an Adjunctive Therapy in Schizophrenia: A Multicenter RCT",
        journal: "American Journal of Psychiatry",
        year: 2018,
        doseInfo: "1000 mg/dia · n=88 · melhora sintomas psicóticos",
        doi: "10.1176/appi.ajp.2017.17030325",
      },
      {
        authors: "Zuardi AW. et al.",
        title: "CBD Monotherapy for Treatment-Resistant Schizophrenia",
        journal: "Journal of Psychopharmacology",
        year: 2006,
        doseInfo: "Até 1280 mg/dia · caso clínico documentado",
        doi: "10.1177/0269881106060967",
      },
    ],
  },
  {
    pathology: "Esclerose múltipla",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Collin C. et al.",
        title: "Randomized Controlled Trial of Cannabis-Based Medicine in Spasticity Caused by Multiple Sclerosis",
        journal: "European Journal of Neurology",
        year: 2007,
        doseInfo: "Sativex CBD+THC · doses equivalentes 5 mg/kg/dia",
        doi: "10.1111/j.1468-1331.2007.01878.x",
      },
      {
        authors: "Zajicek J. et al.",
        title: "Cannabinoids for Treatment of Spasticity and Other Symptoms Related to Multiple Sclerosis (CAMS study)",
        journal: "Lancet",
        year: 2003,
        doseInfo: "n=630 · redução de espasticidade com canabinoides",
        doi: "10.1016/S0140-6736(03)14738-1",
      },
    ],
  },
  {
    pathology: "Transtorno do pânico",
    doseReference: "3–8 mg/kg/dia (150–600 mg/dia)",
    refs: [
      {
        authors: "Han K. et al.",
        title: "Therapeutic Potential of CBD in Anxiety Disorders: Systematic Review and Meta-Analysis",
        journal: "Psychiatry Research",
        year: 2024,
        doseInfo: "25–800 mg/dia · 8 RCTs · n=316 · efeito g=-0.92",
        doi: "10.1016/j.psychres.2024.116049",
      },
    ],
  },
  {
    pathology: "Enxaqueca crônica",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Mohammed SY. et al.",
        title: "Effectiveness of CBD to Manage Chronic Pain: A Systematic Review",
        journal: "Pain Management Nursing",
        year: 2024,
        doseInfo: "15 estudos · redução de dor 42–66%",
        doi: "10.1016/j.pmn.2023.10.002",
      },
    ],
  },
  {
    pathology: "TDAH",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Arnold JC. et al.",
        title: "Safety and Efficacy of Low Oral Doses of CBD",
        journal: "Clinical and Translational Science",
        year: 2023,
        doseInfo: "300–400 mg/dia com melhor evidência clínica",
        doi: "10.1111/cts.13425",
      },
    ],
  },
];

/** Get specific references for a pathology, sorted most-recent first.
 *  Always includes the GENERAL_REFERENCES at the end. */
export function getReferencesForPathology(pathologyName: string): {
  doseReference: string | null;
  specific: ScientificReference[];
  general: ScientificReference[];
  total: number;
} {
  const block = PATHOLOGY_REFERENCES.find((p) => p.pathology === pathologyName);
  const specific = (block?.refs || []).slice().sort((a, b) => b.year - a.year);
  const general = GENERAL_REFERENCES.slice().sort((a, b) => b.year - a.year);
  return {
    doseReference: block?.doseReference ?? null,
    specific,
    general,
    total: specific.length + general.length,
  };
}

/** Build a PubMed search URL from a DOI. */
export function pubmedUrlForDoi(doi: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(doi)}`;
}
