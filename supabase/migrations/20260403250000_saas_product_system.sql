-- ============================================================
-- SaaS Product Management System: Features, Plan Features, Resource Limits, Usage
-- ============================================================

-- 1. ADD RESOURCE LIMIT COLUMNS TO product_plans
ALTER TABLE public.product_plans
  ADD COLUMN IF NOT EXISTS max_users INTEGER,
  ADD COLUMN IF NOT EXISTS storage_limit_gb NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS api_limit INTEGER,
  ADD COLUMN IF NOT EXISTS extra_user_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS extra_storage_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS extra_api_price NUMERIC(10,2);

-- 2. PRODUCT FEATURES TABLE
CREATE TABLE IF NOT EXISTS public.product_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  description TEXT,
  status public.plan_status NOT NULL DEFAULT 'active'::public.plan_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PLAN FEATURES MAPPING TABLE
CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id UUID NOT NULL REFERENCES public.product_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.product_features(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, feature_id)
);

-- 4. CLIENT USAGE TABLE
CREATE TABLE IF NOT EXISTS public.client_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_used_gb NUMERIC(10,2) NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  api_usage INTEGER,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON public.product_features(product_id);
CREATE INDEX IF NOT EXISTS idx_product_features_status ON public.product_features(status);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_id ON public.plan_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_client_usage_client_id ON public.client_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_client_usage_product_id ON public.client_usage(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_usage_client_product ON public.client_usage(client_id, product_id);

-- 6. UPDATED_AT TRIGGER FUNCTION (reuse existing)
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 7. ENABLE RLS
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_usage ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- product_features
DROP POLICY IF EXISTS "authenticated_manage_product_features" ON public.product_features;
CREATE POLICY "authenticated_manage_product_features"
ON public.product_features FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- plan_features
DROP POLICY IF EXISTS "authenticated_manage_plan_features" ON public.plan_features;
CREATE POLICY "authenticated_manage_plan_features"
ON public.plan_features FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- client_usage
DROP POLICY IF EXISTS "authenticated_manage_client_usage" ON public.client_usage;
CREATE POLICY "authenticated_manage_client_usage"
ON public.client_usage FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 9. TRIGGERS
DROP TRIGGER IF EXISTS set_product_features_updated_at ON public.product_features;
CREATE TRIGGER set_product_features_updated_at
  BEFORE UPDATE ON public.product_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_client_usage_updated_at ON public.client_usage;
CREATE TRIGGER set_client_usage_updated_at
  BEFORE UPDATE ON public.client_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 10. UPDATE EXISTING PLANS WITH RESOURCE LIMITS MOCK DATA
DO $$
DECLARE
  plan_rec RECORD;
BEGIN
  -- Update plans with resource limits based on plan name
  FOR plan_rec IN SELECT id, plan_name FROM public.product_plans LOOP
    IF plan_rec.plan_name ILIKE '%basic%' OR plan_rec.plan_name ILIKE '%starter%' THEN
      UPDATE public.product_plans SET
        max_users = 5,
        storage_limit_gb = 10,
        api_limit = 10000,
        extra_user_price = 199,
        extra_storage_price = 50,
        extra_api_price = 0.01
      WHERE id = plan_rec.id AND max_users IS NULL;
    ELSIF plan_rec.plan_name ILIKE '%pro%' OR plan_rec.plan_name ILIKE '%growth%' THEN
      UPDATE public.product_plans SET
        max_users = 25,
        storage_limit_gb = 50,
        api_limit = 100000,
        extra_user_price = 149,
        extra_storage_price = 30,
        extra_api_price = 0.005
      WHERE id = plan_rec.id AND max_users IS NULL;
    ELSIF plan_rec.plan_name ILIKE '%enterprise%' THEN
      UPDATE public.product_plans SET
        max_users = 100,
        storage_limit_gb = 500,
        api_limit = 1000000,
        extra_user_price = 99,
        extra_storage_price = 20,
        extra_api_price = 0.002
      WHERE id = plan_rec.id AND max_users IS NULL;
    END IF;
  END LOOP;

  -- Add product features for existing products
  DECLARE
    prod_id UUID;
    feat1_id UUID := gen_random_uuid();
    feat2_id UUID := gen_random_uuid();
    feat3_id UUID := gen_random_uuid();
    feat4_id UUID := gen_random_uuid();
    plan_basic_id UUID;
    plan_pro_id UUID;
  BEGIN
    SELECT id INTO prod_id FROM public.products WHERE product_code = 'CRMPROAPP' LIMIT 1;
    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_features (id, product_id, feature_name, description, status)
      VALUES
        (feat1_id, prod_id, 'Contact Management', 'Manage unlimited contacts and companies', 'active'::public.plan_status),
        (feat2_id, prod_id, 'Email Integration', 'Two-way email sync and tracking', 'active'::public.plan_status),
        (feat3_id, prod_id, 'Analytics Dashboard', 'Advanced reporting and insights', 'active'::public.plan_status),
        (feat4_id, prod_id, 'API Access', 'Full REST API access', 'active'::public.plan_status)
      ON CONFLICT (id) DO NOTHING;

      SELECT id INTO plan_basic_id FROM public.product_plans WHERE product_id = prod_id AND plan_name ILIKE '%basic%' LIMIT 1;
      SELECT id INTO plan_pro_id FROM public.product_plans WHERE product_id = prod_id AND plan_name ILIKE '%pro%' LIMIT 1;

      IF plan_basic_id IS NOT NULL THEN
        INSERT INTO public.plan_features (plan_id, feature_id) VALUES
          (plan_basic_id, feat1_id),
          (plan_basic_id, feat2_id)
        ON CONFLICT DO NOTHING;
      END IF;

      IF plan_pro_id IS NOT NULL THEN
        INSERT INTO public.plan_features (plan_id, feature_id) VALUES
          (plan_pro_id, feat1_id),
          (plan_pro_id, feat2_id),
          (plan_pro_id, feat3_id),
          (plan_pro_id, feat4_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data failed: %', SQLERRM;
END $$;
