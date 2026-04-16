-- ============================================================
-- SaaS Plans: saas_plans + saas_plan_modules
-- Depends on: saas_platforms, saas_modules
-- ============================================================

-- 1. SAAS PLANS TABLE
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id     UUID NOT NULL REFERENCES public.saas_platforms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  billing_cycle   TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  trial_days      INTEGER DEFAULT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PLAN MODULES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.saas_plan_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  module_id   UUID NOT NULL REFERENCES public.saas_modules(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, module_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_saas_plans_platform_id ON public.saas_plans(platform_id);
CREATE INDEX IF NOT EXISTS idx_saas_plans_is_active ON public.saas_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_saas_plan_modules_plan_id ON public.saas_plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_saas_plan_modules_module_id ON public.saas_plan_modules(module_id);

-- 4. UPDATED_AT TRIGGER FUNCTION (reuse existing or create)
CREATE OR REPLACE FUNCTION public.set_saas_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_modules ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_saas_plans" ON public.saas_plans;
CREATE POLICY "authenticated_manage_saas_plans"
ON public.saas_plans FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_saas_plan_modules" ON public.saas_plan_modules;
CREATE POLICY "authenticated_manage_saas_plan_modules"
ON public.saas_plan_modules FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS set_saas_plans_updated_at ON public.saas_plans;
CREATE TRIGGER set_saas_plans_updated_at
  BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_saas_plans_updated_at();

-- 8. SAMPLE DATA
DO $$
DECLARE
  platform1_id UUID;
  platform2_id UUID;
  plan1_id UUID := gen_random_uuid();
  plan2_id UUID := gen_random_uuid();
  plan3_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO platform1_id FROM public.saas_platforms WHERE name = 'Shaarvik ERP' LIMIT 1;
  SELECT id INTO platform2_id FROM public.saas_platforms WHERE name = 'Buildarya CRM' LIMIT 1;

  IF platform1_id IS NOT NULL THEN
    INSERT INTO public.saas_plans (id, platform_id, name, price, billing_cycle, trial_days, description, is_active)
    VALUES
      (plan1_id, platform1_id, 'Starter', 2999.00, 'monthly', 14, 'HR + Accounts for small teams', true),
      (plan2_id, platform1_id, 'Growth', 7499.00, 'monthly', 7, 'Full ERP suite for growing businesses', true)
    ON CONFLICT (id) DO NOTHING;

    -- Attach modules to plan1 (HR + Accounts)
    INSERT INTO public.saas_plan_modules (plan_id, module_id)
    SELECT plan1_id, id FROM public.saas_modules
    WHERE platform_id = platform1_id AND name IN ('HR Management', 'Accounts & Finance')
    ON CONFLICT (plan_id, module_id) DO NOTHING;

    -- Attach all modules to plan2
    INSERT INTO public.saas_plan_modules (plan_id, module_id)
    SELECT plan2_id, id FROM public.saas_modules
    WHERE platform_id = platform1_id
    ON CONFLICT (plan_id, module_id) DO NOTHING;
  END IF;

  IF platform2_id IS NOT NULL THEN
    INSERT INTO public.saas_plans (id, platform_id, name, price, billing_cycle, trial_days, description, is_active)
    VALUES
      (plan3_id, platform2_id, 'Professional', 4999.00, 'monthly', 30, 'Complete CRM for real estate teams', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.saas_plan_modules (plan_id, module_id)
    SELECT plan3_id, id FROM public.saas_modules
    WHERE platform_id = platform2_id
    ON CONFLICT (plan_id, module_id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample data insertion failed: %', SQLERRM;
END $$;
