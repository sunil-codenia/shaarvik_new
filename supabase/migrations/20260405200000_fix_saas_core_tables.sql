-- Fix SaaS core tables: subscriptions (UUID-based), companies trigger, RLS
-- Drops old bigint subscriptions table and recreates with UUID + proper FKs

-- 1. Drop old subscriptions table (bigint-based, incompatible with UUID companies/products)
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- 2. Recreate subscriptions with UUID primary key matching companies/products
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  plan        TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'cancelled', 'trial')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON public.subscriptions(product_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage subscriptions for their own company
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 3. Ensure companies table has proper RLS for insert (signup creates company)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert a company (during signup)
DROP POLICY IF EXISTS "authenticated_can_insert_companies" ON public.companies;
CREATE POLICY "authenticated_can_insert_companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can read/update their own company (via user_profiles.company_id)
DROP POLICY IF EXISTS "users_read_own_company" ON public.companies;
CREATE POLICY "users_read_own_company"
ON public.companies
FOR SELECT
TO authenticated
USING (id = public.get_user_company_id());

DROP POLICY IF EXISTS "users_update_own_company" ON public.companies;
CREATE POLICY "users_update_own_company"
ON public.companies
FOR UPDATE
TO authenticated
USING (id = public.get_user_company_id())
WITH CHECK (id = public.get_user_company_id());

-- 4. Ensure leads table has company_id RLS (already has company_id column)
DROP POLICY IF EXISTS "users_manage_company_leads" ON public.leads;
CREATE POLICY "users_manage_company_leads"
ON public.leads
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 5. Ensure campaigns table has company_id RLS
DROP POLICY IF EXISTS "users_manage_company_campaigns" ON public.campaigns;
CREATE POLICY "users_manage_company_campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 6. Ensure invoices table has company_id RLS
DROP POLICY IF EXISTS "users_manage_company_invoices" ON public.invoices;
CREATE POLICY "users_manage_company_invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 7. Products: allow all authenticated users to read (SaaS catalog)
DROP POLICY IF EXISTS "authenticated_can_read_products" ON public.products;
CREATE POLICY "authenticated_can_read_products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- 8. user_profiles: allow users to update their own company_id (set during signup)
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
