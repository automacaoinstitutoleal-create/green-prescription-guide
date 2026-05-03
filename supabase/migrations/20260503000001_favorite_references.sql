-- ═══════════════════════════════════════════════════════════════════
-- Favoritos de referências científicas por médico
-- Permite que cada médico marque artigos como favoritos para acesso rápido
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.favorite_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_doi TEXT NOT NULL,
  reference_title TEXT NOT NULL,
  pathology TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, reference_doi)
);

ALTER TABLE public.favorite_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own favorites"
  ON public.favorite_references FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own favorites"
  ON public.favorite_references FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own favorites"
  ON public.favorite_references FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own favorites"
  ON public.favorite_references FOR DELETE
  USING (auth.uid() = doctor_id);

CREATE INDEX idx_favorite_references_doctor ON public.favorite_references(doctor_id);
CREATE INDEX idx_favorite_references_doi ON public.favorite_references(reference_doi);
