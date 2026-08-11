# Múltiplas patologias por prescrição

Permitir que o médico selecione mais de uma patologia (comorbidades) no fluxo de prescrição e derivar automaticamente uma regra de prescrição combinada.

## Regras clínicas propostas

1. **Dose**: vale a patologia mais exigente — maior dose alvo e maior dose máxima (calculadas em mg, já convertendo mg/kg pelo peso do paciente). A dose inicial segue a **menor** das iniciais (start low, go slow, mais seguro).
2. **Frascos/quantidade**: como decorre da dose de manutenção, a quantidade sempre acompanha a patologia dominante (a de maior dose) — nenhum cálculo extra necessário.
3. **THC**: se qualquer patologia selecionada exigir/recomendar produto **sem THC** (HARMONY / ESSENTIAL BROAD SPECTRUM), o sistema recomenda o produto **sem THC**, mesmo que outra patologia sugira BALANCE ou RELIEF. Aparece um aviso explicando o motivo.
4. **Produto sugerido**: entre as recomendações das patologias selecionadas, escolhe a da patologia dominante (maior dose alvo) — filtrada pela regra 3 acima.
5. **Soberania médica**: tudo continua editável — o médico pode escolher qualquer produto, qualquer dose e qualquer quantidade, com o selo "✓ Indicado para este caso" apenas como sugestão.

## O que muda na tela

- **Step 4 (Patologia)** passa a ser seleção múltipla (clique alterna seleção; cards marcados com check). Título: "Patologias / Comorbidades".
- Card de resumo abaixo da lista quando há 2+ patologias: patologia dominante, faixa de dose consolidada (início / alvo / máx), produto sugerido e aviso de THC quando aplicável.
- Referências científicas exibidas para cada patologia selecionada.
- **Step 5 (Produto)**: o selo "Indicado" e "Segunda opção" passam a considerar a recomendação consolidada; produtos com THC ganham aviso discreto quando a regra 3 estiver ativa.
- **Diagnóstico (Step 6)** pré-preenchido com todas as patologias e CIDs: `Autismo (TEA) (CID-10: F84.0); Insônia (CID-10: G47.0)`, sempre editável.

## Documentos e histórico

- Receita, Guia do Paciente e relatório detalhado passam a listar todas as patologias e CIDs (campo diagnóstico já é texto livre editável).
- Ao salvar, o campo de patologia da prescrição grava o texto consolidado, e a lista completa vai também nos dados da prescrição para o histórico. Sem mudança de banco de dados — o histórico existente continua abrindo normalmente.

## Detalhes técnicos

- `src/lib/prescriptionData.ts`: nova função `combinePathologies(pathologies, weightKg)` retornando `{ dominant, doseStart, doseTarget, doseMax, recommendedProduct, thcFree, thcConflict }`, além de um mapa de produtos livres de THC (HARMONY, ESSENTIAL BROAD SPECTRUM) e `isProductAvailableForPathologies()`.
- `src/pages/Prescription.tsx`: `selectedPathology` vira `selectedPathologies: PathologyInfo[]`; os pontos que hoje leem `selectedPathology` passam a usar o resultado de `combinePathologies` (dose, produto, diagnóstico, salvamento, PDFs). Mantém-se um `primaryPathology` derivado para compatibilidade com componentes que esperam uma única patologia.
- Nenhuma migração de banco.
