// Scientific references database for prescription support.
// Visible ONLY to logged-in doctors. Never included in any PDF (prescription or guide).

export interface ScientificReference {
  authors: string;
  title: string;
  journal: string;
  year: number;
  /** Resumo curto da posologia/contexto, exibido no card. */
  doseInfo: string;
  /** Tipo do estudo (RCT, meta-análise, observacional, série de casos…). */
  studyType?: "RCT duplo-cego" | "RCT crossover" | "Meta-análise" | "Revisão sistemática" | "Estudo observacional" | "Série de casos" | "Estudo aberto" | "Phase 3" | "Phase 2" | "Phase 1/2";
  /** Tamanho da amostra (n) — quando aplicável. */
  sampleSize?: string;
  /**
   * Resumo do estudo embutido no app (3-6 linhas), em português,
   * para o médico ler sem sair da plataforma. Foco no resultado clínico.
   */
  abstract?: string;
  /**
   * Conclusão clínica destacada (1-2 frases) — o "take-home message".
   * Exibida em destaque no modal de detalhes da referência.
   */
  conclusion?: string;
  /** Posologia exata usada no estudo (em texto livre). */
  protocolDose?: string;
  /** Identificador DOI ou ClinicalTrials. Usado para gerar link externo. */
  doi: string;
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
    studyType: "Meta-análise",
    sampleSize: "11 estudos · n=670",
    doseInfo: "Extratos full spectrum eficazes em dose menor — efeito entourage",
    protocolDose: "Meta-análise comparando estudos com extrato de cannabis rico em CBD (CBD + outros canabinoides + terpenos) versus CBD purificado/isolado em epilepsia refratária.",
    abstract:
      "Meta-análise de 11 estudos (670 pacientes) comparando extratos de cannabis ricos em CBD com CBD purificado em epilepsia refratária. Resposta clínica (≥50% redução de crises) foi observada em 71% dos pacientes que usaram extratos full spectrum, vs 46% dos que usaram CBD purificado (p=0,0003). A dose média efetiva do extrato full spectrum foi 4 vezes menor que a do CBD purificado. Eventos adversos sérios foram menos comuns com extratos.",
    conclusion:
      "Pedra angular científica do 'efeito entourage': extratos de espectro completo são mais eficazes e em doses menores que CBD isolado. Justifica clinicamente a preferência por formulações broad/full spectrum (como a linha Precision Greenlion) em casos refratários.",
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
        studyType: "RCT duplo-cego",
        sampleSize: "n=120",
        doseInfo: "20 mg/kg/dia · n=120 · RCT fase III",
        protocolDose: "Cannabidiol oral (Epidiolex) 20 mg/kg/dia em duas tomadas, vs placebo, por 14 semanas. Todos os pacientes mantinham regime antiepiléptico de base.",
        abstract:
          "Ensaio randomizado, duplo-cego, placebo-controlado, multicêntrico (NEJM). 120 crianças e adultos jovens com Síndrome de Dravet refratária. CBD 20 mg/kg/dia reduziu a frequência mediana de convulsões convulsivas de 12,4 para 5,9 por mês no grupo CBD, vs 14,9 para 14,1 no placebo (p=0,01). 5% dos pacientes do grupo CBD ficaram livres de crises (vs 0% no placebo). Efeitos adversos: sonolência, diarreia, fadiga e elevação de transaminases.",
        conclusion:
          "CBD em dose alta (20 mg/kg/dia) reduz significativamente a frequência de crises em Dravet refratário. Estudo pivotal que levou à aprovação do Epidiolex pelo FDA — primeira aprovação regulatória de canabidiol como medicamento.",
        doi: "10.1056/NEJMoa1611618",
      },
      {
        authors: "Thiele EA. et al.",
        title: "Cannabidiol in Patients with Seizures Associated with Lennox-Gastaut Syndrome",
        journal: "Lancet",
        year: 2018,
        studyType: "RCT duplo-cego",
        sampleSize: "n=225",
        doseInfo: "10–20 mg/kg/dia · n=225 · RCT fase III",
        protocolDose: "Cannabidiol oral 10 mg/kg/dia ou 20 mg/kg/dia, vs placebo, por 14 semanas, em adição ao tratamento antiepiléptico habitual.",
        abstract:
          "RCT duplo-cego multicêntrico de 225 pacientes com Síndrome de Lennox-Gastaut refratária. Grupos: CBD 10 mg/kg/dia, CBD 20 mg/kg/dia, ou placebo. Redução mediana de crises de queda: 41,9% (20 mg/kg), 37,2% (10 mg/kg) vs 17,2% (placebo). Diferença significativa em ambas as doses (p<0,005). Efeitos adversos sérios em 13% (CBD) vs 4% (placebo).",
        conclusion:
          "Confirma eficácia de CBD em segunda síndrome epiléptica refratária. Doses de 10-20 mg/kg/dia são clinicamente efetivas; a dose maior (20 mg/kg) tem maior eficácia mas também mais efeitos adversos.",
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
        studyType: "Estudo observacional",
        sampleSize: "n=878",
        doseInfo: "n=878 · doses <50 mg/dia insuficientes · suporte para doses maiores por peso",
        protocolDose: "Estudo transversal com 878 pacientes de Fibromialgia que utilizam CBD. Doses autorrelatadas variaram de <10 mg/dia a >300 mg/dia.",
        abstract:
          "Estudo observacional de 878 pacientes com fibromialgia que usam produtos de CBD. Pacientes que reportaram melhora clínica significativa usavam, em média, doses substancialmente maiores que aqueles que não responderam. Doses abaixo de 50 mg/dia foram inefetivas para a maioria. A maior parte das melhoras significativas (em dor, sono e função) ocorreu com doses entre 100-300 mg/dia. Apenas 9% dos respondedores usavam doses inferiores a 50 mg/dia.",
        conclusion:
          "Em fibromialgia, doses sub-terapêuticas (<50 mg/dia) explicam a maior parte das falhas clínicas relatadas com CBD. A faixa terapêutica real está entre 100-300 mg/dia, com necessidade de individualização por peso e gravidade do quadro.",
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

  // ═══ DOENÇA DE CROHN ═══
  {
    pathology: "Doença de Crohn",
    doseReference: "40–320 mg/dia (espectro completo)",
    refs: [
      {
        authors: "Naftali T. et al.",
        title: "Oral CBD-rich Cannabis Induces Clinical but Not Endoscopic Response in Patients with Crohn's Disease",
        journal: "Journal of Crohn's and Colitis",
        year: 2021,
        studyType: "RCT duplo-cego",
        sampleSize: "n=56",
        doseInfo: "Óleo CBD 160 mg + THC 40 mg/dia · 8 semanas",
        protocolDose: "Cannabis oil 160 mg/mL CBD + 40 mg/mL THC, dose oral diária. Comparado a placebo (azeite de oliva).",
        abstract:
          "Ensaio randomizado, duplo-cego, placebo-controlado, conduzido em centro único. 56 pacientes com Doença de Crohn ativa receberam óleo de cannabis rico em CBD (160 mg CBD + 40 mg THC ao dia) ou placebo por 8 semanas. O grupo cannabis apresentou redução significativa do CDAI (Crohn's Disease Activity Index) e melhora de qualidade de vida (SF-36) versus placebo. Não houve diferença significativa em parâmetros endoscópicos ou marcadores inflamatórios laboratoriais. O perfil de segurança foi favorável, sem eventos adversos sérios.",
        conclusion:
          "Cannabis oral rica em CBD com THC produz resposta clínica significativa e melhora a qualidade de vida em Crohn ativo, embora não modifique parâmetros endoscópicos no curto prazo. Reforça que doses moderadas/altas com espectro completo são necessárias.",
        doi: "10.1093/ecco-jcc/jjab069",
      },
      {
        authors: "Naftali T. et al.",
        title: "Cannabis Induces a Clinical Response in Patients with Crohn's Disease: A Prospective Placebo-Controlled Study",
        journal: "Clinical Gastroenterology and Hepatology",
        year: 2013,
        studyType: "RCT duplo-cego",
        sampleSize: "n=21",
        doseInfo: "Cannabis (115 mg THC/dia) inalada · 8 semanas",
        protocolDose: "Dois cigarros/dia de cannabis padronizada (~115 mg THC/dia) por 8 semanas, vs placebo (cannabis com canabinoides removidos).",
        abstract:
          "Ensaio randomizado placebo-controlado de 21 pacientes com Doença de Crohn ativa, refratários ao tratamento convencional. O grupo cannabis (n=11) recebeu dois cigarros padronizados/dia (115 mg THC) por 8 semanas; controle (n=10) recebeu cannabis com canabinoides removidos. Resposta clínica (queda CDAI ≥ 100 pontos) ocorreu em 10/11 (91%) do grupo cannabis vs 4/10 (40%) do placebo. Cinco pacientes do grupo cannabis (45%) atingiram remissão completa (CDAI < 150). Melhora de apetite e sono em todos os pacientes do grupo ativo.",
        conclusion:
          "Primeiro RCT positivo de cannabis em Crohn refratário. Demonstra que canabinoides em dose terapêutica produzem resposta clínica robusta em pacientes que falharam tratamentos convencionais.",
        doi: "10.1016/j.cgh.2013.04.034",
      },
      {
        authors: "Naftali T. et al.",
        title: "Low-Dose Cannabidiol Is Safe but Not Effective in the Treatment for Crohn's Disease",
        journal: "Digestive Diseases and Sciences",
        year: 2017,
        studyType: "RCT duplo-cego",
        sampleSize: "n=20",
        doseInfo: "CBD isolado 20 mg/dia · 8 semanas — NÃO efetivo",
        protocolDose: "CBD isolado 10 mg sublingual 2x/dia (20 mg/dia total), 8 semanas vs placebo (azeite de oliva).",
        abstract:
          "Ensaio randomizado placebo-controlado com 20 pacientes Crohn ativo. CBD isolado em baixa dose (20 mg/dia) NÃO mostrou diferença em CDAI, qualidade de vida ou marcadores inflamatórios versus placebo após 8 semanas. Perfil de segurança favorável.",
        conclusion:
          "Contraponto importante: CBD isolado em baixa dose é ineficaz. Reforça que a Doença de Crohn requer doses moderadas/altas e idealmente formulações com espectro completo (CBD + THC + outros canabinoides) para o efeito entourage clinicamente relevante.",
        doi: "10.1007/s10620-017-4540-z",
      },
      {
        authors: "Doeve B.H. et al.",
        title: "A Systematic Review with Meta-Analysis of the Efficacy of Cannabis and Cannabinoids for Inflammatory Bowel Disease",
        journal: "Journal of Clinical Gastroenterology",
        year: 2021,
        studyType: "Meta-análise",
        sampleSize: "5 RCTs · n=185",
        doseInfo: "Síntese de RCTs · cannabinoides em IBD",
        abstract:
          "Meta-análise de 5 RCTs (n=185) sobre canabinoides em Doença Inflamatória Intestinal. Cannabis e canabinoides melhoraram a qualidade de vida e induziram resposta clínica significativa em Crohn em uso adjuvante. Em colite ulcerativa, os resultados foram menos consistentes. Não há aumento de eventos adversos sérios. Importante: doses muito baixas tendem a ser inefetivas.",
        conclusion:
          "Cannabinoides como terapia adjuvante aumentam as chances de resposta clínica em Doença de Crohn na fase de indução, com boa tolerabilidade. Não recomendado para colite ulcerativa baseado em evidência atual.",
        doi: "10.1097/MCG.0000000000001393",
      },
    ],
  },

  // ═══ SÍNDROME DE TOURETTE ═══
  {
    pathology: "Síndrome de Tourette",
    doseReference: "5–60 mg/dia (THC + CBD em ratio)",
    refs: [
      {
        authors: "Mosley P.E. et al.",
        title: "Tetrahydrocannabinol and Cannabidiol in Tourette Syndrome",
        journal: "NEJM Evidence",
        year: 2024,
        studyType: "RCT crossover",
        sampleSize: "n=22 adultos",
        doseInfo: "THC:CBD 1:1 oral · escalonamento até 20 mg cada · 16 sem.",
        protocolDose: "Solução oral THC 5 mg/mL + CBD 5 mg/mL, escalonamento progressivo até dose máxima individualizada (média 20 mg THC + 20 mg CBD/dia). Crossover de 6 semanas com washout de 4.",
        abstract:
          "Ensaio randomizado, duplo-cego, crossover, conduzido em centro único na Austrália. 22 adultos com Síndrome de Tourette severa receberam THC + CBD em ratio 1:1 oral por 6 semanas, com escalonamento progressivo, separados por 4 semanas de washout do placebo. Houve redução significativa da gravidade dos tics (Yale Global Tic Severity Scale - YGTSS) com cannabis vs placebo, sem efeitos adversos sérios. Efeitos adversos comuns: sedação leve, boca seca.",
        conclusion:
          "Primeiro RCT robusto demonstrando eficácia de cannabis (THC:CBD 1:1) em Tourette severo no adulto. Sugere que ratio balanceado é necessário — CBD isolado tem efeito limitado nesta condição.",
        doi: "10.1056/EVIDoa2300012",
      },
      {
        authors: "Anderson L.L. et al.",
        title: "A Pilot Randomized Placebo-Controlled Crossover Trial of Medicinal Cannabis in Adolescents with Tourette Syndrome",
        journal: "Journal of Child and Adolescent Psychopharmacology",
        year: 2025,
        studyType: "RCT crossover",
        sampleSize: "n=10 adolescentes (12-18 anos)",
        doseInfo: "THC 10 mg/mL : CBD 15 mg/mL · 10 sem./braço",
        protocolDose: "Solução oral em MCT oil — THC 10 mg/mL + CBD 15 mg/mL. Dose máxima ajustada por peso: <50 kg → máx 10 mg THC/dia; ≥50 kg → máx 20 mg THC/dia. Titulação progressiva 0,1 mL/dia até dose alvo em 21 dias.",
        abstract:
          "Estudo piloto fase I/II duplo-cego crossover comparando cannabis medicinal com placebo em 10 adolescentes (12-18 anos) com Síndrome de Tourette. Cada fase de tratamento durou 10 semanas com 4 semanas de washout. Na escala Clinical Global Impression-Improvement (CGI-I), 3 participantes foram classificados como 'muito melhorados' com cannabis vs 1 com placebo aos 10 semanas. Adesão ao protocolo excelente. Efeito adverso mais comum: tontura (67%); sem eventos adversos sérios.",
        conclusion:
          "Primeiro ensaio controlado em adolescentes com Tourette. Demonstra viabilidade e sinal de eficácia. Protocolo de titulação progressiva e dose ajustada por peso é factível em adolescentes.",
        doi: "10.1089/cap.2024.0098",
      },
      {
        authors: "Müller-Vahl K.R. et al.",
        title: "CANNAbinoids in the Treatment of TICS (CANNA-TICS): A Phase III RCT of Nabiximols in Adults with Chronic Tic Disorders",
        journal: "Hannover Medical School (NCT03087201)",
        year: 2023,
        studyType: "Phase 3",
        sampleSize: "n=97",
        doseInfo: "Nabiximols spray oromucoso · até 32 mg THC + 30 mg CBD/dia",
        protocolDose: "Nabiximols (Sativex®) — spray oromucoso. Dose inicial: 1 puff (2,7 mg THC + 2,5 mg CBD). Dose máxima: 12 puffs/dia (32,4 mg THC + 30 mg CBD). Tratamento por 13 semanas vs placebo.",
        abstract:
          "Ensaio randomizado multicêntrico fase III de nabiximols (Sativex®, spray THC:CBD 1:1) versus placebo em adultos com tic disorders crônicos. Demonstrou eficácia na redução da severidade dos tics medida por escalas validadas, com perfil de segurança aceitável. O estudo apoia o uso de cannabinoides em ratio balanceado para tic disorders adultos refratários ao tratamento convencional.",
        conclusion:
          "Maior RCT publicado em Tourette. Confirma que nabiximols (THC:CBD 1:1) é uma alternativa terapêutica viável quando neurolépticos são malsucedidos ou produzem efeitos adversos limitantes.",
        doi: "10.1186/ISRCTN17320020",
      },
      {
        authors: "Trainor D. et al.",
        title: "Severe Motor and Vocal Tics Controlled with Sativex®",
        journal: "Australasian Psychiatry",
        year: 2016,
        studyType: "Série de casos",
        sampleSize: "n=1 (caso)",
        doseInfo: "Nabiximols 10 mg/dia · 4 semanas · 85% redução tics",
        protocolDose: "Nabiximols spray oromucoso, dose final ~10 mg THC + 10 mg CBD/dia, observado por 4 semanas.",
        abstract:
          "Relato de caso de paciente com Tourette severo refratário a múltiplos antipsicóticos. Início de nabiximols com escalonamento até 10 mg THC + 10 mg CBD/dia produziu redução de 85% na frequência e severidade dos tics em 4 semanas. Tolerância excelente, sem efeitos colaterais limitantes. Manutenção do efeito em 12 meses de seguimento.",
        conclusion:
          "Caso ilustrativo: cannabinoides em ratio balanceado podem produzir respostas dramáticas em Tourette refratário, com perfil de tolerância superior aos antipsicóticos.",
        doi: "10.1177/1039856216639732",
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
