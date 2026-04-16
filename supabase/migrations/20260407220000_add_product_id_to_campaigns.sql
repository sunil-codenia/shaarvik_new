-- ============================================================
-- Add product_id, client_id, created_by_staff_id to campaigns
-- Enables multi-product SaaS architecture
-- ============================================================

-- 1. Add product_id column (required for product-scoped queries)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT 'BUILDARYA';

-- 2. Add client_id column (optional — links campaign to a specific client)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 3. Add created_by_staff_id column (optional — tracks which staff created the campaign)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID;

-- 4. Index for fast product-scoped queries
CREATE INDEX IF NOT EXISTS idx_campaigns_product_id ON public.campaigns(product_id);

-- 5. Index for client-scoped queries
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON public.campaigns(client_id);

-- 6. Backfill existing campaigns with default product_id
UPDATE public.campaigns SET product_id = 'BUILDARYA' WHERE product_id IS NULL OR product_id = '';
