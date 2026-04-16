-- ============================================================
-- Enhance creatives table for multi-creative-per-campaign support
-- ============================================================

-- 1. Add missing columns to creatives table
ALTER TABLE public.creatives
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS creative_url TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creatives_campaign_id ON public.creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON public.creatives(status);

-- 3. Enable RLS
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy
DROP POLICY IF EXISTS "authenticated_manage_creatives" ON public.creatives;
CREATE POLICY "authenticated_manage_creatives"
ON public.creatives
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
