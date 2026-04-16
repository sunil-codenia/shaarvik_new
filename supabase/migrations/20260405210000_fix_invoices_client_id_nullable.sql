-- Fix invoices and support_tickets: make client_id nullable
-- This allows company-scoped inserts without requiring a client record

-- 1. Make invoices.client_id nullable (was NOT NULL, blocks payment page inserts)
ALTER TABLE public.invoices
  ALTER COLUMN client_id DROP NOT NULL;

-- 2. Make support_tickets.client_id nullable
ALTER TABLE public.support_tickets
  ALTER COLUMN client_id DROP NOT NULL;

-- 3. Ensure subscriptions RLS is correct (company-scoped)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_subscriptions_v2" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions_v2"
ON public.subscriptions
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 4. Allow anon/authenticated to read products (SaaS catalog — no company filter needed)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_authenticated_read_products" ON public.products;
CREATE POLICY "all_authenticated_read_products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- 5. Ensure companies INSERT policy exists for signup flow
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signup_insert_company" ON public.companies;
CREATE POLICY "signup_insert_company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Ensure user_profiles can be updated (to set company_id after signup)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_profiles_v2" ON public.user_profiles;
CREATE POLICY "users_manage_own_profiles_v2"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 7. Campaigns: ensure company_id-based RLS (not user_id)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_company_campaigns_v2" ON public.campaigns;
CREATE POLICY "users_manage_company_campaigns_v2"
ON public.campaigns
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 8. Leads: ensure company_id-based RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_company_leads_v2" ON public.leads;
CREATE POLICY "users_manage_company_leads_v2"
ON public.leads
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 9. Invoices: ensure company_id-based RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_company_invoices_v2" ON public.invoices;
CREATE POLICY "users_manage_company_invoices_v2"
ON public.invoices
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());
