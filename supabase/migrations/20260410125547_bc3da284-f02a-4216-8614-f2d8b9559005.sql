
-- Tabela de anotações clínicas
CREATE TABLE public.annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL DEFAULT '',
  current_dose TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Doctors can view own annotations"
ON public.annotations FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own annotations"
ON public.annotations FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own annotations"
ON public.annotations FOR UPDATE
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own annotations"
ON public.annotations FOR DELETE
USING (auth.uid() = doctor_id);
