-- ============================================================
-- Fix ai_feedback table: add missing user_id and insight_text columns
-- The table was created without these columns; this migration adds them
-- and fixes the RLS policy and view accordingly
-- ============================================================

-- Add user_id column if it doesn't exist
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Add insight_text column if it doesn't exist
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS insight_text TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_insight_text ON public.ai_feedback(insight_text);

-- Drop and recreate the RLS policy to use user_id correctly
DROP POLICY IF EXISTS "users_manage_own_ai_feedback" ON public.ai_feedback;
CREATE POLICY "users_manage_own_ai_feedback"
ON public.ai_feedback
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop and recreate the learning view with correct column references
DROP VIEW IF EXISTS public.ai_insight_success_rates;
CREATE OR REPLACE VIEW public.ai_insight_success_rates AS
SELECT
  insight_text,
  COUNT(*) AS total_feedback,
  COUNT(*) FILTER (WHERE feedback = 'good') AS good_count,
  COUNT(*) FILTER (WHERE feedback = 'bad') AS bad_count,
  ROUND(
    (COUNT(*) FILTER (WHERE feedback = 'good')::NUMERIC / NULLIF(COUNT(*), 0)) * 100
  ) AS success_rate
FROM public.ai_feedback
GROUP BY insight_text;
