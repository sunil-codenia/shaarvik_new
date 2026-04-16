-- ============================================================
-- Expand campaigns table with ad platform fields
-- ============================================================

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS daily_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS bid_strategy TEXT,
  ADD COLUMN IF NOT EXISTS ad_format TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_targeting JSONB;
