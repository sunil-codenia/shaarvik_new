-- ============================================================
-- Add monthly_price and yearly_price to product_plans
-- Remove billing_cycle dependency from plan creation
-- ============================================================

-- 1. Add monthly_price and yearly_price columns
ALTER TABLE public.product_plans
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS yearly_price NUMERIC(10, 2);

-- 2. Backfill: copy existing price into monthly_price for monthly plans,
--    and into yearly_price for yearly plans
UPDATE public.product_plans
  SET monthly_price = price
  WHERE billing_cycle = 'monthly' AND monthly_price IS NULL;

UPDATE public.product_plans
  SET yearly_price = price
  WHERE billing_cycle = 'yearly' AND yearly_price IS NULL;

-- 3. Make billing_cycle nullable (no longer required at plan creation)
ALTER TABLE public.product_plans
  ALTER COLUMN billing_cycle DROP NOT NULL;
