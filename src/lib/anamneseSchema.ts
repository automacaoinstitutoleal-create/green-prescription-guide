// ═══════════════════════════════════════════════════════════════════
// Anamnese Médica Detalhada
//
// Schema do formulário que o médico preenche durante a consulta para
// gerar o RELATÓRIO MÉDICO DETALHADO.
//
// Princípio editorial: este é um documento MÉDICO, não jurídico. Não
// contém referências a teses, temas, dispositivos legais ou termos
// processuais. O médico atesta o quadro clínico e a imprescindibilidade
// terapêutica; a fundamentação jurídica é responsabilidade do advogado
// do paciente quando aplicável, em outro documento.
//
// Cada campo de texto tem `defaultText` — uma sugestão de redação que
// o médico pode aceitar e ajustar, em vez de escrever do zero. Os
// `defaultText` usam {placeholders} que são substituídos com dados do
// paciente/produto pela função fillDefaultsForPatient().
// ═══════════════════════════════════════════════════════════════════

export type FieldType = "text" | "textarea" | "date" | "select" | "yes-no" | "yes-no-na";

export interface AnamneseField {
  id: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  /** Quando true, o campo é preenchido automaticamente (não exige input). */
  autofill?: boolean;
  /**
   * Texto sugerido inicial. O médico pode editar livremente.
   * Suporta placeholders no formato {patient_name}, {pathology}, etc.
   * Substituídos por fillDefaultsForPatient().
   */
  defaultText?: string;
  /** Permite captura de voz para textareas longos. */
  voiceCapture?: boolean;
}

export interface AnamneseSection {
  id: string;
  title: string;
  description?: string;
  /**
   * Quando definido, esta seção só aparece se a função retornar true.
   * Permite seções condicionais ao perfil do paciente (ex.: só SUS).
   */
  visibleWhen?: (ctx: AnamneseContext) => boolean;
  fields: AnamneseField[];
}

/** Contexto usado para preencher textos padrão e definir visibilidade. */
export interface AnamneseContext {
  patientName: string;
  patientAge: number | null;
  pathology: string;
  productLabel: string;
  productLine: string; // PRECISION ou ESSENTIAL
  productCannabinoids: string; // resumo de canabinoides
  doseSummary: string; // posologia em texto
  healthcareCoverage: "SUS" | "PLANO" | "PARTICULAR";
  legalGuardianName?: string;
  legalGuardianRelationship?: string;
}

/**
 * Schema completo da anamnese.
 * 8 seções clínicas, ~30 campos. Sem termos jurídicos.
 */
export const ANAMNESE_SCHEMA: AnamneseSection[] = [
  // ═══ 1. HISTÓRIA DA DOENÇA ATUAL ═══
  {
    id: "historia",
    title: "1. História da doença atual",
    description: "Quando começou, como evoluiu, sintomas atuais e impacto na vida do paciente.",
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
        label: "Como o quadro evoluiu desde o início?",
        type: "textarea",
        placeholder: "Descreva progressão, fases de melhora e piora, gatilhos identificados.",
        required: true,
        voiceCapture: true,
        defaultText:
          "O paciente apresenta {pathology} com evolução progressiva. Inicialmente os sintomas eram intermitentes e respondiam parcialmente às medidas iniciais. Com o tempo, houve aumento da frequência e intensidade, com piora funcional progressiva. Atualmente o quadro mantém-se em padrão crônico, com flutuações que não retornam ao quadro inicial.",
      },
      {
        id: "sintomas_atuais",
        label: "Quais são os sintomas atuais e sua intensidade?",
        type: "textarea",
        placeholder: "Liste sintomas com frequência, duração e intensidade.",
        required: true,
        voiceCapture: true,
        defaultText:
          "O paciente apresenta atualmente sintomas característicos de {pathology}, com intensidade moderada a importante. Há comprometimento da qualidade de vida e da capacidade funcional. Os sintomas estão presentes na maior parte dos dias.",
      },
      {
        id: "impacto_funcional",
        label: "Qual o impacto na vida diária do paciente?",
        type: "textarea",
        hint: "Capacidade laboral, social, autonomia, sono, alimentação, autocuidado.",
        placeholder: "Ex.: paciente afastado do trabalho há 8 meses, dependente de cuidador para AVDs…",
        required: true,
        voiceCapture: true,
        defaultText:
          "O quadro causa impacto funcional significativo: comprometimento das atividades laborais e sociais, alteração do sono, redução da autonomia para atividades de vida diária e prejuízo da qualidade de vida global.",
      },
      {
        id: "exames_realizados",
        label: "Exames complementares realizados",
        type: "textarea",
        hint: "Laboratoriais, imagens, eletrofisiológicos, escalas validadas.",
        placeholder: "Ex.: RM crânio (data); polissonografia (data); HAM-A 28; PHQ-9 19…",
        voiceCapture: true,
      },
    ],
  },

  // ═══ 2. ANTECEDENTES E COMORBIDADES ═══
  {
    id: "antecedentes",
    title: "2. Antecedentes e comorbidades",
    description: "Outras doenças, alergias, internações, contexto familiar relevante.",
    fields: [
      {
        id: "comorbidades",
        label: "Comorbidades clínicas relevantes",
        type: "textarea",
        placeholder: "Ex.: hipertensão controlada, diabetes tipo 2, depressão maior…",
        voiceCapture: true,
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
        placeholder: "História familiar de doenças neurológicas, psiquiátricas, genéticas relevantes ao caso.",
        voiceCapture: true,
      },
      {
        id: "internacoes",
        label: "Internações ou cirurgias prévias relacionadas",
        type: "textarea",
        placeholder: "Datas, motivos, desfechos.",
        voiceCapture: true,
      },
    ],
  },

  // ═══ 3. TRATAMENTOS PRÉVIOS ═══
  // Sem menções a NATJUS, Tema 106 ou juiz. É clinicamente relevante
  // para qualquer perfil de paciente — tanto particular quanto SUS.
  {
    id: "tratamentos_previos",
    title: "3. Tratamentos prévios tentados",
    description:
      "Liste os medicamentos e terapias já testadas, com dose, duração e motivo da descontinuação. Esta seção fundamenta clinicamente a indicação do canabidiol.",
    fields: [
      {
        id: "tratamentos_lista",
        label: "Medicamentos e terapias já utilizadas",
        type: "textarea",
        hint: "Para cada um: nome, dose máxima atingida, duração, motivo da suspensão (ineficácia / efeitos adversos / contraindicação).",
        placeholder:
          "Ex.:\n• Sertralina 200 mg/dia por 8 meses — ineficácia parcial e ganho de peso de 12 kg\n• Clonazepam 4 mg/dia por 4 meses — sedação excessiva, queda postural\n• Quetiapina 300 mg/dia por 6 meses — síndrome metabólica\n• TCC semanal por 18 meses — sem resposta adequada",
        required: true,
        voiceCapture: true,
        defaultText:
          "Foram tentadas as seguintes alternativas terapêuticas, sem resposta clínica satisfatória:\n• [medicamento 1] — dose, duração, motivo da descontinuação\n• [medicamento 2] — dose, duração, motivo da descontinuação\n• [medicamento 3] — dose, duração, motivo da descontinuação\n\n[Adicione terapias não-farmacológicas relevantes: fisioterapia, TCC, etc.]",
      },
      {
        id: "ineficacia_justificativa",
        label: "Justificativa clínica da inadequação dos tratamentos prévios",
        type: "textarea",
        hint: "Por que cada classe terapêutica não foi adequada para este paciente?",
        placeholder:
          "Descreva clinicamente o que houve: ineficácia primária, perda de eficácia, efeitos adversos limitantes, contraindicações específicas.",
        required: true,
        voiceCapture: true,
        defaultText:
          "Os tratamentos convencionais para {pathology} foram tentados sem êxito. As classes utilizadas apresentaram ineficácia primária, perda de resposta ao longo do tempo ou efeitos adversos limitantes que impediram a manutenção em doses terapêuticas. O paciente apresenta perfil de não-resposta às alternativas farmacológicas tradicionais para esta condição.",
      },
      {
        id: "efeitos_adversos_previos",
        label: "Efeitos adversos significativos com tratamentos anteriores",
        type: "textarea",
        placeholder:
          "Descreva efeitos adversos limitantes que prejudicaram a continuidade dos tratamentos.",
        voiceCapture: true,
      },
    ],
  },

  // ═══ 4. JUSTIFICATIVA DO TRATAMENTO COM CANABIDIOL ═══
  // Vem MUITO bem pré-preenchida, com referência específica à composição
  // única dos produtos Greenlion. O médico ajusta o que precisar.
  {
    id: "justificativa_cbd",
    title: "4. Justificativa clínica para o canabidiol",
    description:
      "Por que o canabidiol é a alternativa terapêutica adequada e por que esta formulação Greenlion específica é a melhor escolha para este caso.",
    fields: [
      {
        id: "fundamento_indicacao",
        label: "Fundamento clínico da indicação do canabidiol",
        type: "textarea",
        hint:
          "Mecanismo de ação relevante para o caso, evidência científica, perfil de segurança comparativo.",
        required: true,
        voiceCapture: true,
        defaultText:
          "O canabidiol atua de forma multimodal sobre o sistema endocanabinoide e em receptores envolvidos no controle dos sintomas de {pathology}. Sua ação se dá pela modulação dos receptores CB1 e CB2, agonismo parcial do receptor 5-HT1A (com efeito ansiolítico e antidepressivo), modulação de canais TRPV1 (com efeito analgésico e neuroprotetor) e interação com receptores PPAR-gama (com efeito anti-inflamatório). A literatura científica revisada por pares demonstra eficácia consistente do canabidiol para esta condição, com perfil de segurança superior ao das alternativas farmacológicas tradicionais. O canabidiol não causa dependência, não induz tolerância significativa em uso prolongado e tem perfil de efeitos adversos previsível e gerenciável.",
      },
      {
        id: "expectativa_resposta",
        label: "Expectativa de resposta terapêutica",
        type: "textarea",
        placeholder:
          "Defina marcadores de melhora clínica esperados nos primeiros meses.",
        voiceCapture: true,
        defaultText:
          "Espera-se redução clinicamente significativa dos sintomas em 8 a 12 semanas, com melhora da qualidade do sono já no primeiro mês de tratamento, redução do uso de medicamentos sintomáticos e recuperação progressiva da capacidade funcional. A reavaliação será feita por escalas validadas em consultas de acompanhamento.",
      },
      {
        id: "produto_escolhido_justificativa",
        label: "Por que a formulação Greenlion específica foi escolhida",
        type: "textarea",
        hint:
          "A Greenlion possui composição única no mercado brasileiro. Justifique por que ESTE produto é o mais adequado para este caso.",
        required: true,
        voiceCapture: true,
        defaultText:
          "A formulação {product_label} foi escolhida por apresentar perfil de canabinoides otimizado para o quadro clínico do paciente. Diferente de produtos de canabidiol isolado, a formulação Greenlion contém {product_cannabinoids}, oferecendo o chamado 'efeito entourage' — sinergismo entre canabinoides e terpenos que potencializa a resposta clínica em comparação ao CBD isolado (Pamplona et al., 2018: 71% de melhora com espectro completo vs 46% com CBD purificado). A composição específica desta formulação atende às necessidades terapêuticas do quadro de {pathology}, sendo a opção mais adequada disponível no mercado brasileiro para este caso.",
      },
    ],
  },

  // ═══ 5. PROTOCOLO TERAPÊUTICO ═══
  {
    id: "protocolo",
    title: "5. Protocolo terapêutico proposto",
    description: "Posologia, via de administração, duração e plano de monitoramento.",
    fields: [
      {
        id: "posologia_resumo",
        label: "Posologia",
        type: "textarea",
        autofill: true,
        hint: "Preenchido automaticamente com base nos dados da prescrição.",
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
        placeholder:
          "Frequência das consultas, exames de monitoramento, escalas de avaliação.",
        voiceCapture: true,
        defaultText:
          "Acompanhamento médico mensal nos primeiros três meses para avaliação de tolerância e ajustes de dose. A partir do quarto mês, consultas trimestrais para reavaliação clínica. Aplicação de escalas validadas para a patologia em cada consulta. Hemograma e função hepática anuais como rotina de segurança.",
      },
    ],
  },

  // ═══ 6. RISCOS DE INTERRUPÇÃO ═══
  // Mantém a seção (importante clinicamente) mas SEM termos jurídicos.
  {
    id: "riscos",
    title: "6. Riscos clínicos da interrupção do tratamento",
    description:
      "Descreva o que acontece com o paciente — clinicamente — se o tratamento for interrompido ou postergado.",
    fields: [
      {
        id: "riscos_interrupcao",
        label: "Consequências clínicas da interrupção do tratamento",
        type: "textarea",
        hint: "Descreva o quadro clinicamente previsível e os riscos à saúde do paciente.",
        required: true,
        voiceCapture: true,
        defaultText:
          "A interrupção ou ausência de acesso ao tratamento implica retorno do quadro álgico e funcional em sua forma original, com retomada do ciclo de uso de medicamentos sintomáticos que já demonstraram efeitos adversos limitantes ou ineficácia neste paciente. Há risco de agravamento progressivo do quadro e de comorbidades secundárias, com prejuízo cumulativo à qualidade de vida e à capacidade funcional do paciente.",
      },
      {
        id: "urgencia",
        label: "Há urgência clínica para o início ou continuidade do tratamento?",
        type: "yes-no",
        required: true,
      },
      {
        id: "urgencia_motivo",
        label: "Motivo clínico da urgência (se aplicável)",
        type: "textarea",
        placeholder: "Risco iminente, deterioração progressiva, janela terapêutica.",
        voiceCapture: true,
      },
    ],
  },

  // ═══ 7. CUSTO DO TRATAMENTO ═══
  // Mantém para informação ao paciente. SEM termo jurídico de "hipossuficiência".
  {
    id: "custo",
    title: "7. Custo do tratamento",
    description: "Informação sobre o custo mensal do produto, para conhecimento do paciente e família.",
    fields: [
      {
        id: "custo_mensal_estimado",
        label: "Custo mensal estimado do tratamento",
        type: "text",
        placeholder: "Ex.: R$ 1.800,00 a R$ 3.600,00",
      },
    ],
  },

  // ═══ 8. CONCLUSÃO ═══
  // SEM "imprescindibilidade" como jargão jurídico. SEM "alternativas SUS"
  // quando o paciente é particular. Texto se ajusta à cobertura.
  {
    id: "conclusao",
    title: "8. Conclusão clínica",
    description: "Fechamento do relatório com a conclusão médica sobre o caso.",
    fields: [
      {
        id: "conclusao_texto",
        label: "Conclusão e indicação terapêutica",
        type: "textarea",
        hint: "Resumo clínico final. Afirme a necessidade terapêutica do canabidiol para este paciente.",
        required: true,
        voiceCapture: true,
        defaultText:
          "Pelo quadro clínico apresentado, pelos resultados insatisfatórios das alternativas terapêuticas previamente tentadas e pelo perfil de segurança e eficácia do canabidiol nesta condição, atesto que o tratamento com {product_label} é necessário e indicado para o paciente {patient_name}, sendo a melhor opção terapêutica disponível para o caso no momento atual. A continuidade do tratamento é fundamental para a manutenção da qualidade de vida e da capacidade funcional do paciente.",
      },
      {
        id: "observacoes_finais",
        label: "Observações adicionais (opcional)",
        type: "textarea",
        placeholder: "Considerações clínicas adicionais relevantes ao caso.",
        voiceCapture: true,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Tipos auxiliares e helpers
// ═══════════════════════════════════════════════════════════════════

export type AnamneseAnswers = Record<string, string>;

export interface CustomAnamneseField {
  id: string;
  label: string;
  type: "text" | "textarea";
  value: string;
}

export function emptyAnamneseAnswers(): AnamneseAnswers {
  const empty: AnamneseAnswers = {};
  ANAMNESE_SCHEMA.forEach((section) => {
    section.fields.forEach((field) => {
      empty[field.id] = "";
    });
  });
  return empty;
}

export function makeCustomFieldId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Substitui {placeholders} nos textos default por dados reais do paciente
 * e do produto. Usado para pré-preencher os campos da anamnese.
 */
export function fillDefaultText(text: string, ctx: AnamneseContext): string {
  return text
    .replace(/\{patient_name\}/g, ctx.patientName)
    .replace(/\{pathology\}/g, ctx.pathology.toLowerCase())
    .replace(/\{product_label\}/g, ctx.productLabel)
    .replace(/\{product_line\}/g, ctx.productLine)
    .replace(/\{product_cannabinoids\}/g, ctx.productCannabinoids)
    .replace(/\{dose_summary\}/g, ctx.doseSummary);
}

/**
 * Pré-preenche as respostas com os textos default do schema, contextualizados.
 * Usado quando o médico abre a anamnese pela primeira vez.
 */
export function prefillAnamneseDefaults(ctx: AnamneseContext): AnamneseAnswers {
  const answers = emptyAnamneseAnswers();
  ANAMNESE_SCHEMA.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.defaultText) {
        answers[field.id] = fillDefaultText(field.defaultText, ctx);
      }
    });
  });
  return answers;
}

export function getMissingRequiredFields(
  answers: AnamneseAnswers
): { sectionId: string; fieldId: string; label: string }[] {
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
