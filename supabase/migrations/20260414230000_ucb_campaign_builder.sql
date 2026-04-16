-- ============================================================
-- Unified Campaign Builder (UCB) — New tables only
-- Prefixed ucb_ to avoid conflict with existing campaigns table
-- ============================================================

-- ─── UCB Campaigns ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ucb_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  objective TEXT,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'draft',
  -- Budget
  total_budget NUMERIC(14,2),
  daily_budget NUMERIC(14,2),
  start_date DATE,
  end_date DATE,
  -- Targeting (common)
  location TEXT,
  age_min INT,
  age_max INT,
  gender TEXT DEFAULT 'all',
  language TEXT,
  interests TEXT,
  behaviors TEXT,
  custom_audience TEXT,
  -- Tracking
  landing_page_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  google_tag_id TEXT,
  meta_pixel_id TEXT,
  linkedin_insight_tag TEXT,
  conversion_events TEXT[],
  attribution_model TEXT DEFAULT 'last_click',
  -- Platform-specific (JSONB)
  google_config JSONB,
  meta_config JSONB,
  linkedin_config JSONB,
  -- Creatives
  creative_ids TEXT[],
  -- Submission
  google_campaign_id TEXT,
  meta_campaign_id TEXT,
  linkedin_campaign_id TEXT,
  google_sync_status TEXT DEFAULT 'pending',
  meta_sync_status TEXT DEFAULT 'pending',
  linkedin_sync_status TEXT DEFAULT 'pending',
  google_sync_error TEXT,
  meta_sync_error TEXT,
  linkedin_sync_error TEXT,
  -- Metrics (cached)
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  spend NUMERIC(14,2) DEFAULT 0,
  -- AI
  ai_mode BOOLEAN DEFAULT false,
  ai_suggestions JSONB,
  -- A/B
  ab_test_enabled BOOLEAN DEFAULT false,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── UCB Platform Accounts (OAuth connections) ───────────────
CREATE TABLE IF NOT EXISTS public.ucb_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'connected',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── UCB A/B Tests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ucb_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.ucb_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variant_a JSONB,
  variant_b JSONB,
  winner TEXT,
  status TEXT DEFAULT 'running',
  impressions_a INT DEFAULT 0,
  impressions_b INT DEFAULT 0,
  clicks_a INT DEFAULT 0,
  clicks_b INT DEFAULT 0,
  conversions_a INT DEFAULT 0,
  conversions_b INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ucb_campaigns_user_id ON public.ucb_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ucb_campaigns_company_id ON public.ucb_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_ucb_campaigns_status ON public.ucb_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ucb_platform_accounts_user_id ON public.ucb_platform_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ucb_ab_tests_campaign_id ON public.ucb_ab_tests(campaign_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.ucb_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ucb_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ucb_ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ucb_campaigns_all" ON public.ucb_campaigns;
CREATE POLICY "ucb_campaigns_all" ON public.ucb_campaigns
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ucb_platform_accounts_all" ON public.ucb_platform_accounts;
CREATE POLICY "ucb_platform_accounts_all" ON public.ucb_platform_accounts
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ucb_ab_tests_all" ON public.ucb_ab_tests;
CREATE POLICY "ucb_ab_tests_all" ON public.ucb_ab_tests
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
