
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS healthcare_coverage text DEFAULT 'PARTICULAR',
  ADD COLUMN IF NOT EXISTS legal_guardian_name text,
  ADD COLUMN IF NOT EXISTS legal_guardian_cpf text,
  ADD COLUMN IF NOT EXISTS legal_guardian_rg text,
  ADD COLUMN IF NOT EXISTS legal_guardian_relationship text,
  ADD COLUMN IF NOT EXISTS legal_guardian_phone text;
