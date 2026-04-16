-- Shaarvik AI Level 6 Autonomous Marketing System Tables

-- AI Goals table: user sets goals, AI executes strategy
CREATE TABLE IF NOT EXISTS public.ai_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('leads', 'roi', 'cost_per_lead', 'revenue', 'conversions')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  timeframe_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'achieved', 'failed')),
  ai_strategy JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Autonomous Actions log: every action AI takes
CREATE TABLE IF NOT EXISTS public.ai_autonomous_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('campaign_created', 'campaign_paused', 'campaign_resumed', 'campaign_optimized', 'budget_adjusted', 'strategy_updated', 'creative_flagged', 'goal_updated')),
  target_id UUID,
  target_type TEXT,
  reasoning TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  outcome TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'skipped', 'failed')),
  ai_model TEXT DEFAULT 'gpt-5',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- AI Learning Memory: stores patterns AI has learned
CREATE TABLE IF NOT EXISTS public.ai_learning_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('campaign_pattern', 'audience_insight', 'timing_pattern', 'budget_pattern', 'creative_pattern', 'cross_module_signal')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  times_validated INTEGER DEFAULT 1,
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Simulations: predictive scenario engine
CREATE TABLE IF NOT EXISTS public.ai_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('budget_increase', 'budget_decrease', 'new_campaign', 'pause_campaign', 'audience_shift', 'channel_switch')),
  input_params JSONB NOT NULL DEFAULT '{}',
  predicted_leads INTEGER,
  predicted_revenue NUMERIC,
  predicted_roi NUMERIC,
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reasoning TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Control Layer: central override and automation settings
CREATE TABLE IF NOT EXISTS public.ai_control_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  autonomous_mode BOOLEAN DEFAULT false,
  auto_pause_underperforming BOOLEAN DEFAULT true,
  auto_scale_top_campaigns BOOLEAN DEFAULT true,
  auto_create_campaigns BOOLEAN DEFAULT false,
  min_confidence_to_act NUMERIC DEFAULT 75,
  learning_enabled BOOLEAN DEFAULT true,
  cross_module_intelligence BOOLEAN DEFAULT true,
  notification_on_action BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_goals_user_id ON public.ai_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_goals_company_id ON public.ai_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_autonomous_actions_user_id ON public.ai_autonomous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_autonomous_actions_created_at ON public.ai_autonomous_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_memory_user_id ON public.ai_learning_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_simulations_user_id ON public.ai_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_control_settings_user_id ON public.ai_control_settings(user_id);
