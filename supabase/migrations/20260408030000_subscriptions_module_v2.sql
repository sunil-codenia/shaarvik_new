-- ============================================================
-- Subscriptions Module v2: Enhance subscriptions table
-- Links to clients, saas_plans, and adds payment details
-- Depends on: clients, saas_plans, companies
-- ============================================================

-- 1. ADD MISSING COLUMNS TO subscriptions TABLE
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS saas_plan_id UUID REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'online'
    CHECK (payment_mode IN ('online', 'bank_transfer', 'cash', 'cheque', 'upi')),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_saas_plan_id ON public.subscriptions(saas_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON public.subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4. ENABLE RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_subscriptions_v2" ON public.subscriptions;
CREATE POLICY "authenticated_manage_subscriptions_v2"
ON public.subscriptions FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 6. TRIGGERS
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_subscriptions_updated_at();

-- 7. SAMPLE DATA
DO $$
DECLARE
  client1_id UUID;
  client2_id UUID;
  company1_id UUID;
  plan1_id UUID;
  plan2_id UUID;
  plan3_id UUID;
BEGIN
  SELECT id INTO client1_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO client2_id FROM public.clients ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO company1_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO plan1_id FROM public.saas_plans ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO plan2_id FROM public.saas_plans ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO plan3_id FROM public.saas_plans ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  IF client1_id IS NOT NULL AND plan1_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      id, client_id, saas_plan_id, company_id,
      start_date, end_date, status, billing_cycle,
      payment_mode, amount, amount_paid, notes
    )
    VALUES
      (
        gen_random_uuid(), client1_id, plan1_id, company1_id,
        CURRENT_DATE - INTERVAL '60 days',
        CURRENT_DATE + INTERVAL '305 days',
        'active', 'monthly', 'upi',
        2999.00, 2999.00,
        'Starter plan — monthly billing'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF client2_id IS NOT NULL AND client2_id != client1_id AND plan2_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      id, client_id, saas_plan_id, company_id,
      start_date, end_date, status, billing_cycle,
      payment_mode, amount, amount_paid, notes
    )
    VALUES
      (
        gen_random_uuid(), client2_id, plan2_id, company1_id,
        CURRENT_DATE - INTERVAL '15 days',
        CURRENT_DATE + INTERVAL '350 days',
        'active', 'yearly', 'bank_transfer',
        7499.00, 7499.00,
        'Growth plan — yearly billing'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF client1_id IS NOT NULL AND plan3_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      id, client_id, saas_plan_id, company_id,
      start_date, end_date, status, billing_cycle,
      payment_mode, amount, amount_paid, notes
    )
    VALUES
      (
        gen_random_uuid(), client1_id, plan3_id, company1_id,
        CURRENT_DATE - INTERVAL '200 days',
        CURRENT_DATE - INTERVAL '5 days',
        'expired', 'monthly', 'cash',
        4999.00, 4999.00,
        'Professional plan — expired'
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample subscription data insertion failed: %', SQLERRM;
END $$;
