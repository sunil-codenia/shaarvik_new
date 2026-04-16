-- AI Settings table for storing per-user AI configuration
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_settings_user_id ON public.ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id_lookup ON public.ai_settings(user_id);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_ai_settings" ON public.ai_settings;
CREATE POLICY "users_manage_own_ai_settings"
ON public.ai_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
