-- Adiciona campos para responsável legal (quando paciente é menor) e
-- tipo de cobertura de saúde (SUS / plano / particular).

-- Cobertura de saúde do paciente — afeta como o relatório é redigido
-- (paciente do SUS exige documentação da ineficácia do SUS;
-- paciente de plano/particular não).
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS healthcare_coverage TEXT
    CHECK (healthcare_coverage IN ('SUS', 'PLANO', 'PARTICULAR'))
    DEFAULT 'PARTICULAR';

-- Dados do responsável legal — preenchidos quando paciente é menor de idade
-- ou interditado. Nullable porque não se aplica à maioria.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS legal_guardian_name TEXT;
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS legal_guardian_cpf TEXT;
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS legal_guardian_rg TEXT;
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS legal_guardian_relationship TEXT; -- pai/mãe/tutor/curador
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS legal_guardian_phone TEXT;

COMMENT ON COLUMN public.patients.healthcare_coverage IS
  'Cobertura de saúde do paciente. Afeta a redação do relatório médico — pacientes do SUS exigem demonstração da ineficácia das alternativas SUS; planos/particular não.';
COMMENT ON COLUMN public.patients.legal_guardian_name IS
  'Nome completo do responsável legal — preenchido quando paciente é menor de idade ou interditado.';
