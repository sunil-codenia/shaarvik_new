-- ============================================================
-- Usage Tracking & Enhanced Product Plans
-- ============================================================

-- 1. ENHANCE product_plans TABLE: add resource limits + extra usage pricing
ALTER TABLE public.product_plans
  ADD COLUMN IF NOT EXISTS max_users INTEGER,
  ADD COLUMN IF NOT EXISTS storage_limit_gb NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS api_limit INTEGER,
  ADD COLUMN IF NOT EXISTS extra_storage_price NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS extra_user_price NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS extra_api_price NUMERIC(10, 4);

-- 2. CREATE client_usage TABLE
CREATE TABLE IF NOT EXISTS public.client_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_used_gb NUMERIC(10, 4) NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  api_calls_used INTEGER,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_client_usage_client_id ON public.client_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_client_usage_product_id ON public.client_usage(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_usage_client_product ON public.client_usage(client_id, product_id);

-- 4. ENABLE RLS
ALTER TABLE public.client_usage ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_client_usage" ON public.client_usage;
CREATE POLICY "authenticated_manage_client_usage"
ON public.client_usage FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 6. TRIGGER FUNCTION for last_updated
CREATE OR REPLACE FUNCTION public.set_client_usage_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_client_usage_updated_at ON public.client_usage;
CREATE TRIGGER set_client_usage_updated_at
  BEFORE UPDATE ON public.client_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_client_usage_updated_at();

-- 7. UPDATE existing plans with resource limits (mock data)
DO $$
DECLARE
  prod1_id UUID;
  prod2_id UUID;
  prod3_id UUID;
  client1_id UUID;
  client2_id UUID;
BEGIN
  -- Get product IDs
  SELECT id INTO prod1_id FROM public.products WHERE product_code = 'CRMPROAPP' LIMIT 1;
  SELECT id INTO prod2_id FROM public.products WHERE product_code = 'EMAILMKTG' LIMIT 1;
  SELECT id INTO prod3_id FROM public.products WHERE product_code = 'SUPPORTDSK' LIMIT 1;

  -- Update plans for prod1 (CRM Pro) with limits
  IF prod1_id IS NOT NULL THEN
    UPDATE public.product_plans SET
      max_users = 5,
      storage_limit_gb = 10,
      api_limit = 10000,
      extra_storage_price = 0.50,
      extra_user_price = 199.00,
      extra_api_price = 0.01
    WHERE product_id = prod1_id AND plan_name = 'Basic';

    UPDATE public.product_plans SET
      max_users = 25,
      storage_limit_gb = 50,
      api_limit = 100000,
      extra_storage_price = 0.40,
      extra_user_price = 149.00,
      extra_api_price = 0.008
    WHERE product_id = prod1_id AND plan_name = 'Pro';

    UPDATE public.product_plans SET
      max_users = NULL,
      storage_limit_gb = 500,
      api_limit = NULL,
      extra_storage_price = 0.30,
      extra_user_price = 99.00,
      extra_api_price = 0.005
    WHERE product_id = prod1_id AND plan_name = 'Enterprise';
  END IF;

  -- Update plans for prod2 (Email Marketing)
  IF prod2_id IS NOT NULL THEN
    UPDATE public.product_plans SET
      max_users = 3,
      storage_limit_gb = 5,
      api_limit = 10000,
      extra_storage_price = 0.60,
      extra_user_price = 299.00,
      extra_api_price = 0.02
    WHERE product_id = prod2_id AND plan_name = 'Starter';

    UPDATE public.product_plans SET
      max_users = 10,
      storage_limit_gb = 25,
      api_limit = 100000,
      extra_storage_price = 0.45,
      extra_user_price = 199.00,
      extra_api_price = 0.01
    WHERE product_id = prod2_id AND plan_name = 'Growth';
  END IF;

  -- Update plans for prod3 (Support Desk)
  IF prod3_id IS NOT NULL THEN
    UPDATE public.product_plans SET
      max_users = 3,
      storage_limit_gb = 10,
      api_limit = NULL,
      extra_storage_price = 0.50,
      extra_user_price = 249.00,
      extra_api_price = NULL
    WHERE product_id = prod3_id AND plan_name = 'Basic';

    UPDATE public.product_plans SET
      max_users = 10,
      storage_limit_gb = 50,
      api_limit = NULL,
      extra_storage_price = 0.35,
      extra_user_price = 179.00,
      extra_api_price = NULL
    WHERE product_id = prod3_id AND plan_name = 'Pro';
  END IF;

  -- Add sample usage records for existing clients
  SELECT id INTO client1_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO client2_id FROM public.clients ORDER BY created_at ASC OFFSET 1 LIMIT 1;

  IF client1_id IS NOT NULL AND prod1_id IS NOT NULL THEN
    INSERT INTO public.client_usage (client_id, product_id, storage_used_gb, active_users, api_calls_used)
    VALUES (client1_id, prod1_id, 8.5, 4, 8200)
    ON CONFLICT (client_id, product_id) DO NOTHING;
  END IF;

  IF client2_id IS NOT NULL AND prod1_id IS NOT NULL THEN
    INSERT INTO public.client_usage (client_id, product_id, storage_used_gb, active_users, api_calls_used)
    VALUES (client2_id, prod1_id, 52.3, 27, 105000)
    ON CONFLICT (client_id, product_id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Usage tracking mock data failed: %', SQLERRM;
END $$;
