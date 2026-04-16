-- ============================================================
-- AI Feedback Table (Level 3 Learning System)
-- Stores user feedback on AI insights for future learning
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  insight_id UUID REFERENCES public.ai_insights_logs(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('good', 'bad')),
  revenue_impact NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_insight_id ON public.ai_feedback(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_feedback ON public.ai_feedback(feedback);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_insight_text ON public.ai_feedback(insight_text);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_ai_feedback" ON public.ai_feedback;
CREATE POLICY "users_manage_own_ai_feedback"
ON public.ai_feedback
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Learning View: Insight success rates
-- Aggregates feedback to compute success % per insight text
-- ============================================================

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
