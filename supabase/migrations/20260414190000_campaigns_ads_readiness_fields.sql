-- Add missing Google Ads & Meta Ads fields to campaigns table
-- Conversion goals, CTA type, negative keywords, ad account ID, platform campaign ID

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS conversion_goal text,
  ADD COLUMN IF NOT EXISTS cta_type text,
  ADD COLUMN IF NOT EXISTS negative_keywords text,
  ADD COLUMN IF NOT EXISTS ad_account_id text,
  ADD COLUMN IF NOT EXISTS platform_campaign_id text;
