-- ============================================================
-- Products Module: Enhance products table + product_plans
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.product_type CASCADE;
CREATE TYPE public.product_type AS ENUM ('web_app', 'mobile_app', 'both');

DROP TYPE IF EXISTS public.product_status CASCADE;
CREATE TYPE public.product_status AS ENUM ('active', 'inactive');

DROP TYPE IF EXISTS public.billing_cycle CASCADE;
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');

DROP TYPE IF EXISTS public.plan_status CASCADE;
CREATE TYPE public.plan_status AS ENUM ('active', 'inactive');

-- 2. ENHANCE PRODUCTS TABLE (add new columns)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS domain_url TEXT,
  ADD COLUMN IF NOT EXISTS product_type public.product_type NOT NULL DEFAULT 'web_app'::public.product_type,
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'active'::public.product_status,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Unique index on product_code (partial, only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_code ON public.products(product_code)
  WHERE product_code IS NOT NULL;

-- 3. PRODUCT PLANS TABLE
CREATE TABLE IF NOT EXISTS public.product_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly'::public.billing_cycle,
  features TEXT,
  status public.plan_status NOT NULL DEFAULT 'active'::public.plan_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_plans_product_id ON public.product_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_product_plans_status ON public.product_plans(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON public.products(product_code);

-- 5. FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_product_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 6. ENABLE RLS
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- products: already has RLS from previous migration, add manage policy
DROP POLICY IF EXISTS "authenticated_manage_products_full" ON public.products;
CREATE POLICY "authenticated_manage_products_full"
ON public.products FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- product_plans
DROP POLICY IF EXISTS "authenticated_read_product_plans" ON public.product_plans;
CREATE POLICY "authenticated_read_product_plans"
ON public.product_plans FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_manage_product_plans" ON public.product_plans;
CREATE POLICY "authenticated_manage_product_plans"
ON public.product_plans FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 8. TRIGGERS
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_product_updated_at();

DROP TRIGGER IF EXISTS set_product_plans_updated_at ON public.product_plans;
CREATE TRIGGER set_product_plans_updated_at
  BEFORE UPDATE ON public.product_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_product_updated_at();

-- 9. MOCK DATA: Enhance existing products and add plans
DO $$
DECLARE
  prod1_id UUID;
  prod2_id UUID;
  prod3_id UUID;
  new_prod_id UUID := gen_random_uuid();
BEGIN
  -- Get existing product IDs
  SELECT id INTO prod1_id FROM public.products ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO prod2_id FROM public.products ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO prod3_id FROM public.products ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  -- Update existing products with new fields
  IF prod1_id IS NOT NULL THEN
    UPDATE public.products SET
      product_code = 'CRMPROAPP',
      domain_url = 'https://crmpro.shaarvik.com',
      product_type = 'web_app'::public.product_type,
      status = 'active'::public.product_status
    WHERE id = prod1_id AND product_code IS NULL;
  END IF;

  IF prod2_id IS NOT NULL THEN
    UPDATE public.products SET
      product_code = 'EMAILMKTG',
      domain_url = 'https://emailmktg.shaarvik.com',
      product_type = 'web_app'::public.product_type,
      status = 'active'::public.product_status
    WHERE id = prod2_id AND product_code IS NULL;
  END IF;

  IF prod3_id IS NOT NULL THEN
    UPDATE public.products SET
      product_code = 'SUPPORTDSK',
      domain_url = 'https://support.shaarvik.com',
      product_type = 'both'::public.product_type,
      status = 'active'::public.product_status
    WHERE id = prod3_id AND product_code IS NULL;
  END IF;

  -- Add a 4th product
  INSERT INTO public.products (id, name, product_code, description, domain_url, product_type, status)
  VALUES (
    new_prod_id,
    'HR Suite',
    'HRSUITE',
    'Human resource management and payroll system',
    'https://hr.shaarvik.com',
    'web_app'::public.product_type,
    'inactive'::public.product_status
  ) ON CONFLICT DO NOTHING;

  -- Add plans for prod1 (CRM Pro)
  IF prod1_id IS NOT NULL THEN
    INSERT INTO public.product_plans (product_id, plan_name, price, billing_cycle, features, status)
    VALUES
      (prod1_id, 'Basic', 999.00, 'monthly'::public.billing_cycle, 'Up to 5 users, 1000 contacts, Email support', 'active'::public.plan_status),
      (prod1_id, 'Pro', 2499.00, 'monthly'::public.billing_cycle, 'Up to 25 users, Unlimited contacts, Priority support, Analytics', 'active'::public.plan_status),
      (prod1_id, 'Enterprise', 19999.00, 'yearly'::public.billing_cycle, 'Unlimited users, Custom integrations, Dedicated support, SLA', 'active'::public.plan_status)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Add plans for prod2 (Email Marketing)
  IF prod2_id IS NOT NULL THEN
    INSERT INTO public.product_plans (product_id, plan_name, price, billing_cycle, features, status)
    VALUES
      (prod2_id, 'Starter', 499.00, 'monthly'::public.billing_cycle, '10,000 emails/month, Basic templates, Reports', 'active'::public.plan_status),
      (prod2_id, 'Growth', 1499.00, 'monthly'::public.billing_cycle, '100,000 emails/month, Advanced automation, A/B testing', 'active'::public.plan_status)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Add plans for prod3 (Support Desk)
  IF prod3_id IS NOT NULL THEN
    INSERT INTO public.product_plans (product_id, plan_name, price, billing_cycle, features, status)
    VALUES
      (prod3_id, 'Basic', 799.00, 'monthly'::public.billing_cycle, '3 agents, Email ticketing, Knowledge base', 'active'::public.plan_status),
      (prod3_id, 'Pro', 1999.00, 'monthly'::public.billing_cycle, '10 agents, Multi-channel, SLA management, Reports', 'active'::public.plan_status)
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Products mock data failed: %', SQLERRM;
END $$;
