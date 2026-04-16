-- ============================================================
-- Add company_id column to ai_feedback table
-- ============================================================

ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_feedback_company_id ON public.ai_feedback(company_id);
