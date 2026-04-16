-- ============================================================
-- Subscriptions Enhanced: Add plan_id, billing_cycle, amount, discount, final_amount, suspended status
-- ============================================================

-- 1. ADD SUSPENDED TO subscription_status ENUM
-- We need to add 'suspended' value to the existing enum
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'suspended';

-- 2. ENHANCE client_subscriptions TABLE
ALTER TABLE public.client_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.product_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly'::public.billing_cycle,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_plan_id ON public.client_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_billing_cycle ON public.client_subscriptions(billing_cycle);

-- 4. UPDATE AUTO-EXPIRE TRIGGER FUNCTION to handle suspended status
CREATE OR REPLACE FUNCTION public.auto_expire_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active'::public.subscription_status THEN
    NEW.status := 'expired'::public.subscription_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. UNIQUE INDEX: prevent duplicate active subscription for same client+product
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_subscriptions_unique_active
  ON public.client_subscriptions(client_id, product_id)
  WHERE status = 'active';

-- 6. UPDATE EXISTING MOCK DATA with amount/final_amount
DO $$
BEGIN
  UPDATE public.client_subscriptions
  SET
    amount = COALESCE(
      (SELECT pp.price FROM public.product_plans pp
       WHERE pp.product_id = client_subscriptions.product_id
       AND pp.plan_name = client_subscriptions.plan_name
       LIMIT 1),
      0
    ),
    final_amount = COALESCE(
      (SELECT pp.price FROM public.product_plans pp
       WHERE pp.product_id = client_subscriptions.product_id
       AND pp.plan_name = client_subscriptions.plan_name
       LIMIT 1),
      0
    )
  WHERE amount = 0;

  -- Link plan_id for existing subscriptions
  UPDATE public.client_subscriptions cs
  SET plan_id = (
    SELECT pp.id FROM public.product_plans pp
    WHERE pp.product_id = cs.product_id
    AND pp.plan_name = cs.plan_name
    LIMIT 1
  )
  WHERE cs.plan_id IS NULL;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data update failed: %', SQLERRM;
END $$;
