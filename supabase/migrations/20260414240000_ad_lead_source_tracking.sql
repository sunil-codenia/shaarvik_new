-- ============================================================
-- Ad Lead Source Tracking: Add webhook source columns to leads
-- Supports: Google Ads, Meta Ads, LinkedIn Ads
-- ============================================================

-- Add source tracking columns to existing leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ad_platform TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_campaign_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_campaign_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_set_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_set_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ad_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_content TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_term TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB DEFAULT NULL;

-- Indexes for source tracking queries
CREATE INDEX IF NOT EXISTS idx_leads_ad_platform ON public.leads(ad_platform);
CREATE INDEX IF NOT EXISTS idx_leads_ad_campaign_id ON public.leads(ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_webhook_source ON public.leads(webhook_source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON public.leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_webhook_received_at ON public.leads(webhook_received_at);

-- Webhook secrets table for verifying incoming webhook requests
CREATE TABLE IF NOT EXISTS public.webhook_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE,
  secret_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_webhook_secrets" ON public.webhook_secrets;
CREATE POLICY "authenticated_manage_webhook_secrets"
ON public.webhook_secrets FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Seed default webhook secrets (users should rotate these in production)
INSERT INTO public.webhook_secrets (platform, secret_token) VALUES
  ('google_ads', 'gads_wh_' || encode(gen_random_bytes(16), 'hex')),
  ('meta_ads',   'meta_wh_' || encode(gen_random_bytes(16), 'hex')),
  ('linkedin_ads', 'li_wh_' || encode(gen_random_bytes(16), 'hex'))
ON CONFLICT (platform) DO NOTHING;
