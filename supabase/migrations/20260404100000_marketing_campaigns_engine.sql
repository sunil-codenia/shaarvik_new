-- ============================================================
-- Marketing Campaigns Engine
-- Creates campaigns table, links leads + clients to campaigns
-- Adds revenue tracking to clients
-- ============================================================

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Google Ads',
  status TEXT NOT NULL DEFAULT 'draft',
  budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE,
  mode TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. ADD campaign_id TO leads (optional, nullable for backward compat)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 3. ADD campaign_id AND revenue TO clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON public.campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clients_campaign_id ON public.clients(campaign_id);

-- 5. ENABLE RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_campaigns" ON public.campaigns;
CREATE POLICY "authenticated_manage_campaigns"
ON public.campaigns FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. TRIGGER for updated_at
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. SAMPLE CAMPAIGNS DATA
DO $$
DECLARE
  admin_id UUID;
  camp1_id UUID := gen_random_uuid();
  camp2_id UUID := gen_random_uuid();
  camp3_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO admin_id FROM public.user_profiles LIMIT 1;

  INSERT INTO public.campaigns (id, name, platform, status, budget, spent_amount, start_date, mode, created_by)
  VALUES
    (camp1_id, 'Q2 Lead Gen', 'Google Ads', 'active', 5000, 2340, '2026-04-01', 'manual', admin_id),
    (camp2_id, 'Brand Awareness', 'Meta Ads', 'active', 3000, 1890, '2026-03-15', 'auto', admin_id),
    (camp3_id, 'Retargeting Spring', 'Google Ads', 'paused', 2000, 980, '2026-03-01', 'manual', admin_id)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample campaigns insert skipped: %', SQLERRM;
END $$;
