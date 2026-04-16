-- Shaarvik AI Fallback Learning Engine
-- Stores all OpenAI responses to build local intelligence over time

-- Table: ai_fallback_patterns
-- Stores learned patterns from OpenAI responses per action type
CREATE TABLE IF NOT EXISTS public.ai_fallback_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  action_type TEXT NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}',
  openai_response JSONB NOT NULL DEFAULT '{}',
  confidence_score INTEGER DEFAULT 70,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ai_fallback_settings
-- Stores per-user OpenAI toggle state and fallback engine stats
CREATE TABLE IF NOT EXISTS public.ai_fallback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  openai_enabled BOOLEAN DEFAULT TRUE,
  fallback_mode_active BOOLEAN DEFAULT FALSE,
  total_patterns_learned INTEGER DEFAULT 0,
  total_fallback_responses INTEGER DEFAULT 0,
  learning_started_at TIMESTAMPTZ DEFAULT NOW(),
  last_openai_response_at TIMESTAMPTZ,
  last_fallback_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_fallback_patterns_user_id ON public.ai_fallback_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_fallback_patterns_action_type ON public.ai_fallback_patterns(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_fallback_patterns_user_action ON public.ai_fallback_patterns(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_ai_fallback_settings_user_id ON public.ai_fallback_settings(user_id);

-- RLS
ALTER TABLE public.ai_fallback_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_fallback_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_fallback_patterns' AND policyname = 'Users manage own fallback patterns'
  ) THEN
    CREATE POLICY "Users manage own fallback patterns"
      ON public.ai_fallback_patterns
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_fallback_settings' AND policyname = 'Users manage own fallback settings'
  ) THEN
    CREATE POLICY "Users manage own fallback settings"
      ON public.ai_fallback_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
