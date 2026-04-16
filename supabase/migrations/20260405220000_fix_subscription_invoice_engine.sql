-- Fix subscription + invoice engine
-- Ensures invoices.subscription_id can reference subscriptions (not client_subscriptions)
-- and products table is readable by all authenticated users

-- 1. Drop old FK on invoices.subscription_id (points to client_subscriptions)
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;

-- 2. Re-add FK pointing to subscriptions table (nullable, set null on delete)
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES public.subscriptions(id)
  ON DELETE SET NULL;

-- 3. Ensure products is readable by all authenticated users (no company filter)
DROP POLICY IF EXISTS "authenticated_can_read_products" ON public.products;
CREATE POLICY "authenticated_can_read_products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- 4. Ensure subscriptions RLS is correct
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 5. Ensure invoices RLS is correct
DROP POLICY IF EXISTS "users_manage_company_invoices" ON public.invoices;
CREATE POLICY "users_manage_company_invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());
