-- ============================================================
-- SECURE ALL TABLES WITH PROPER RLS POLICIES
-- Multi-tenant SaaS: data scoped by company_id
-- ============================================================

-- ─── HELPER FUNCTION: get current user's company_id ──────────────────────────
-- SECURITY DEFINER so it can read user_profiles without triggering recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── 1. LEADS ─────────────────────────────────────────────────────────────────
-- Scope: company_id match OR public insert (for website contact form leads)
DROP POLICY IF EXISTS "authenticated_manage_leads" ON public.leads;
DROP POLICY IF EXISTS "public_insert_leads" ON public.leads;
DROP POLICY IF EXISTS "company_manage_leads" ON public.leads;
DROP POLICY IF EXISTS "company_select_leads" ON public.leads;
DROP POLICY IF EXISTS "company_insert_leads" ON public.leads;
DROP POLICY IF EXISTS "company_update_leads" ON public.leads;
DROP POLICY IF EXISTS "company_delete_leads" ON public.leads;

-- Allow unauthenticated inserts (website contact form)
CREATE POLICY "public_insert_leads"
ON public.leads FOR INSERT TO public
WITH CHECK (true);

-- Authenticated users manage leads within their company
CREATE POLICY "company_select_leads"
ON public.leads FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_leads"
ON public.leads FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_leads"
ON public.leads FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 2. CLIENTS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_clients" ON public.clients;
DROP POLICY IF EXISTS "company_manage_clients" ON public.clients;
DROP POLICY IF EXISTS "company_select_clients" ON public.clients;
DROP POLICY IF EXISTS "company_insert_clients" ON public.clients;
DROP POLICY IF EXISTS "company_update_clients" ON public.clients;
DROP POLICY IF EXISTS "company_delete_clients" ON public.clients;

CREATE POLICY "company_select_clients"
ON public.clients FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_clients"
ON public.clients FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_clients"
ON public.clients FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 3. ACTIVITIES ────────────────────────────────────────────────────────────
-- Activities link to clients/leads which are company-scoped.
-- Scope by logged_by user's company via client or lead.
DROP POLICY IF EXISTS "authenticated_manage_activities" ON public.activities;
DROP POLICY IF EXISTS "company_manage_activities" ON public.activities;

-- Allow access if the activity's client belongs to user's company,
-- or if logged_by is in the same company, or client_id is null
CREATE POLICY "company_manage_activities"
ON public.activities FOR ALL TO authenticated
USING (
  logged_by IN (
    SELECT id FROM public.user_profiles WHERE company_id = public.get_user_company_id()
  )
  OR client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id()
  )
  OR (logged_by IS NULL AND client_id IS NULL)
)
WITH CHECK (
  logged_by IN (
    SELECT id FROM public.user_profiles WHERE company_id = public.get_user_company_id()
  )
  OR client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id()
  )
  OR (logged_by IS NULL AND client_id IS NULL)
);

-- ─── 4. TASKS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_manage_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_delete_tasks" ON public.tasks;

CREATE POLICY "company_select_tasks"
ON public.tasks FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_tasks"
ON public.tasks FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 5. PROJECTS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "company_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "company_select_projects" ON public.projects;
DROP POLICY IF EXISTS "company_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "company_update_projects" ON public.projects;
DROP POLICY IF EXISTS "company_delete_projects" ON public.projects;

CREATE POLICY "company_select_projects"
ON public.projects FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_projects"
ON public.projects FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_projects"
ON public.projects FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 6. PRODUCTS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_products" ON public.products;
DROP POLICY IF EXISTS "company_manage_products" ON public.products;
DROP POLICY IF EXISTS "company_select_products" ON public.products;
DROP POLICY IF EXISTS "company_insert_products" ON public.products;
DROP POLICY IF EXISTS "company_update_products" ON public.products;
DROP POLICY IF EXISTS "company_delete_products" ON public.products;

CREATE POLICY "company_select_products"
ON public.products FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_products"
ON public.products FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_products"
ON public.products FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 7. PRODUCT PLANS ─────────────────────────────────────────────────────────
-- Plans belong to products which belong to companies
DROP POLICY IF EXISTS "authenticated_manage_product_plans" ON public.product_plans;
DROP POLICY IF EXISTS "company_manage_product_plans" ON public.product_plans;

CREATE POLICY "company_manage_product_plans"
ON public.product_plans FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 8. PRODUCT FEATURES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_product_features" ON public.product_features;
DROP POLICY IF EXISTS "company_manage_product_features" ON public.product_features;

CREATE POLICY "company_manage_product_features"
ON public.product_features FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 9. PLAN FEATURES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_plan_features" ON public.plan_features;
DROP POLICY IF EXISTS "company_manage_plan_features" ON public.plan_features;

CREATE POLICY "company_manage_plan_features"
ON public.plan_features FOR ALL TO authenticated
USING (
  plan_id IN (
    SELECT pp.id FROM public.product_plans pp
    JOIN public.products p ON pp.product_id = p.id
    WHERE p.company_id = public.get_user_company_id() OR p.company_id IS NULL
  )
)
WITH CHECK (
  plan_id IN (
    SELECT pp.id FROM public.product_plans pp
    JOIN public.products p ON pp.product_id = p.id
    WHERE p.company_id = public.get_user_company_id() OR p.company_id IS NULL
  )
);

-- ─── 10. CAMPAIGNS ────────────────────────────────────────────────────────────
-- Campaigns already have user_id-based policies from previous migrations.
-- Replace with company-scoped policies for consistency.
DROP POLICY IF EXISTS "authenticated_manage_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "users_select_own_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "users_insert_own_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "users_update_own_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "users_delete_own_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_manage_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_select_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_insert_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_update_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "company_delete_campaigns" ON public.campaigns;

CREATE POLICY "company_select_campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_campaigns"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_campaigns"
ON public.campaigns FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_campaigns"
ON public.campaigns FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 11. CAMPAIGN CREATIVES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_campaign_creatives" ON public.campaign_creatives;
DROP POLICY IF EXISTS "company_manage_campaign_creatives" ON public.campaign_creatives;
DROP POLICY IF EXISTS "company_select_campaign_creatives" ON public.campaign_creatives;
DROP POLICY IF EXISTS "company_insert_campaign_creatives" ON public.campaign_creatives;
DROP POLICY IF EXISTS "company_update_campaign_creatives" ON public.campaign_creatives;
DROP POLICY IF EXISTS "company_delete_campaign_creatives" ON public.campaign_creatives;

CREATE POLICY "company_select_campaign_creatives"
ON public.campaign_creatives FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_insert_campaign_creatives"
ON public.campaign_creatives FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_update_campaign_creatives"
ON public.campaign_creatives FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL)
WITH CHECK (company_id = public.get_user_company_id() OR company_id IS NULL);

CREATE POLICY "company_delete_campaign_creatives"
ON public.campaign_creatives FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR company_id IS NULL);

-- ─── 12. CLIENT SUBSCRIPTIONS ─────────────────────────────────────────────────
-- Scope via client → company
DROP POLICY IF EXISTS "authenticated_manage_client_subscriptions" ON public.client_subscriptions;
DROP POLICY IF EXISTS "company_manage_client_subscriptions" ON public.client_subscriptions;

CREATE POLICY "company_manage_client_subscriptions"
ON public.client_subscriptions FOR ALL TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 13. CLIENT USAGE ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_client_usage" ON public.client_usage;
DROP POLICY IF EXISTS "company_manage_client_usage" ON public.client_usage;

CREATE POLICY "company_manage_client_usage"
ON public.client_usage FOR ALL TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 14. INVOICES ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_invoices" ON public.invoices;
DROP POLICY IF EXISTS "company_manage_invoices" ON public.invoices;

CREATE POLICY "company_manage_invoices"
ON public.invoices FOR ALL TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 15. INVOICE PAYMENTS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_invoice_payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "company_manage_invoice_payments" ON public.invoice_payments;

CREATE POLICY "company_manage_invoice_payments"
ON public.invoice_payments FOR ALL TO authenticated
USING (
  invoice_id IN (
    SELECT inv.id FROM public.invoices inv
    JOIN public.clients c ON inv.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
)
WITH CHECK (
  invoice_id IN (
    SELECT inv.id FROM public.invoices inv
    JOIN public.clients c ON inv.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
);

-- ─── 16. SUPPORT TICKETS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "company_manage_support_tickets" ON public.support_tickets;

CREATE POLICY "company_manage_support_tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE company_id = public.get_user_company_id() OR company_id IS NULL
  )
);

-- ─── 17. TICKET ASSIGNEES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_ticket_assignees" ON public.ticket_assignees;
DROP POLICY IF EXISTS "company_manage_ticket_assignees" ON public.ticket_assignees;

CREATE POLICY "company_manage_ticket_assignees"
ON public.ticket_assignees FOR ALL TO authenticated
USING (
  ticket_id IN (
    SELECT st.id FROM public.support_tickets st
    JOIN public.clients c ON st.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
)
WITH CHECK (
  ticket_id IN (
    SELECT st.id FROM public.support_tickets st
    JOIN public.clients c ON st.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
);

-- ─── 18. TICKET COMMENTS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_ticket_comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "company_manage_ticket_comments" ON public.ticket_comments;

CREATE POLICY "company_manage_ticket_comments"
ON public.ticket_comments FOR ALL TO authenticated
USING (
  ticket_id IN (
    SELECT st.id FROM public.support_tickets st
    JOIN public.clients c ON st.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
)
WITH CHECK (
  ticket_id IN (
    SELECT st.id FROM public.support_tickets st
    JOIN public.clients c ON st.client_id = c.id
    WHERE c.company_id = public.get_user_company_id() OR c.company_id IS NULL
  )
);

-- ─── 19. COMPANY SUBSCRIPTIONS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_manage_company_subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_manage_company_subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_select_company_subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_insert_company_subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_update_company_subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "company_delete_company_subscriptions" ON public.company_subscriptions;

CREATE POLICY "company_select_company_subscriptions"
ON public.company_subscriptions FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id() OR public.is_admin());

CREATE POLICY "company_insert_company_subscriptions"
ON public.company_subscriptions FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id() OR public.is_admin());

CREATE POLICY "company_update_company_subscriptions"
ON public.company_subscriptions FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id() OR public.is_admin())
WITH CHECK (company_id = public.get_user_company_id() OR public.is_admin());

CREATE POLICY "company_delete_company_subscriptions"
ON public.company_subscriptions FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id() OR public.is_admin());

-- ─── 20. COMPANIES ────────────────────────────────────────────────────────────
-- Users can only view/edit their own company; admins can manage all
DROP POLICY IF EXISTS "authenticated_manage_companies" ON public.companies;
DROP POLICY IF EXISTS "company_manage_own_company" ON public.companies;
DROP POLICY IF EXISTS "company_select_own_company" ON public.companies;
DROP POLICY IF EXISTS "company_update_own_company" ON public.companies;

CREATE POLICY "company_select_own_company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.get_user_company_id() OR public.is_admin());

CREATE POLICY "company_update_own_company"
ON public.companies FOR UPDATE TO authenticated
USING (id = public.get_user_company_id() OR public.is_admin())
WITH CHECK (id = public.get_user_company_id() OR public.is_admin());

-- Admins can insert new companies (for onboarding)
DROP POLICY IF EXISTS "admin_insert_companies" ON public.companies;
CREATE POLICY "admin_insert_companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Admins can delete companies
DROP POLICY IF EXISTS "admin_delete_companies" ON public.companies;
CREATE POLICY "admin_delete_companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_admin());

-- ─── 21. AUDIT LOGS ───────────────────────────────────────────────────────────
-- Users can insert their own logs; admins can view all
DROP POLICY IF EXISTS "authenticated_manage_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "users_insert_own_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "users_select_own_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "admin_select_all_audit_logs" ON public.audit_logs;

CREATE POLICY "users_insert_own_audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "users_select_own_audit_logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ─── 22. WEBSITE LEADS ────────────────────────────────────────────────────────
-- Keep existing: public insert (contact form) + authenticated manage
-- No changes needed — already correct

-- ─── 23. SIGNUP LEADS ─────────────────────────────────────────────────────────
-- Keep public manage for signup flow — no changes needed

-- ─── 24. ENSURE RLS IS ENABLED ON ALL TABLES ─────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_leads ENABLE ROW LEVEL SECURITY;
