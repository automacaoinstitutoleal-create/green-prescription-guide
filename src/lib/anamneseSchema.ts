// ═══════════════════════════════════════════════════════════════════
// Anamnese Expandida — Judicialização
//
// Schema do formulário que o médico preenche durante a consulta para
// gerar o Relatório Médico Circunstanciado, atendendo:
//
//   • Tema 106 STJ (REsp 1.657.156/RJ): laudo médico fundamentado
//     comprovando imprescindibilidade + ineficácia de fármacos do SUS
//   • Tema 1161 STF (RE 1.165.959): fornecimento de medicamento sem
//     registro com importação autorizada pela ANVISA
//   • Tema 1234 STF: competência da Justiça Estadual
//
// Cada seção do schema corresponde a um bloco do PDF gerado.
// ═══════════════════════════════════════════════════════════════════

export type FieldType = "text" | "textarea" | "date" | "select" | "multi-text" | "yes-no" | "yes-no-na";

export interface AnamneseField {
  /** Identifier used in state. */
  id: string;
  /** Question shown to the doctor. */
  label: string;
  /** Field type — how it renders. */
  type: FieldType;
  /** Optional helper hint shown below the input. */
  hint?: string;
  /** Optional placeholder. */
  placeholder?: string;
  /** For 'select' type: options. */
  options?: string[];
  /** Whether the field is required for the report to be considered complete. */
  required?: boolean;
  /** When true, this field is auto-filled from existing patient/prescription data. */
  autofill?: boolean;
}

export interface AnamneseSection {
  id: string;
  title: string;
  description?: string;
  /** Whether the entire section can be hidden when not relevant. */
  collapsible?: boolean;
  fields: AnamneseField[];
}

/**
 * Schema completo da anamnese.
 * Total: ~50 campos distribuídos em 9 seções clínicas.
 */
export const ANAMNESE_SCHEMA: AnamneseSection[] = [
  // ═══ 1. HISTÓRIA DA DOENÇA ATUAL ═══
  {
    id: "historia",
    title: "1. História da Doença Atual",
    description: "Quando começou, como evoluiu, sintomas atuais. Fundamental para demonstrar a cronicidade e a gravidade.",
    fields: [
      {
        id: "inicio_sintomas",
        label: "Quando começaram os sintomas?",
        type: "text",
        placeholder: "Ex.: há 3 anos, em janeiro de 2023",
        required: true,
      },
      {
        id: "evolucao",
        label: "Como a condição evoluiu desde o início?",
        type: "textarea",
        placeholder: "Descreva progressão, fases de melhora/piora, gatilhos identificados...",
        required: true,
      },
      {
        id: "sintomas_atuais",
        label: "Quais são os sintomas atuais e sua intensidade?",
        type: "textarea",
        placeholder: "Liste sintomas com frequência, duração e intensidade (escala se aplicável)",
        required: true,
      },
      {
        id: "impacto_funcional",
        label: "Qual o impacto na vida diária do paciente?",
        type: "textarea",
        hint: "Capacidade laboral, social, autonomia, sono, alimentação, autocuidado.",
        placeholder: "Ex.: paciente afastado do trabalho há 8 meses, dependente de cuidador para AVDs...",
        required: true,
      },
      {
        id: "exames_realizados",
        label: "Quais exames complementares foram realizados?",
        type: "textarea",
        hint: "Laboratoriais, imagens, eletrofisiológicos, escalas validadas.",
        placeholder: "Ex.: RM crânio (data); polissonografia (data); HAM-A 28; PHQ-9 19...",
      },
    ],
  },

  // ═══ 2. ANTECEDENTES E COMORBIDADES ═══
  {
    id: "antecedentes",
    title: "2. Antecedentes e Comorbidades",
    description: "Outras doenças, alergias, internações, contexto familiar relevante.",
    fields: [
      {
        id: "comorbidades",
        label: "Comorbidades clínicas relevantes",
        type: "textarea",
        placeholder: "Ex.: hipertensão controlada, diabetes tipo 2, depressão maior...",
      },
      {
        id: "alergias",
        label: "Alergias medicamentosas conhecidas",
        type: "text",
        placeholder: "Ex.: dipirona, penicilina; ou 'nega'",
      },
      {
        id: "antecedentes_familiares",
        label: "Antecedentes familiares relevantes",
        type: "textarea",
        placeholder: "História familiar de doenças neurológicas, psiquiátricas, genéticas relevantes ao caso",
      },
      {
        id: "internacoes",
        label: "Internações ou cirurgias prévias relacionadas",
        type: "textarea",
        placeholder: "Datas, motivos, desfechos",
      },
    ],
  },

  // ═══ 3. TRATAMENTOS PRÉVIOS — CRÍTICO PARA TEMA 106 ═══
  {
    id: "tratamentos_previos",
    title: "3. Tratamentos Prévios Tentados (Crítico — Tema 106 STJ)",
    description: "Liste TODOS os medicamentos do SUS já testados, com dose, duração e motivo da falha. É o ponto mais escrutinado pelo NATJUS.",
    fields: [
      {
        id: "tratamentos_lista",
        label: "Medicamentos/terapias já utilizadas (incluir os disponíveis no SUS)",
        type: "textarea",
        hint: "Para cada um: nome, dose máxima atingida, duração, motivo da suspensão (ineficácia / efeitos adversos / contraindicação).",
        placeholder: "Ex.:\n• Sertralina 200 mg/dia por 8 meses — ineficácia parcial e ganho de peso de 12 kg\n• Clonazepam 4 mg/dia por 4 meses — sedação excessiva, queda postural\n• Quetiapina 300 mg/dia por 6 meses — síndrome metabólica\n• TCC semanal por 18 meses — sem resposta adequada",
        required: true,
      },
      {
        id: "tentativas_sus",
        label: "O paciente tentou as alternativas oferecidas pelo SUS / RENAME?",
        type: "yes-no",
        required: true,
      },
      {
        id: "ineficacia_sus_justificativa",
        label: "Justifique a ineficácia ou inadequação dos fármacos do SUS",
        type: "textarea",
        hint: "Esta resposta é CRÍTICA — é o que o juiz mais analisa. Seja específico: por que cada classe falhou neste paciente?",
        placeholder: "Ex.: ISRS, ISRSN e benzodiazepínicos foram tentados sem resposta clínica satisfatória. Antipsicóticos atípicos geraram síndrome metabólica grave. As alternativas RENAME foram esgotadas conforme detalhado acima...",
        required: true,
      },
      {
        id: "efeitos_adversos_previos",
        label: "Houve efeitos adversos significativos com os tratamentos anteriores?",
        type: "textarea",
        placeholder: "Descreva efeitos adversos limitantes (síndrome metabólica, sedação excessiva, ganho de peso, sintomas extrapiramidais...)",
      },
    ],
  },

  // ═══ 4. JUSTIFICATIVA DO TRATAMENTO COM CANABIDIOL ═══
  {
    id: "justificativa_cbd",
    title: "4. Justificativa Clínica do Canabidiol",
    description: "Por que o canabidiol é a alternativa terapêutica adequada neste caso específico.",
    fields: [
      {
        id: "fundamento_indicacao",
        label: "Fundamento clínico da indicação do canabidiol",
        type: "textarea",
        hint: "Mecanismo de ação relevante para o caso, evidência científica disponível para esta patologia, perfil de segurança comparativo.",
        placeholder: "Ex.: O canabidiol atua via modulação dos receptores CB1/CB2, 5-HT1A e TRPV1, com perfil de segurança superior aos benzodiazepínicos e antipsicóticos. Para fibromialgia, há evidência crescente em estudos como Boehnke 2022 (n=878), Wang 2021 (BMJ, 32 RCTs)...",
        required: true,
      },
      {
        id: "expectativa_resposta",
        label: "Expectativa de resposta terapêutica",
        type: "textarea",
        placeholder: "Ex.: redução de pelo menos 30% nos sintomas em 12 semanas; melhora da qualidade do sono já no primeiro mês; redução do consumo de benzodiazepínicos...",
      },
      {
        id: "produto_escolhido_justificativa",
        label: "Por que ESTE produto Greenlion específico?",
        type: "textarea",
        hint: "Justifica a escolha entre Linha Precision (HARMONY/BALANCE/RELIEF) ou Essential (BROAD/FULL SPECTRUM).",
        placeholder: "Ex.: O paciente requer espectro completo para potencializar o efeito entourage (Pamplona 2018: 71% melhora vs 46% CBD purificado). A formulação BALANCE oferece o perfil ideal de canabinoides...",
        required: true,
      },
    ],
  },

  // ═══ 5. PROTOCOLO TERAPÊUTICO ═══
  {
    id: "protocolo",
    title: "5. Protocolo Terapêutico Proposto",
    description: "Posologia, via, duração. Em judicialização, dose máxima fixa por 1 ano.",
    fields: [
      {
        id: "posologia_resumo",
        label: "Posologia (resumo)",
        type: "textarea",
        autofill: true,
        hint: "Auto-preenchido com base nos dados da prescrição.",
      },
      {
        id: "duracao_tratamento",
        label: "Duração estimada do tratamento",
        type: "select",
        options: [
          "Tratamento contínuo por tempo indeterminado",
          "Mínimo de 12 meses, com reavaliação anual",
          "Mínimo de 24 meses",
          "Definir caso a caso após reavaliação semestral",
        ],
        required: true,
      },
      {
        id: "monitoramento",
        label: "Plano de monitoramento e acompanhamento",
        type: "textarea",
        placeholder: "Ex.: consultas mensais nos primeiros 3 meses, depois trimestrais. Reavaliação de escalas validadas a cada 6 meses. Hemograma e função hepática a cada 12 meses.",
      },
    ],
  },

  // ═══ 6. RISCOS DE INTERRUPÇÃO ═══
  {
    id: "riscos",
    title: "6. Riscos de Interrupção do Tratamento",
    description: "Fundamenta o periculum in mora — base para tutela de urgência (liminar).",
    fields: [
      {
        id: "riscos_interrupcao",
        label: "O que acontece se o tratamento for interrompido ou adiado?",
        type: "textarea",
        hint: "Seja específico e clínico. Descreva o quadro previsível, riscos à integridade física/psíquica, irreversibilidade.",
        placeholder: "Ex.: A interrupção provocará retorno das crises convulsivas com risco de status epilepticus, dano cognitivo cumulativo e risco de morte súbita por SUDEP. Cada episódio convulsivo acumula dano neurológico irreversível...",
        required: true,
      },
      {
        id: "urgencia",
        label: "Há urgência no início ou continuidade do tratamento?",
        type: "yes-no",
        required: true,
      },
      {
        id: "urgencia_motivo",
        label: "Justifique a urgência (se aplicável)",
        type: "textarea",
        placeholder: "Risco iminente, deterioração progressiva, janela terapêutica...",
      },
    ],
  },

  // ═══ 7. HIPOSSUFICIÊNCIA ═══
  {
    id: "hipossuficiencia",
    title: "7. Capacidade Financeira",
    description: "Embora a comprovação principal seja documental (declarações, IR), o relatório médico pode mencionar o conhecimento do médico sobre a situação.",
    fields: [
      {
        id: "custo_mensal_estimado",
        label: "Custo mensal estimado do tratamento (R$)",
        type: "text",
        placeholder: "Ex.: R$ 1.800,00 (1 frasco) ou R$ 3.600,00 (2 frascos)",
      },
      {
        id: "hipossuficiencia_observacao",
        label: "Observação sobre capacidade financeira (opcional)",
        type: "textarea",
        hint: "Apenas se for de conhecimento do médico. A comprovação principal será feita por documentos pelo advogado.",
        placeholder: "Ex.: paciente desempregado por incapacidade laboral decorrente da própria doença, recebe BPC...",
      },
    ],
  },

  // ═══ 8. FUNDAMENTAÇÃO REGULATÓRIA ═══
  {
    id: "regulatorio",
    title: "8. Fundamentação Regulatória",
    description: "Bloco padrão — preenchido automaticamente. Confirma que o produto tem importação autorizada pela ANVISA.",
    fields: [
      {
        id: "anvisa_autorizacao",
        label: "O paciente possui autorização de importação ANVISA vigente?",
        type: "yes-no-na",
      },
      {
        id: "anvisa_processo",
        label: "Número do processo ANVISA (se já solicitado)",
        type: "text",
        placeholder: "Ex.: 25351.123456/2026-78",
      },
      {
        id: "rdc_660",
        label: "Confirmação de enquadramento regulatório",
        type: "textarea",
        autofill: true,
        hint: "Auto-preenchido com texto padrão sobre RDC 660/2022 e Tema 1161 STF.",
      },
    ],
  },

  // ═══ 9. CONCLUSÃO ═══
  {
    id: "conclusao",
    title: "9. Conclusão e Declaração",
    description: "Texto formal de fechamento. Reforça a imprescindibilidade.",
    fields: [
      {
        id: "conclusao_texto",
        label: "Conclusão e declaração de imprescindibilidade",
        type: "textarea",
        hint: "Texto formal. Deve afirmar a imprescindibilidade, reforçar que as alternativas SUS foram esgotadas, e que o medicamento é a melhor opção terapêutica disponível no momento.",
        placeholder: "Ex.: Pelo exposto, atesto que o tratamento com [produto] é IMPRESCINDÍVEL para o paciente acima identificado, dado o quadro clínico apresentado, a falha das alternativas terapêuticas disponíveis no SUS e o perfil de segurança superior do canabidiol nas condições deste paciente. A interrupção ou ausência de acesso ao tratamento implicará em prejuízo grave e potencialmente irreversível à sua saúde...",
        required: true,
      },
      {
        id: "observacoes_finais",
        label: "Observações adicionais (opcional)",
        type: "textarea",
        placeholder: "Considerações adicionais que o médico julgue relevantes para o caso e o entendimento do juiz.",
      },
    ],
  },
];

/** Default empty record matching the schema. */
export type AnamneseAnswers = Record<string, string>;

export function emptyAnamneseAnswers(): AnamneseAnswers {
  const empty: AnamneseAnswers = {};
  ANAMNESE_SCHEMA.forEach((section) => {
    section.fields.forEach((field) => {
      empty[field.id] = "";
    });
  });
  return empty;
}

/** Returns a list of required fields that are empty. */
export function getMissingRequiredFields(answers: AnamneseAnswers): { sectionId: string; fieldId: string; label: string }[] {
  const missing: { sectionId: string; fieldId: string; label: string }[] = [];
  ANAMNESE_SCHEMA.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.required && !field.autofill && !(answers[field.id] || "").trim()) {
        missing.push({ sectionId: section.id, fieldId: field.id, label: field.label });
      }
    });
  });
  return missing;
}
