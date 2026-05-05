// ═══════════════════════════════════════════════════════════════════
// Sistema de propósito da prescrição
//
// O médico escolhe entre dois fluxos clínicos:
//
// 1. PADRAO: prescrição rotineira com titulação progressiva da dose.
//    Receita com validade padrão de 30 dias, guia de uso para o paciente,
//    retorno em 30 dias para ajuste fino.
//
// 2. RELATORIO_DETALHADO: casos que requerem documentação médica
//    aprofundada — pacientes com tratamento contínuo, quadros refratários,
//    necessidade de demonstrar a imprescindibilidade clínica do canabidiol.
//    Inclui anamnese expandida, dose máxima já estabelecida e validade
//    estendida da receita para garantir continuidade terapêutica.
//    O relatório gerado é um documento médico fundamentado, sem termos
//    jurídicos.
// ═══════════════════════════════════════════════════════════════════

export type PrescriptionPurpose = "PADRAO" | "RELATORIO_DETALHADO";

export interface PrescriptionPurposeMeta {
  id: PrescriptionPurpose;
  label: string;
  shortLabel: string;
  description: string;
  consequences: string[];
}

export const PRESCRIPTION_PURPOSES: PrescriptionPurposeMeta[] = [
  {
    id: "PADRAO",
    label: "Prescrição padrão",
    shortLabel: "Prescrição padrão",
    description:
      "Fluxo rotineiro com protocolo de titulação progressiva da dose ('start low, go slow'). Indicado para a maioria dos casos.",
    consequences: [
      "Receita com validade padrão (30 dias)",
      "Protocolo de titulação personalizado por etapas",
      "Guia de uso para o paciente",
      "Retorno em 30 dias para ajuste",
    ],
  },
  {
    id: "RELATORIO_DETALHADO",
    label: "Prescrição com relatório médico detalhado",
    shortLabel: "Relatório detalhado",
    description:
      "Para casos de tratamento contínuo de longo prazo, quadros refratários ou que demandem documentação clínica aprofundada. Inclui anamnese expandida e gera um Relatório Médico Detalhado fundamentando a imprescindibilidade clínica.",
    consequences: [
      "Anamnese expandida com história clínica completa",
      "Receita com dose máxima já estabelecida e validade estendida (1 ano) para garantir continuidade do tratamento",
      "Guia de uso para o paciente com titulação progressiva (mesma do fluxo padrão)",
      "Relatório Médico Detalhado fundamentando a imprescindibilidade clínica",
    ],
  },
];

export function purposeMeta(id: PrescriptionPurpose): PrescriptionPurposeMeta {
  return PRESCRIPTION_PURPOSES.find((p) => p.id === id) || PRESCRIPTION_PURPOSES[0];
}

// Aliases legados — mantidos para compatibilidade temporária com dados
// antigos no Supabase. Novos códigos devem usar PADRAO / RELATORIO_DETALHADO.
export function normalizeLegacyPurpose(value: string | null | undefined): PrescriptionPurpose | null {
  if (!value) return null;
  if (value === "COMPRA_DIRETA") return "PADRAO";
  if (value === "JUDICIALIZACAO") return "RELATORIO_DETALHADO";
  if (value === "PADRAO" || value === "RELATORIO_DETALHADO") return value;
  return null;
}
