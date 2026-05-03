// Scientific references database for prescription support.
// Visible ONLY to logged-in doctors. Never included in any PDF (prescription or guide).
//
// Expanded base — March 2026
// Foco: dose por peso (mg/kg), altas doses, full/broad spectrum (Linha Precision).

export interface ScientificReference {
  authors: string;
  title: string;
  journal: string;
  year: number;
  doseInfo: string;
  doi: string;
  /** Optional URL when DOI is not the canonical identifier (e.g. PubMed-only). */
  url?: string;
  /** Tags for filtering: e.g. "full-spectrum", "mg/kg", "RCT", "meta-analysis", "pediatric" */
  tags?: string[];
}

export interface PathologyReferences {
  /** Pathology name — must match exactly the names in PATHOLOGIES (prescriptionData.ts). */
  pathology: string;
  /** Reference dose range to display in the card subtitle. */
  doseReference: string;
  refs: ScientificReference[];
}

/** General references — appended to every pathology block. Includes core full-spectrum and dosing reviews. */
export const GENERAL_REFERENCES: ScientificReference[] = [
  {
    authors: "Pamplona FA, da Silva LR, Coan AC.",
    title: "Potential Clinical Benefits of CBD-Rich Cannabis Extracts Over Purified CBD in Treatment-Resistant Epilepsy: Observational Data Meta-analysis",
    journal: "Frontiers in Neurology",
    year: 2018,
    doseInfo: "Extratos CBD-ricos: 71% melhora vs 46% CBD purificado · n=670 · doses 1–50 mg/kg/d · efeito entourage",
    doi: "10.3389/fneur.2018.00759",
    tags: ["full-spectrum", "meta-analysis", "entourage"],
  },
  {
    authors: "Chesney E, Oliver D, Green A, et al.",
    title: "A Systematic Review of the Dosing of CBD in Clinical Populations",
    journal: "British Journal of Clinical Pharmacology",
    year: 2020,
    doseInfo: "Doses 1–50 mg/kg/d · 35 estudos · 13 condições · doses maiores → melhores desfechos",
    doi: "10.1111/bcp.14038",
    tags: ["mg/kg", "systematic-review"],
  },
  {
    authors: "Larsen C, Shahinas J.",
    title: "Dosage, Efficacy and Safety of Cannabidiol Administration in Adults: A Systematic Review of Human Trials",
    journal: "Journal of Clinical Medicine Research",
    year: 2020,
    doseInfo: "25 estudos em adultos · doses até 2000 mg/dia · revisão sistemática",
    doi: "10.14740/jocmr4090",
    tags: ["mg/kg", "systematic-review", "high-dose"],
  },
  {
    authors: "Russo EB.",
    title: "Taming THC: Potential Cannabis Synergy and Phytocannabinoid-Terpenoid Entourage Effects",
    journal: "British Journal of Pharmacology",
    year: 2011,
    doseInfo: "Marco teórico do efeito entourage: terpenos + canabinoides em sinergia",
    doi: "10.1111/j.1476-5381.2011.01238.x",
    tags: ["full-spectrum", "entourage", "review"],
  },
  {
    authors: "Gallily R, Yekhtin Z, Hanus LO.",
    title: "Overcoming the Bell-Shaped Dose-Response of Cannabidiol by Using Cannabis Extract Enriched in Cannabidiol",
    journal: "Pharmacology & Pharmacy",
    year: 2015,
    doseInfo: "Extratos enriquecidos superam curva sino do CBD isolado · justifica full spectrum",
    doi: "10.4236/pp.2015.62010",
    tags: ["full-spectrum", "entourage"],
  },
  {
    authors: "Arnold JC, McCartney D, Suraev A, McGregor IS.",
    title: "The Safety and Efficacy of Low Oral Doses of Cannabidiol",
    journal: "Clinical and Translational Science",
    year: 2023,
    doseInfo: "300–400 mg/dia com melhor evidência clínica",
    doi: "10.1111/cts.13425",
    tags: ["systematic-review", "safety"],
  },
  {
    authors: "Inglet S, Winter B, Yost SE, et al.",
    title: "Clinical Data for the Use of Cannabis-Based Treatments: A Comprehensive Review of the Literature",
    journal: "Annals of Pharmacotherapy",
    year: 2020,
    doseInfo: "Revisão clínica abrangente do uso terapêutico de canabinoides",
    doi: "10.1177/1060028020930189",
    tags: ["review", "clinical"],
  },
  {
    authors: "Arnold JC, et al.",
    title: "Prescribing Medicinal Cannabis",
    journal: "Australian Prescriber",
    year: 2020,
    doseInfo: "Guia prático de prescrição médica de canabinoides",
    doi: "10.18773/austprescr.2020.052",
    tags: ["clinical-guide", "prescribing"],
  },
];

/** Per-pathology references. Pathology names MUST match exactly PATHOLOGIES from prescriptionData.ts. */
export const PATHOLOGY_REFERENCES: PathologyReferences[] = [
  // ═══ EPILEPSIA ═══
  {
    pathology: "Epilepsia",
    doseReference: "2,5–20 mg/kg/dia (até 50 mg/kg/d em refratários)",
    refs: [
      {
        authors: "Devinsky O, Cross JH, Laux L, et al.",
        title: "Trial of Cannabidiol for Drug-Resistant Seizures in the Dravet Syndrome",
        journal: "New England Journal of Medicine",
        year: 2017,
        doseInfo: "20 mg/kg/dia · n=120 · RCT fase III · -38,9% crises convulsivas",
        doi: "10.1056/NEJMoa1611618",
        tags: ["mg/kg", "RCT", "high-dose", "pediatric"],
      },
      {
        authors: "Thiele EA, Marsh ED, French JA, et al.",
        title: "Cannabidiol in Patients with Seizures Associated with Lennox-Gastaut Syndrome",
        journal: "Lancet",
        year: 2018,
        doseInfo: "10–20 mg/kg/dia · n=225 · RCT fase III",
        doi: "10.1016/S0140-6736(18)30136-3",
        tags: ["mg/kg", "RCT", "pediatric"],
      },
      {
        authors: "García-Peñas JJ, et al.",
        title: "Cannabidiol for the Treatment of Lennox-Gastaut Syndrome and Dravet Syndrome: Experts' Recommendations for Clinical Practice in Spain",
        journal: "Revista de Neurologia",
        year: 2021,
        doseInfo: "Recomendações clínicas: dose-alvo 10 mg/kg/d, máx 20 mg/kg/d",
        doi: "10.33588/rn.73S01.2021250",
        url: "https://pubmed.ncbi.nlm.nih.gov/34486101/",
        tags: ["mg/kg", "clinical-guide", "pediatric"],
      },
      {
        authors: "Treves N, et al.",
        title: "Efficacy and Safety of Medical Cannabinoids in Children: A Systematic Review and Meta-analysis",
        journal: "Scientific Reports",
        year: 2021,
        doseInfo: "Meta-análise pediátrica · doses 5–20 mg/kg/d · alta segurança",
        doi: "10.1038/s41598-021-02770-6",
        url: "https://pubmed.ncbi.nlm.nih.gov/34873203/",
        tags: ["mg/kg", "meta-analysis", "pediatric"],
      },
      {
        authors: "Gaston TE, et al.",
        title: "Long-term Safety and Efficacy of Highly Purified Cannabidiol for Treatment-Refractory Epilepsy",
        journal: "Epilepsy & Behavior",
        year: 2021,
        doseInfo: "Estudo longitudinal · doses até 50 mg/kg/d · seguro a longo prazo",
        doi: "10.1016/j.yebeh.2021.107862",
        url: "https://pubmed.ncbi.nlm.nih.gov/33667843/",
        tags: ["mg/kg", "long-term", "high-dose"],
      },
      {
        authors: "Martin RC, et al.",
        title: "Cognitive Functioning Following Long-Term Cannabidiol Use in Adults with Treatment-Resistant Epilepsy",
        journal: "Epilepsy & Behavior",
        year: 2019,
        doseInfo: "Função cognitiva preservada com uso prolongado de CBD",
        doi: "10.1016/j.yebeh.2019.05.049",
        url: "https://pubmed.ncbi.nlm.nih.gov/31220785/",
        tags: ["long-term", "cognitive"],
      },
      {
        authors: "Epidiolex (cannabidiol) — FDA Prescribing Information",
        title: "Greenwich Biosciences — Prescribing Information",
        journal: "FDA",
        year: 2018,
        doseInfo: "Dose aprovada: início 2,5 mg/kg/d · alvo 10 mg/kg/d · máximo 20 mg/kg/d",
        doi: "FDA-Epidiolex-2018",
        url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/210365lbl.pdf",
        tags: ["mg/kg", "FDA", "regulatory"],
      },
    ],
  },

  // ═══ ANSIEDADE / TEPT ═══
  {
    pathology: "Ansiedade / TEPT",
    doseReference: "3–8 mg/kg/dia (150–600 mg/dia em adultos)",
    refs: [
      {
        authors: "Han K, Wang JY, Wang PY, Peng YC.",
        title: "Therapeutic Potential of CBD in Anxiety Disorders: Systematic Review and Meta-Analysis",
        journal: "Psychiatry Research",
        year: 2024,
        doseInfo: "25–800 mg/dia · 8 RCTs · n=316 · efeito g=-0.92 (forte)",
        doi: "10.1016/j.psychres.2024.116049",
        tags: ["meta-analysis", "RCT", "high-dose"],
      },
      {
        authors: "Coelho CF, et al.",
        title: "The Impact of CBD Treatment on Anxiety Disorders: Systematic Review of RCTs",
        journal: "Life (Basel)",
        year: 2024,
        doseInfo: "25–800 mg/dia · 11 RCTs · doses maiores associadas a melhor resposta",
        doi: "10.3390/life14111373",
        tags: ["meta-analysis", "RCT"],
      },
      {
        authors: "Kirkland AE, et al.",
        title: "A Scoping Review of the Use of Cannabidiol in Psychiatric Disorders",
        journal: "Psychiatry Research",
        year: 2022,
        doseInfo: "Doses terapêuticas em transtornos psiquiátricos · 150–800 mg/d",
        doi: "10.1016/j.psychres.2021.114347",
        url: "https://pubmed.ncbi.nlm.nih.gov/34952255/",
        tags: ["scoping-review", "psychiatric"],
      },
      {
        authors: "Masataka N.",
        title: "Anxiolytic Effects of Repeated Cannabidiol Treatment in Teenagers with Social Anxiety Disorders",
        journal: "Frontiers in Psychology",
        year: 2019,
        doseInfo: "300 mg/d · 4 semanas · adolescentes · ansiedade social",
        doi: "10.3389/fpsyg.2019.02466",
        url: "https://pubmed.ncbi.nlm.nih.gov/31787910/",
        tags: ["RCT", "adolescent", "social-anxiety"],
      },
      {
        authors: "Bloomfield MAP, et al.",
        title: "The Acute Effects of Cannabidiol on Emotional Processing and Anxiety: A Neurocognitive Imaging Study",
        journal: "Psychopharmacology",
        year: 2022,
        doseInfo: "600 mg dose única · neuroimagem · modulação amígdala",
        doi: "10.1007/s00213-022-06093-w",
        url: "https://pubmed.ncbi.nlm.nih.gov/35445839/",
        tags: ["RCT", "neuroimaging"],
      },
      {
        authors: "Martin EL, et al.",
        title: "Antidepressant and Anxiolytic Effects of Medicinal Cannabis Use in an Observational Trial",
        journal: "Frontiers in Psychiatry",
        year: 2021,
        doseInfo: "Cannabis medicinal full spectrum · efeito ansiolítico e antidepressivo",
        doi: "10.3389/fpsyt.2021.729800",
        url: "https://pubmed.ncbi.nlm.nih.gov/34566726/",
        tags: ["full-spectrum", "observational"],
      },
      {
        authors: "Anderson LL, et al.",
        title: "Citalopram and Cannabidiol: In Vitro and In Vivo Evidence of Pharmacokinetic Interactions Relevant to the Treatment of Anxiety Disorders in Young People",
        journal: "Journal of Clinical Psychopharmacology",
        year: 2021,
        doseInfo: "Interação farmacocinética CBD × ISRS · ajuste de dose necessário",
        doi: "10.1097/JCP.0000000000001427",
        url: "https://pubmed.ncbi.nlm.nih.gov/34121064/",
        tags: ["pharmacokinetics", "drug-interaction"],
      },
      {
        authors: "Gruber SA, et al.",
        title: "Clinical and Cognitive Improvement Following Full-Spectrum High-CBD Treatment for Anxiety",
        journal: "NPJ Mental Health Research",
        year: 2022,
        doseInfo: "~30 mg/d full spectrum · melhora em 4 semanas · justifica Precision",
        doi: "10.1038/s44184-022-00013-0",
        tags: ["full-spectrum", "RCT"],
      },
      {
        authors: "Steardo L Jr, et al.",
        title: "Endocannabinoid System as Therapeutic Target of PTSD: A Systematic Review",
        journal: "Life (Basel)",
        year: 2021,
        doseInfo: "Sistema endocanabinoide em TEPT · alvo terapêutico",
        doi: "10.3390/life11030214",
        url: "https://pubmed.ncbi.nlm.nih.gov/33803374/",
        tags: ["systematic-review", "mechanism"],
      },
      {
        authors: "Bolsoni LM, et al.",
        title: "Effects of Cannabidiol on Symptoms Induced by the Recall of Traumatic Events in Patients with Posttraumatic Stress Disorder",
        journal: "Psychopharmacology",
        year: 2022,
        doseInfo: "300 mg/d · TEPT · modulação de memórias traumáticas",
        doi: "10.1007/s00213-021-06043-y",
        url: "https://pubmed.ncbi.nlm.nih.gov/35029706/",
        tags: ["RCT", "trauma"],
      },
    ],
  },

  // ═══ AUTISMO ═══
  {
    pathology: "Autismo (TEA)",
    doseReference: "1–10 mg/kg/dia (até 16 mg/kg/d em casos graves)",
    refs: [
      {
        authors: "Aran A, et al.",
        title: "Cannabinoid Treatment for Autism: A Proof-of-Concept Randomized Trial",
        journal: "Molecular Autism",
        year: 2021,
        doseInfo: "Cannabis whole-plant CBD:THC 20:1 · até 10 mg/kg/d CBD · n=150 · RCT crossover",
        doi: "10.1186/s13229-021-00420-2",
        url: "https://pubmed.ncbi.nlm.nih.gov/33536055/",
        tags: ["mg/kg", "RCT", "full-spectrum", "pediatric"],
      },
      {
        authors: "Aran A, et al.",
        title: "Cannabidiol-Rich Cannabis in Children with Autism Spectrum Disorder",
        journal: "Journal of Autism and Developmental Disorders",
        year: 2019,
        doseInfo: "Até 16 mg/kg/dia · melhora comportamento, comunicação e ansiedade",
        doi: "10.1007/s10803-018-3808-2",
        tags: ["mg/kg", "high-dose", "pediatric", "full-spectrum"],
      },
      {
        authors: "Efron D, et al.",
        title: "Effects of CBD on Social Relating, Anxiety and Parental Stress in Autistic Children: RCT Crossover",
        journal: "medRxiv",
        year: 2024,
        doseInfo: "10 mg/kg/dia · n=29 · crianças 5–12 anos · 12 semanas · RCT",
        doi: "10.1101/2024.06.19.24309024",
        tags: ["mg/kg", "RCT", "pediatric"],
      },
      {
        authors: "Silva EAD Junior, et al.",
        title: "Cannabis and Cannabinoid Use in Autism Spectrum Disorder: A Systematic Review",
        journal: "Trends in Psychiatry and Psychotherapy",
        year: 2021,
        doseInfo: "Revisão sistemática · doses 1–10 mg/kg/d · evidência crescente",
        doi: "10.47626/2237-6089-2021-0237",
        url: "https://pubmed.ncbi.nlm.nih.gov/34043900/",
        tags: ["systematic-review", "mg/kg"],
      },
      {
        authors: "Pedrazzi JFC, et al.",
        title: "Cannabidiol for the Treatment of Autism Spectrum Disorder: Hope or Hype?",
        journal: "Psychopharmacology",
        year: 2022,
        doseInfo: "Análise crítica · doses 1–10 mg/kg/d · necessidade de RCTs maiores",
        doi: "10.1007/s00213-022-06179-5",
        url: "https://pubmed.ncbi.nlm.nih.gov/35904579/",
        tags: ["review", "mg/kg"],
      },
      {
        authors: "Aishworiya R, et al.",
        title: "An Update on Psychopharmacological Treatment of Autism Spectrum Disorder",
        journal: "Neurotherapeutics",
        year: 2022,
        doseInfo: "Atualização farmacológica em TEA · papel emergente do CBD",
        doi: "10.1007/s13311-022-01183-1",
        url: "https://pubmed.ncbi.nlm.nih.gov/35029811/",
        tags: ["review", "psychopharmacology"],
      },
      {
        authors: "Bilge S, Ekici B.",
        title: "CBD-Enriched Cannabis for Autism Spectrum Disorder: Single-Center Experience in Turkey and Literature Review",
        journal: "Journal of Cannabis Research",
        year: 2021,
        doseInfo: "Cannabis enriquecido em CBD (full spectrum) · superior ao CBD isolado",
        doi: "10.1186/s42238-021-00104-x",
        url: "https://pubmed.ncbi.nlm.nih.gov/34911567/",
        tags: ["full-spectrum", "clinical-experience"],
      },
      {
        authors: "Colizzi M, et al.",
        title: "The Autism-Psychosis Continuum Conundrum: Exploring the Role of the Endocannabinoid System",
        journal: "International Journal of Environmental Research and Public Health",
        year: 2022,
        doseInfo: "Sistema endocanabinoide na interface autismo-psicose",
        doi: "10.3390/ijerph19095616",
        url: "https://pubmed.ncbi.nlm.nih.gov/35565034/",
        tags: ["mechanism", "endocannabinoid"],
      },
    ],
  },

  // ═══ DOR CRÔNICA ═══
  {
    pathology: "Dor crônica",
    doseReference: "2,5–5 mg/kg/dia (escalonável conforme resposta)",
    refs: [
      {
        authors: "Wang L, et al.",
        title: "Medical Cannabis or Cannabinoids for Chronic Non-Cancer and Cancer Related Pain: A Systematic Review and Meta-Analysis of RCTs",
        journal: "BMJ",
        year: 2021,
        doseInfo: "32 RCTs · meta-análise · redução clinicamente significativa de dor",
        doi: "10.1136/bmj.n1034",
        url: "https://pubmed.ncbi.nlm.nih.gov/34497047/",
        tags: ["meta-analysis", "RCT"],
      },
      {
        authors: "Petzke F, et al.",
        title: "Cannabis-Based Medicines and Medical Cannabis for Chronic Neuropathic Pain",
        journal: "CNS Drugs",
        year: 2022,
        doseInfo: "Dor neuropática crônica · canabinoides como adjuvantes",
        doi: "10.1007/s40263-021-00879-w",
        url: "https://pubmed.ncbi.nlm.nih.gov/34802112/",
        tags: ["review", "neuropathic"],
      },
      {
        authors: "Mohammed SY, et al.",
        title: "Effectiveness of CBD to Manage Chronic Pain: A Systematic Review",
        journal: "Pain Management Nursing",
        year: 2024,
        doseInfo: "15 estudos · redução de dor 42–66%",
        doi: "10.1016/j.pmn.2023.10.002",
        tags: ["systematic-review"],
      },
      {
        authors: "Brucki SM, et al.",
        title: "Cannabinoids in Neurology — Brazilian Academy of Neurology",
        journal: "Arquivos de Neuro-Psiquiatria",
        year: 2015,
        doseInfo: "Recomendações da Academia Brasileira de Neurologia",
        doi: "10.1590/0004-282X20150041",
        url: "https://pubmed.ncbi.nlm.nih.gov/25992535/",
        tags: ["clinical-guide", "brazil"],
      },
      {
        authors: "Krcevski-Skvarc N, et al.",
        title: "Availability and Approval of Cannabis-Based Medicines for Chronic Pain Management and Palliative/Supportive Care in Europe",
        journal: "European Journal of Pain",
        year: 2018,
        doseInfo: "Mapeamento europeu de medicamentos canabinoides em dor crônica",
        doi: "10.1002/ejp.1147",
        url: "https://pubmed.ncbi.nlm.nih.gov/29134767/",
        tags: ["regulatory", "europe"],
      },
      {
        authors: "Vučković S, et al.",
        title: "Cannabinoids and Pain: New Insights From Old Molecules",
        journal: "Frontiers in Pharmacology",
        year: 2018,
        doseInfo: "Doses terapêuticas 2,5–20 mg/kg · mecanismos CB1/CB2/TRPV1",
        doi: "10.3389/fphar.2018.01259",
        tags: ["mg/kg", "mechanism"],
      },
      {
        authors: "Mlost J, et al.",
        title: "Cannabidiol for Pain Treatment: Focus on Pharmacology and Mechanism of Action",
        journal: "International Journal of Molecular Sciences",
        year: 2020,
        doseInfo: "Revisão mecanismos CB1/CB2/TRPV1 · sinergia com terpenos",
        doi: "10.3390/ijms21228870",
        tags: ["mechanism", "full-spectrum"],
      },
    ],
  },

  // ═══ FIBROMIALGIA ═══
  {
    pathology: "Fibromialgia",
    doseReference: "2,5–5 mg/kg/dia · doses <50 mg/d insuficientes",
    refs: [
      {
        authors: "Boehnke KF, et al.",
        title: "CBD Product Dosing and Decision-Making in Fibromyalgia",
        journal: "Journal of Pain",
        year: 2022,
        doseInfo: "n=878 · doses <50 mg/d insuficientes · suporte para doses maiores por peso",
        doi: "10.1016/j.jpain.2021.06.007",
        tags: ["mg/kg", "high-dose"],
      },
      {
        authors: "Rasmussen MU, et al.",
        title: "Cannabidiol versus Placebo in Patients with Fibromyalgia: RCT",
        journal: "Annals of the Rheumatic Diseases",
        year: 2025,
        doseInfo: "50 mg/d NÃO superior ao placebo · reforça doses por peso",
        doi: "10.1016/j.ard.2025.07.008",
        tags: ["RCT", "mg/kg"],
      },
      {
        authors: "Ergisi M, et al.",
        title: "Comparison of Cannabis-Based Products for Fibromyalgia: A Cohort Study",
        journal: "Journal of Pain & Palliative Care Pharmacotherapy",
        year: 2024,
        doseInfo: "n=148 · UK Medical Cannabis Registry · cannabis-based products",
        doi: "10.1080/15360288.2024.2414073",
        tags: ["cohort", "full-spectrum"],
      },
    ],
  },

  // ═══ CÂNCER / CUIDADOS PALIATIVOS ═══
  {
    pathology: "Câncer / Cuidados paliativos",
    doseReference: "2,5–5 mg/kg/dia · até 300 mg/d em paliativos",
    refs: [
      {
        authors: "Good P, et al.",
        title: "A Phase 2 Placebo-Controlled Trial of CBD in Patients with Advanced Cancer",
        journal: "Journal of Pain and Symptom Management",
        year: 2022,
        doseInfo: "Até 300 mg/dia · bem tolerado · melhora de sintomas em câncer avançado",
        doi: "10.1016/j.jpainsymman.2022.09.004",
        tags: ["RCT", "high-dose"],
      },
      {
        authors: "Aviram J, Samuelly-Leichtag G.",
        title: "Efficacy of Cannabis-Based Medicines for Pain Management: A Systematic Review",
        journal: "Journal of Pain Research",
        year: 2017,
        doseInfo: "THC+CBD superiores ao CBD isolado em dor oncológica · justifica espectro completo",
        doi: "10.2147/JPR.S145928",
        tags: ["full-spectrum", "systematic-review"],
      },
      {
        authors: "Wang L, et al.",
        title: "Medical Cannabis or Cannabinoids for Chronic Cancer-Related Pain: Meta-analysis of RCTs",
        journal: "BMJ",
        year: 2021,
        doseInfo: "Meta-análise · redução de dor relacionada a câncer",
        doi: "10.1136/bmj.n1034",
        tags: ["meta-analysis", "RCT"],
      },
    ],
  },

  // ═══ INSÔNIA ═══
  {
    pathology: "Insônia",
    doseReference: "2,5–5 mg/kg/dia · 150 mg à noite com evidência forte",
    refs: [
      {
        authors: "Narayan AJ, et al.",
        title: "Cannabidiol for Moderate-Severe Insomnia: A Randomized Controlled Pilot Trial of 150 mg Nightly",
        journal: "Journal of Clinical Sleep Medicine",
        year: 2024,
        doseInfo: "150 mg/noite · RCT · melhora significativa do sono",
        doi: "10.5664/jcsm.10998",
        tags: ["RCT"],
      },
      {
        authors: "AminiLari M, et al.",
        title: "Medical Cannabis and Cannabinoids for Impaired Sleep: A Systematic Review and Meta-Analysis of RCTs",
        journal: "Sleep",
        year: 2022,
        doseInfo: "Meta-análise · canabinoides em distúrbios do sono",
        doi: "10.1093/sleep/zsab234",
        url: "https://pubmed.ncbi.nlm.nih.gov/34546363/",
        tags: ["meta-analysis", "RCT"],
      },
      {
        authors: "Kolla BP, et al.",
        title: "The Effects of Cannabinoids on Sleep",
        journal: "Journal of Primary Care & Community Health",
        year: 2022,
        doseInfo: "Revisão de efeitos sobre arquitetura do sono",
        doi: "10.1177/21501319221081277",
        url: "https://pubmed.ncbi.nlm.nih.gov/35459406/",
        tags: ["review"],
      },
      {
        authors: "Lavender I, et al.",
        title: "Cannabinoids, Insomnia, and Other Sleep Disorders",
        journal: "Chest",
        year: 2022,
        doseInfo: "Revisão pulmonologia · canabinoides em apneia e insônia",
        doi: "10.1016/j.chest.2022.04.151",
        url: "https://pubmed.ncbi.nlm.nih.gov/35537535/",
        tags: ["review"],
      },
      {
        authors: "Monti JM, et al.",
        title: "Clinical Management of Sleep and Sleep Disorders With Cannabis and Cannabinoids: Implications to Practicing Psychiatrists",
        journal: "Clinical Neuropharmacology",
        year: 2022,
        doseInfo: "Manejo clínico em psiquiatria · doses e horários ideais",
        doi: "10.1097/WNF.0000000000000494",
        url: "https://pubmed.ncbi.nlm.nih.gov/35221321/",
        tags: ["clinical-guide"],
      },
      {
        authors: "Spanagel R, Bilbao A.",
        title: "Approved Cannabinoids for Medical Purposes — Comparative Systematic Review and Meta-Analysis for Sleep and Appetite",
        journal: "Neuropharmacology",
        year: 2021,
        doseInfo: "Meta-análise comparativa de canabinoides aprovados",
        doi: "10.1016/j.neuropharm.2021.108680",
        url: "https://pubmed.ncbi.nlm.nih.gov/34181977/",
        tags: ["meta-analysis"],
      },
      {
        authors: "Shannon S, et al.",
        title: "Cannabidiol in Anxiety and Sleep: A Large Case Series",
        journal: "The Permanente Journal",
        year: 2019,
        doseInfo: "n=72 · 25 mg/d · melhora sono em 66,7% no 1º mês",
        doi: "10.7812/TPP/18-041",
        tags: ["case-series"],
      },
    ],
  },

  // ═══ DOENÇA DE PARKINSON ═══
  {
    pathology: "Doença de Parkinson",
    doseReference: "2,5–5 mg/kg/dia (75–300 mg/dia)",
    refs: [
      {
        authors: "Chagas MH, et al.",
        title: "CBD Can Improve Complex Sleep-Related Behaviours Associated with Parkinson's Disease",
        journal: "Journal of Clinical Pharmacy and Therapeutics",
        year: 2014,
        doseInfo: "75–300 mg/dia · melhora distúrbios do sono REM e tremores",
        doi: "10.1111/jcpt.12179",
        tags: ["RCT"],
      },
      {
        authors: "Thanabalasingam SJ, et al.",
        title: "Cannabis and Its Derivatives for the Use of Motor Symptoms in Parkinson's Disease: Systematic Review and Meta-analysis",
        journal: "Therapeutic Advances in Neurological Disorders",
        year: 2021,
        doseInfo: "Meta-análise · sintomas motores · canabinoides como adjuvantes",
        doi: "10.1177/17562864211018561",
        url: "https://pubmed.ncbi.nlm.nih.gov/34104218/",
        tags: ["meta-analysis"],
      },
      {
        authors: "Fernández-Ruiz J, et al.",
        title: "Cannabidiol for Neurodegenerative Disorders: A Translational Overview",
        journal: "Frontiers in Pharmacology",
        year: 2020,
        doseInfo: "Doses 150–300 mg/d com efeito neuroprotetor documentado",
        doi: "10.3389/fphar.2020.00593",
        tags: ["review", "mechanism"],
      },
    ],
  },

  // ═══ DOENÇA DE ALZHEIMER ═══
  {
    pathology: "Doença de Alzheimer",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Bahji A, et al.",
        title: "Cannabinoids in the Management of Behavioral, Psychological, and Motor Symptoms of Neurocognitive Disorders: Mixed Studies Systematic Review",
        journal: "Journal of Cannabis Research",
        year: 2022,
        doseInfo: "Revisão mista · sintomas BPSD · canabinoides em demência",
        doi: "10.1186/s42238-022-00118-z",
        url: "https://pubmed.ncbi.nlm.nih.gov/35287749/",
        tags: ["systematic-review"],
      },
      {
        authors: "Xiong Y, Lim CS.",
        title: "Understanding the Modulatory Effects of Cannabidiol on Alzheimer's Disease",
        journal: "Brain Sciences",
        year: 2021,
        doseInfo: "Mecanismos moleculares · neuroinflamação e amiloide",
        doi: "10.3390/brainsci11091211",
        url: "https://pubmed.ncbi.nlm.nih.gov/34573232/",
        tags: ["mechanism"],
      },
      {
        authors: "Bosnjak Kuharic D, et al.",
        title: "Cannabinoids for the Treatment of Dementia",
        journal: "Cochrane Database of Systematic Reviews",
        year: 2021,
        doseInfo: "Revisão Cochrane · necessidade de RCTs maiores",
        doi: "10.1002/14651858.CD012820.pub2",
        url: "https://pubmed.ncbi.nlm.nih.gov/34532852/",
        tags: ["systematic-review", "cochrane"],
      },
      {
        authors: "Zhang XB, et al.",
        title: "Roles of Cannabidiol in the Treatment and Prevention of Alzheimer's Disease by Multi-target Actions",
        journal: "Mini-Reviews in Medicinal Chemistry",
        year: 2022,
        doseInfo: "Ação multi-alvo do CBD em Alzheimer",
        doi: "10.2174/1389557521666210331162017",
        url: "https://pubmed.ncbi.nlm.nih.gov/33797364/",
        tags: ["mechanism", "review"],
      },
      {
        authors: "Watt G, Karl T.",
        title: "In Vivo Evidence for Therapeutic Properties of CBD in Alzheimer's Disease",
        journal: "Frontiers in Pharmacology",
        year: 2017,
        doseInfo: "Revisão neuroproteção · doses 10–50 mg/kg em modelos pré-clínicos",
        doi: "10.3389/fphar.2017.00020",
        tags: ["mg/kg", "preclinical"],
      },
      {
        authors: "Fernández-Ruiz J, et al.",
        title: "Cannabidiol for Neurodegenerative Disorders: A Translational Overview",
        journal: "Frontiers in Pharmacology",
        year: 2020,
        doseInfo: "Doses 150–300 mg/d com efeito neuroprotetor",
        doi: "10.3389/fphar.2020.00593",
        tags: ["review", "mechanism"],
      },
    ],
  },

  // ═══ TOC ═══
  {
    pathology: "TOC (Transtorno Obsessivo Compulsivo)",
    doseReference: "5–15 mg/kg/dia (300–900 mg/dia)",
    refs: [
      {
        authors: "McGuire P, et al.",
        title: "CBD as an Adjunctive Therapy in Schizophrenia: A Multicenter RCT",
        journal: "American Journal of Psychiatry",
        year: 2018,
        doseInfo: "1000 mg/dia · n=88 · alta dose · seguro e eficaz",
        doi: "10.1176/appi.ajp.2017.17030325",
        tags: ["RCT", "high-dose"],
      },
      {
        authors: "Zuardi AW, et al.",
        title: "CBD Monotherapy for Treatment-Resistant Schizophrenia",
        journal: "Journal of Psychopharmacology",
        year: 2006,
        doseInfo: "Até 1280 mg/dia · caso clínico · alta tolerabilidade",
        doi: "10.1177/0269881106060967",
        tags: ["case-report", "high-dose"],
      },
    ],
  },

  // ═══ TRANSTORNOS PSICÓTICOS ═══
  {
    pathology: "Transtornos psicóticos",
    doseReference: "5–15 mg/kg/dia (até 1000 mg/dia)",
    refs: [
      {
        authors: "McGuire P, et al.",
        title: "CBD as an Adjunctive Therapy in Schizophrenia: A Multicenter RCT",
        journal: "American Journal of Psychiatry",
        year: 2018,
        doseInfo: "1000 mg/dia · n=88 · RCT multicêntrico · melhora sintomas positivos",
        doi: "10.1176/appi.ajp.2017.17030325",
        tags: ["RCT", "high-dose"],
      },
      {
        authors: "Zuardi AW, et al.",
        title: "CBD Monotherapy for Treatment-Resistant Schizophrenia",
        journal: "Journal of Psychopharmacology",
        year: 2006,
        doseInfo: "Até 1280 mg/dia · caso clínico documentado",
        doi: "10.1177/0269881106060967",
        tags: ["case-report"],
      },
      {
        authors: "Kirkland AE, et al.",
        title: "A Scoping Review of the Use of Cannabidiol in Psychiatric Disorders",
        journal: "Psychiatry Research",
        year: 2022,
        doseInfo: "Revisão · doses 300–1000 mg/d em transtornos psiquiátricos",
        doi: "10.1016/j.psychres.2021.114347",
        url: "https://pubmed.ncbi.nlm.nih.gov/34952255/",
        tags: ["scoping-review"],
      },
    ],
  },

  // ═══ ESCLEROSE MÚLTIPLA ═══
  {
    pathology: "Esclerose múltipla",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Collin C, et al.",
        title: "Randomized Controlled Trial of Cannabis-Based Medicine in Spasticity Caused by Multiple Sclerosis",
        journal: "European Journal of Neurology",
        year: 2007,
        doseInfo: "Sativex CBD+THC · doses equivalentes 5 mg/kg/d · espasticidade",
        doi: "10.1111/j.1468-1331.2007.01878.x",
        tags: ["RCT", "full-spectrum"],
      },
      {
        authors: "Zajicek J, et al.",
        title: "Cannabinoids for Treatment of Spasticity and Other Symptoms Related to Multiple Sclerosis (CAMS Study)",
        journal: "Lancet",
        year: 2003,
        doseInfo: "n=630 · redução de espasticidade com canabinoides · estudo CAMS",
        doi: "10.1016/S0140-6736(03)14738-1",
        tags: ["RCT", "full-spectrum"],
      },
    ],
  },

  // ═══ TRANSTORNO DO PÂNICO ═══
  {
    pathology: "Transtorno do pânico",
    doseReference: "3–8 mg/kg/dia (150–600 mg/dia)",
    refs: [
      {
        authors: "Han K, et al.",
        title: "Therapeutic Potential of CBD in Anxiety Disorders: Systematic Review and Meta-Analysis",
        journal: "Psychiatry Research",
        year: 2024,
        doseInfo: "25–800 mg/dia · 8 RCTs · n=316 · efeito g=-0.92",
        doi: "10.1016/j.psychres.2024.116049",
        tags: ["meta-analysis", "RCT"],
      },
      {
        authors: "Bolsoni LM, et al.",
        title: "Effects of Cannabidiol on Symptoms Induced by the Recall of Traumatic Events in Patients with Posttraumatic Stress Disorder",
        journal: "Psychopharmacology",
        year: 2022,
        doseInfo: "300 mg/d · TEPT · modulação de memórias traumáticas",
        doi: "10.1007/s00213-021-06043-y",
        url: "https://pubmed.ncbi.nlm.nih.gov/35029706/",
        tags: ["RCT", "trauma"],
      },
      {
        authors: "Steardo L Jr, et al.",
        title: "Endocannabinoid System as Therapeutic Target of PTSD: A Systematic Review",
        journal: "Life (Basel)",
        year: 2021,
        doseInfo: "Sistema endocanabinoide em TEPT · alvo terapêutico",
        doi: "10.3390/life11030214",
        url: "https://pubmed.ncbi.nlm.nih.gov/33803374/",
        tags: ["systematic-review", "mechanism"],
      },
    ],
  },

  // ═══ ENXAQUECA CRÔNICA ═══
  {
    pathology: "Enxaqueca crônica",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Mohammed SY, et al.",
        title: "Effectiveness of CBD to Manage Chronic Pain: A Systematic Review",
        journal: "Pain Management Nursing",
        year: 2024,
        doseInfo: "15 estudos · redução de dor 42–66% · inclui enxaqueca",
        doi: "10.1016/j.pmn.2023.10.002",
        tags: ["systematic-review"],
      },
      {
        authors: "Wang L, et al.",
        title: "Medical Cannabis or Cannabinoids for Chronic Non-Cancer Related Pain: Systematic Review and Meta-analysis",
        journal: "BMJ",
        year: 2021,
        doseInfo: "32 RCTs · meta-análise · canabinoides em dor crônica",
        doi: "10.1136/bmj.n1034",
        tags: ["meta-analysis"],
      },
    ],
  },

  // ═══ TDAH ═══
  {
    pathology: "TDAH",
    doseReference: "2,5–5 mg/kg/dia (300–400 mg/dia em adultos)",
    refs: [
      {
        authors: "Arnold JC, et al.",
        title: "Safety and Efficacy of Low Oral Doses of CBD",
        journal: "Clinical and Translational Science",
        year: 2023,
        doseInfo: "300–400 mg/dia com melhor evidência clínica",
        doi: "10.1111/cts.13425",
        tags: ["systematic-review"],
      },
    ],
  },

  // ═══ TRANSTORNO BIPOLAR ═══
  {
    pathology: "Transtorno bipolar",
    doseReference: "2,5–5 mg/kg/dia (150–600 mg/dia)",
    refs: [
      {
        authors: "Melas PA, et al.",
        title: "CBD as Potential Treatment for Anxiety and Mood Disorders: Molecular Targets and Epigenetic Insights",
        journal: "International Journal of Molecular Sciences",
        year: 2021,
        doseInfo: "Doses terapêuticas 150–600 mg/d para distúrbios do humor",
        doi: "10.3390/ijms22041863",
        tags: ["mechanism"],
      },
      {
        authors: "de Aquino JP, et al.",
        title: "CBD and Brain Circuits Implicated in Stress-Related Disorders",
        journal: "Frontiers in Neuroscience",
        year: 2020,
        doseInfo: "Mecanismo 5-HT1A · doses 150–300 mg/d",
        doi: "10.3389/fnins.2020.00979",
        tags: ["mechanism"],
      },
    ],
  },

  // ═══ NOVAS PATOLOGIAS — adicionadas em 03/2026 ═══

  // ═══ DEPENDÊNCIA QUÍMICA ═══
  {
    pathology: "Dependência química",
    doseReference: "2,5–5 mg/kg/dia (200–800 mg/dia)",
    refs: [
      {
        authors: "Paulus V, et al.",
        title: "Cannabidiol in the Context of Substance Use Disorder Treatment: A Systematic Review",
        journal: "Addictive Behaviors",
        year: 2022,
        doseInfo: "Revisão sistemática · CBD em transtornos por uso de substâncias",
        doi: "10.1016/j.addbeh.2022.107360",
        url: "https://pubmed.ncbi.nlm.nih.gov/35580370/",
        tags: ["systematic-review"],
      },
      {
        authors: "Mongeau-Pérusse V, et al.",
        title: "Cannabidiol Effect on Anxiety Symptoms and Stress Response in Individuals With Cocaine Use Disorder: RCT",
        journal: "Journal of Addiction Medicine",
        year: 2022,
        doseInfo: "RCT · uso de cocaína · ansiedade e estresse",
        doi: "10.1097/ADM.0000000000000962",
        url: "https://pubmed.ncbi.nlm.nih.gov/35135986/",
        tags: ["RCT"],
      },
      {
        authors: "Rizkallah E, et al.",
        title: "Cannabidiol Effects on Cognition in Individuals with Cocaine Use Disorder: RCT",
        journal: "Pharmacology Biochemistry and Behavior",
        year: 2022,
        doseInfo: "Cognição · transtorno por uso de cocaína · seguro",
        doi: "10.1016/j.pbb.2022.173376",
        url: "https://pubmed.ncbi.nlm.nih.gov/35367279/",
        tags: ["RCT"],
      },
      {
        authors: "Morissette F, et al.",
        title: "Exploring CBD Effects on Inflammatory Markers in Individuals with Cocaine Use Disorder: RCT",
        journal: "Neuropsychopharmacology",
        year: 2021,
        doseInfo: "Marcadores inflamatórios · uso de cocaína",
        doi: "10.1038/s41386-021-01098-z",
        url: "https://pubmed.ncbi.nlm.nih.gov/34331010/",
        tags: ["RCT"],
      },
      {
        authors: "Meyer M, et al.",
        title: "Case Report: CBD Cigarettes for Harm Reduction and Adjunctive Therapy in a Patient With Schizophrenia and Substance Use Disorder",
        journal: "Frontiers in Psychiatry",
        year: 2021,
        doseInfo: "Caso clínico · esquizofrenia + uso de substâncias",
        doi: "10.3389/fpsyt.2021.712110",
        url: "https://pubmed.ncbi.nlm.nih.gov/34366942/",
        tags: ["case-report"],
      },
      {
        authors: "Navarrete F, et al.",
        title: "Role of Cannabidiol in the Therapeutic Intervention for Substance Use Disorders",
        journal: "Frontiers in Pharmacology",
        year: 2021,
        doseInfo: "Mecanismos · alvos terapêuticos em dependência",
        doi: "10.3389/fphar.2021.626010",
        url: "https://pubmed.ncbi.nlm.nih.gov/34093179/",
        tags: ["mechanism", "review"],
      },
    ],
  },

  // ═══ ENDOMETRIOSE / DOR PÉLVICA ═══
  {
    pathology: "Endometriose / Dor pélvica",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Liang AL, et al.",
        title: "Medical Cannabis for Gynecologic Pain Conditions: A Systematic Review",
        journal: "Obstetrics & Gynecology",
        year: 2022,
        doseInfo: "Revisão sistemática · dor ginecológica · canabinoides",
        doi: "10.1097/AOG.0000000000004656",
        url: "https://pubmed.ncbi.nlm.nih.gov/35104069/",
        tags: ["systematic-review"],
      },
      {
        authors: "Genovese T, et al.",
        title: "Molecular and Biochemical Mechanism of Cannabidiol in the Management of the Inflammatory and Oxidative Processes Associated with Endometriosis",
        journal: "International Journal of Molecular Sciences",
        year: 2022,
        doseInfo: "Mecanismos anti-inflamatórios e antioxidantes em endometriose",
        doi: "10.3390/ijms23105427",
        url: "https://pubmed.ncbi.nlm.nih.gov/35628240/",
        tags: ["mechanism"],
      },
      {
        authors: "Mistry M, et al.",
        title: "Cannabidiol for the Management of Endometriosis and Chronic Pelvic Pain",
        journal: "Journal of Minimally Invasive Gynecology",
        year: 2022,
        doseInfo: "Revisão clínica · endometriose e dor pélvica crônica",
        doi: "10.1016/j.jmig.2021.11.017",
        url: "https://pubmed.ncbi.nlm.nih.gov/34839061/",
        tags: ["review"],
      },
    ],
  },

  // ═══ CLIMATÉRIO / MENOPAUSA ═══
  {
    pathology: "Climatério / Menopausa",
    doseReference: "2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Mejia-Gomez J, et al.",
        title: "The Impact of Cannabis Use on Vasomotor Symptoms, Mood, Insomnia and Sexuality in Perimenopausal and Postmenopausal Women: A Systematic Review",
        journal: "Climacteric",
        year: 2021,
        doseInfo: "Sintomas vasomotores, humor, insônia e sexualidade · revisão sistemática",
        doi: "10.1080/13697137.2021.1881957",
        url: "https://pubmed.ncbi.nlm.nih.gov/33759668/",
        tags: ["systematic-review"],
      },
    ],
  },

  // ═══ DERMATOLOGIA / ACNE / PSORÍASE ═══
  {
    pathology: "Dermatites / Acne / Psoríase",
    doseReference: "Tópico ou oral 2,5–5 mg/kg/dia",
    refs: [
      {
        authors: "Sivesind TE, et al.",
        title: "Cannabinoids for the Treatment of Dermatologic Conditions",
        journal: "JID Innovations",
        year: 2022,
        doseInfo: "Revisão dermatológica · acne, psoríase, dermatite atópica",
        doi: "10.1016/j.xjidi.2022.100095",
        url: "https://pubmed.ncbi.nlm.nih.gov/35199092/",
        tags: ["review"],
      },
      {
        authors: "Peyravian N, et al.",
        title: "The Anti-Inflammatory Effects of Cannabidiol (CBD) on Acne",
        journal: "Journal of Inflammation Research",
        year: 2022,
        doseInfo: "Efeitos anti-inflamatórios em acne",
        doi: "10.2147/JIR.S355489",
        url: "https://pubmed.ncbi.nlm.nih.gov/35535052/",
        tags: ["mechanism"],
      },
      {
        authors: "Kong HE, et al.",
        title: "Cannabinoids in Dermatologic Surgery",
        journal: "Journal of the American Academy of Dermatology",
        year: 2021,
        doseInfo: "Aplicações em cirurgia dermatológica",
        doi: "10.1016/j.jaad.2020.12.061",
        url: "https://pubmed.ncbi.nlm.nih.gov/33422628/",
        tags: ["clinical"],
      },
      {
        authors: "Sheriff T, et al.",
        title: "The Potential Role of Cannabinoids in Dermatology",
        journal: "Journal of Dermatological Treatment",
        year: 2020,
        doseInfo: "Revisão geral · canabinoides em dermatologia",
        doi: "10.1080/09546634.2019.1675854",
        url: "https://pubmed.ncbi.nlm.nih.gov/31599175/",
        tags: ["review"],
      },
      {
        authors: "Baswan SM, et al.",
        title: "Therapeutic Potential of Cannabidiol (CBD) for Skin Health and Disorders",
        journal: "Clinical, Cosmetic and Investigational Dermatology",
        year: 2020,
        doseInfo: "Revisão · saúde da pele · uso terapêutico",
        doi: "10.2147/CCID.S286411",
        url: "https://pubmed.ncbi.nlm.nih.gov/33335413/",
        tags: ["review"],
      },
      {
        authors: "Tóth KF, et al.",
        title: "Cannabinoid Signaling in the Skin: Therapeutic Potential of the C(ut)annabinoid System",
        journal: "Molecules",
        year: 2019,
        doseInfo: "Sistema canabinoide cutâneo · alvos terapêuticos",
        doi: "10.3390/molecules24050918",
        url: "https://pubmed.ncbi.nlm.nih.gov/30845666/",
        tags: ["mechanism"],
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

/** Build a PubMed search URL from a DOI (or use the explicit url if provided). */
export function pubmedUrlForDoi(doi: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(doi)}`;
}

/** Resolve the best external link for a reference. */
export function externalUrlForRef(r: ScientificReference): string {
  if (r.url) return r.url;
  return pubmedUrlForDoi(r.doi);
}

/** Build a DOI link to doi.org for direct journal access. */
export function doiOrgUrl(doi: string): string {
  return `https://doi.org/${encodeURIComponent(doi)}`;
}

/** Get all unique tags across the entire base. */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  [...GENERAL_REFERENCES, ...PATHOLOGY_REFERENCES.flatMap((p) => p.refs)].forEach((r) => {
    r.tags?.forEach((t) => tags.add(t));
  });
  return Array.from(tags).sort();
}

/** Total count of references across the entire base. */
export function totalReferenceCount(): number {
  return GENERAL_REFERENCES.length + PATHOLOGY_REFERENCES.reduce((sum, p) => sum + p.refs.length, 0);
}

/** Search across the entire base by free text (title, authors, journal, doi, dose, tags). */
export function searchAllReferences(term: string): Array<{ pathology: string | null; ref: ScientificReference }> {
  if (!term.trim()) return [];
  const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const matches = (r: ScientificReference) => {
    const haystack = `${r.authors} ${r.title} ${r.journal} ${r.doi} ${r.doseInfo} ${(r.tags || []).join(" ")}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return haystack.includes(t);
  };

  const results: Array<{ pathology: string | null; ref: ScientificReference }> = [];
  PATHOLOGY_REFERENCES.forEach((p) => {
    p.refs.filter(matches).forEach((ref) => results.push({ pathology: p.pathology, ref }));
  });
  GENERAL_REFERENCES.filter(matches).forEach((ref) => results.push({ pathology: null, ref }));
  return results.sort((a, b) => b.ref.year - a.ref.year);
}
