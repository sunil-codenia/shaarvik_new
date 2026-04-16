-- ============================================================
-- Fix RLS Policies: Allow admins to manage all records
-- and fix user_profiles insert for staff management
-- ============================================================

-- 1. Fix user_profiles RLS: allow admins to manage all profiles
-- Also allow inserting profiles without auth.uid() match (for admin-created staff)

DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin_view_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_view_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (true);

-- 2. Create a SECURITY DEFINER function for admin staff insert
-- This bypasses RLS to allow admins to create staff profiles directly
CREATE OR REPLACE FUNCTION public.admin_create_staff_profile(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_staff_role_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Only allow admins to call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, phone, staff_role_id, status, role)
  VALUES (
    new_id,
    p_email,
    p_full_name,
    p_phone,
    p_staff_role_id,
    p_status,
    'staff'::public.user_role
  )
  ON CONFLICT (email) DO NOTHING;

  -- Return the id (or existing id if conflict)
  SELECT id INTO new_id FROM public.user_profiles WHERE email = p_email LIMIT 1;
  RETURN new_id;
END;
$$;

-- 3. Fix clients table RLS - allow all authenticated users to manage
DROP POLICY IF EXISTS "authenticated_manage_clients" ON public.clients;
CREATE POLICY "authenticated_manage_clients"
ON public.clients FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Fix invoices table RLS
DROP POLICY IF EXISTS "authenticated_manage_invoices" ON public.invoices;
CREATE POLICY "authenticated_manage_invoices"
ON public.invoices FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Fix invoice_payments table RLS
DROP POLICY IF EXISTS "authenticated_manage_invoice_payments" ON public.invoice_payments;
CREATE POLICY "authenticated_manage_invoice_payments"
ON public.invoice_payments FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Fix support_tickets table RLS
DROP POLICY IF EXISTS "authenticated_manage_support_tickets" ON public.support_tickets;
CREATE POLICY "authenticated_manage_support_tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Fix ticket_assignees table RLS
DROP POLICY IF EXISTS "authenticated_manage_ticket_assignees" ON public.ticket_assignees;
CREATE POLICY "authenticated_manage_ticket_assignees"
ON public.ticket_assignees FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 8. Fix ticket_comments table RLS
DROP POLICY IF EXISTS "authenticated_manage_ticket_comments" ON public.ticket_comments;
CREATE POLICY "authenticated_manage_ticket_comments"
ON public.ticket_comments FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Fix client_subscriptions table RLS
DROP POLICY IF EXISTS "authenticated_manage_client_subscriptions" ON public.client_subscriptions;
CREATE POLICY "authenticated_manage_client_subscriptions"
ON public.client_subscriptions FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 10. Fix client_usage table RLS
DROP POLICY IF EXISTS "authenticated_manage_client_usage" ON public.client_usage;
CREATE POLICY "authenticated_manage_client_usage"
ON public.client_usage FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 11. Fix products table RLS
DROP POLICY IF EXISTS "authenticated_manage_products" ON public.products;
CREATE POLICY "authenticated_manage_products"
ON public.products FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 12. Fix product_plans table RLS
DROP POLICY IF EXISTS "authenticated_manage_product_plans" ON public.product_plans;
CREATE POLICY "authenticated_manage_product_plans"
ON public.product_plans FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 13. Fix product_features table RLS
DROP POLICY IF EXISTS "authenticated_manage_product_features" ON public.product_features;
CREATE POLICY "authenticated_manage_product_features"
ON public.product_features FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 14. Fix plan_features table RLS
DROP POLICY IF EXISTS "authenticated_manage_plan_features" ON public.plan_features;
CREATE POLICY "authenticated_manage_plan_features"
ON public.plan_features FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 15. Fix audit_logs table RLS
DROP POLICY IF EXISTS "authenticated_manage_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_manage_audit_logs"
ON public.audit_logs FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 16. Fix website_leads table RLS - allow public insert + authenticated manage
DROP POLICY IF EXISTS "public_insert_website_leads" ON public.website_leads;
CREATE POLICY "public_insert_website_leads"
ON public.website_leads FOR INSERT TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_website_leads" ON public.website_leads;
CREATE POLICY "authenticated_manage_website_leads"
ON public.website_leads FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 17. Fix signup_leads table RLS
DROP POLICY IF EXISTS "public_manage_signup_leads" ON public.signup_leads;
CREATE POLICY "public_manage_signup_leads"
ON public.signup_leads FOR ALL TO public
USING (true)
WITH CHECK (true);
