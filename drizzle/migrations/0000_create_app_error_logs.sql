CREATE TABLE public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  screen text NOT NULL,
  operation text NOT NULL,
  stage text NOT NULL,
  error_type text NOT NULL DEFAULT 'application_error',
  error_message text NOT NULL,
  technical_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.app_error_logs TO authenticated;
GRANT ALL ON public.app_error_logs TO service_role;

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can insert own error logs"
ON public.app_error_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view own error logs"
ON public.app_error_logs
FOR SELECT
TO authenticated
USING (auth.uid() = doctor_id);

CREATE INDEX app_error_logs_doctor_occurred_idx
ON public.app_error_logs (doctor_id, occurred_at DESC);

CREATE INDEX app_error_logs_screen_operation_idx
ON public.app_error_logs (screen, operation, occurred_at DESC);