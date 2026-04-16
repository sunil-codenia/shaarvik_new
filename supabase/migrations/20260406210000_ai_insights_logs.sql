-- ============================================================
-- AI Insights Logs Table
-- Stores all generated insights for future learning (Level 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_insights_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'campaign' | 'creative' | 'suggestion'
  reference_id TEXT, -- campaign_id or creative_id (nullable)
  insight TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_logs_user_id ON public.ai_insights_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_logs_type ON public.ai_insights_logs(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_logs_created_at ON public.ai_insights_logs(created_at DESC);

ALTER TABLE public.ai_insights_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_ai_insights_logs" ON public.ai_insights_logs;
CREATE POLICY "users_manage_own_ai_insights_logs"
ON public.ai_insights_logs
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
