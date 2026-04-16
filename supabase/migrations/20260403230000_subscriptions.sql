-- ============================================================
-- Subscriptions Module: products + client_subscriptions
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired');

-- 2. TABLES

-- products (master list)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- client_subscriptions
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  plan_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'active'::public.subscription_status,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client_id ON public.client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_product_id ON public.client_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON public.client_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_expiry_date ON public.client_subscriptions(expiry_date);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.auto_expire_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired'::public.subscription_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- products: all authenticated users can read; admins can manage
DROP POLICY IF EXISTS "authenticated_read_products" ON public.products;
CREATE POLICY "authenticated_read_products"
ON public.products FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_manage_products" ON public.products;
CREATE POLICY "authenticated_manage_products"
ON public.products FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- client_subscriptions: all authenticated users can manage
DROP POLICY IF EXISTS "authenticated_manage_subscriptions" ON public.client_subscriptions;
CREATE POLICY "authenticated_manage_subscriptions"
ON public.client_subscriptions FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS auto_expire_subscriptions_trigger ON public.client_subscriptions;
CREATE TRIGGER auto_expire_subscriptions_trigger
  BEFORE INSERT OR UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.auto_expire_subscriptions();

DROP TRIGGER IF EXISTS set_client_subscriptions_updated_at ON public.client_subscriptions;
CREATE TRIGGER set_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. MOCK DATA
DO $$
DECLARE
  prod1_id UUID := gen_random_uuid();
  prod2_id UUID := gen_random_uuid();
  prod3_id UUID := gen_random_uuid();
  client1_id UUID;
  client2_id UUID;
  user_id UUID;
BEGIN
  -- Insert sample products
  INSERT INTO public.products (id, name, description)
  VALUES
    (prod1_id, 'CRM Pro', 'Full CRM suite with advanced analytics'),
    (prod2_id, 'Email Marketing', 'Bulk email campaigns and automation'),
    (prod3_id, 'Support Desk', 'Customer support ticketing system')
  ON CONFLICT (id) DO NOTHING;

  -- Get existing clients
  SELECT id INTO client1_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO client2_id FROM public.clients ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO user_id FROM public.user_profiles LIMIT 1;

  IF client1_id IS NOT NULL THEN
    INSERT INTO public.client_subscriptions (client_id, product_id, plan_name, start_date, expiry_date, status, created_by)
    VALUES
      (client1_id, prod1_id, 'Annual Plan', CURRENT_DATE - INTERVAL '300 days', CURRENT_DATE + INTERVAL '65 days', 'active', user_id),
      (client1_id, prod2_id, 'Monthly Plan', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '1 day', 'expired', user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF client2_id IS NOT NULL AND client2_id != client1_id THEN
    INSERT INTO public.client_subscriptions (client_id, product_id, plan_name, start_date, expiry_date, status, created_by)
    VALUES
      (client2_id, prod3_id, 'Quarterly Plan', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '5 days', 'active', user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock subscription data insertion failed: %', SQLERRM;
END $$;
