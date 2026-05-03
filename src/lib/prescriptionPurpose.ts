// ═══════════════════════════════════════════════════════════════════
// Sistema de propósito da prescrição — adicionado em 03/2026
//
// O médico escolhe entre dois fluxos:
// 1. COMPRA_DIRETA: paciente vai comprar pelo próprio dinheiro/plano.
//    → Fluxo padrão com titulação de dose, receita de 30 dias, guia de uso.
// 2. JUDICIALIZACAO: paciente vai pleitear gratuidade no SUS ou plano.
//    → Receita simplificada com dose máxima e validade de 1 ano (sem titulação),
//      guia de uso para o paciente, e RELATÓRIO MÉDICO CIRCUNSTANCIADO
//      (Tema 106 STJ + Tema 1161 STF) endereçado ao advogado.
// ═══════════════════════════════════════════════════════════════════

export type PrescriptionPurpose = "COMPRA_DIRETA" | "JUDICIALIZACAO";

export interface PrescriptionPurposeMeta {
  id: PrescriptionPurpose;
  label: string;
  shortLabel: string;
  description: string;
  consequences: string[];
}

export const PRESCRIPTION_PURPOSES: PrescriptionPurposeMeta[] = [
  {
    id: "COMPRA_DIRETA",
    label: "Compra direta pelo paciente",
    shortLabel: "Compra direta",
    description: "Paciente vai adquirir o produto com recursos próprios ou via plano de saúde. Inclui protocolo de titulação de dose ('start low, go slow').",
    consequences: [
      "Receita com validade padrão (30 dias)",
      "Protocolo de titulação personalizado por etapas",
      "Guia de uso para o paciente",
      "Retorno em 30 dias para ajuste",
    ],
  },
  {
    id: "JUDICIALIZACAO",
    label: "Judicialização (SUS / Plano de Saúde)",
    shortLabel: "Judicialização",
    description: "Paciente vai pleitear o fornecimento gratuito por via judicial. Receita já é emitida com dose máxima e validade de 1 ano para evitar interrupção de tratamento durante eventuais rebloqueios judiciais.",
    consequences: [
      "Receita com validade de 1 ano (proteção contra demora judicial)",
      "Dose máxima da patologia diretamente (sem titulação)",
      "Guia de uso para o paciente (titulação fica a cargo do médico no acompanhamento)",
      "Relatório médico circunstanciado para o advogado (Tema 106 STJ)",
      "Anamnese expandida obrigatória",
    ],
  },
];

export function purposeMeta(id: PrescriptionPurpose): PrescriptionPurposeMeta {
  return PRESCRIPTION_PURPOSES.find((p) => p.id === id) || PRESCRIPTION_PURPOSES[0];
}
