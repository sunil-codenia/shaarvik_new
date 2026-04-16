-- ============================================================
-- MULTI-TENANT SAAS BACKEND ENGINE
-- companies + company_id + ERP products + subscriptions
-- campaign_creatives + module access control + AI-ready indexes
-- ============================================================

-- ─── STEP 1: COMPANIES TABLE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_companies" ON public.companies;
CREATE POLICY "authenticated_manage_companies"
  ON public.companies FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── STEP 2: ADD company_id TO CORE TABLES ───────────────────────────────────

-- user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);

-- leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);

-- clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

-- campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_product_id ON public.campaigns(product_id);

-- products (add ERP fields)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS erp_type TEXT DEFAULT 'CRM';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'subscription';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);

-- tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);

-- ─── STEP 3: COMPANY SUBSCRIPTIONS TABLE (ERP CONTROL) ───────────────────────

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'trial',
  amount NUMERIC NOT NULL DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_subscriptions_status_check CHECK (status IN ('trial', 'active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_product_id ON public.company_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_company_subscriptions" ON public.company_subscriptions;
CREATE POLICY "authenticated_manage_company_subscriptions"
  ON public.company_subscriptions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── STEP 4: CAMPAIGN CREATIVES TABLE + STORAGE ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  storage_path TEXT,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_creatives_campaign_id ON public.campaign_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_creatives_company_id ON public.campaign_creatives(company_id);

ALTER TABLE public.campaign_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_campaign_creatives" ON public.campaign_creatives;
CREATE POLICY "authenticated_manage_campaign_creatives"
  ON public.campaign_creatives FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── STEP 5: MODULE ACCESS CONTROL FUNCTION ──────────────────────────────────

-- Function: get active product IDs for a company
CREATE OR REPLACE FUNCTION public.get_company_active_products(p_company_id UUID)
RETURNS TABLE(product_id UUID, product_name TEXT, erp_type TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    COALESCE(p.erp_type, 'CRM') AS erp_type
  FROM public.company_subscriptions cs
  JOIN public.products p ON cs.product_id = p.id
  WHERE cs.company_id = p_company_id
    AND cs.status IN ('active', 'trial')
    AND (cs.end_date IS NULL OR cs.end_date >= CURRENT_DATE)
    AND p.is_active = true;
$$;

-- Function: check if company has access to a specific product type
CREATE OR REPLACE FUNCTION public.company_has_module(p_company_id UUID, p_erp_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_subscriptions cs
    JOIN public.products p ON cs.product_id = p.id
    WHERE cs.company_id = p_company_id
      AND p.erp_type = p_erp_type
      AND cs.status IN ('active', 'trial')
      AND (cs.end_date IS NULL OR cs.end_date >= CURRENT_DATE)
      AND p.is_active = true
  );
$$;

-- ─── STEP 6: CAMPAIGN PERFORMANCE VIEW (AI-READY) ────────────────────────────

DROP VIEW IF EXISTS public.campaign_performance_summary;
CREATE VIEW public.campaign_performance_summary AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.platform,
  c.status,
  c.company_id,
  c.product_id,
  c.budget,
  c.spent_amount,
  c.start_date,
  COUNT(DISTINCT l.id) AS leads_count,
  COUNT(DISTINCT CASE WHEN l.is_converted = true THEN l.id END) AS conversions_count,
  COALESCE(SUM(DISTINCT cl.revenue), 0) AS total_revenue,
  CASE
    WHEN COUNT(DISTINCT l.id) > 0 THEN c.spent_amount / COUNT(DISTINCT l.id)
    ELSE 0
  END AS cpl,
  CASE
    WHEN c.spent_amount > 0 THEN COALESCE(SUM(DISTINCT cl.revenue), 0) / c.spent_amount
    ELSE 0
  END AS roi,
  c.created_at
FROM public.campaigns c
LEFT JOIN public.leads l ON l.campaign_id = c.id
LEFT JOIN public.clients cl ON cl.campaign_id = c.id
GROUP BY
  c.id, c.name, c.platform, c.status, c.company_id, c.product_id,
  c.budget, c.spent_amount, c.start_date, c.created_at;

-- ─── STEP 7: UPDATED_AT TRIGGER FOR NEW TABLES ───────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_company_subscriptions_updated_at ON public.company_subscriptions;
CREATE TRIGGER set_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── STEP 8: AI-READY PERFORMANCE INDEXES ────────────────────────────────────

-- For campaign performance history queries
CREATE INDEX IF NOT EXISTS idx_leads_campaign_converted ON public.leads(campaign_id, is_converted);
CREATE INDEX IF NOT EXISTS idx_clients_campaign_revenue ON public.clients(campaign_id, revenue);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform_status ON public.campaigns(platform, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_product ON public.campaigns(company_id, product_id);

-- For time-series analysis
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON public.campaigns(start_date);

-- ─── STEP 9: SEED DEFAULT COMPANY ────────────────────────────────────────────

DO $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Create a default company if none exists
  IF NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1) THEN
    INSERT INTO public.companies (id, name, slug, status)
    VALUES (gen_random_uuid(), 'ClientFlow', 'clientflow', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Get the first company
  SELECT id INTO default_company_id FROM public.companies LIMIT 1;

  IF default_company_id IS NOT NULL THEN
    -- Backfill company_id on existing campaigns
    UPDATE public.campaigns SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing leads
    UPDATE public.leads SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing clients
    UPDATE public.clients SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing products
    UPDATE public.products SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing projects
    UPDATE public.projects SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing tasks
    UPDATE public.tasks SET company_id = default_company_id WHERE company_id IS NULL;
    -- Backfill company_id on existing user_profiles
    UPDATE public.user_profiles SET company_id = default_company_id WHERE company_id IS NULL;

    -- Update products with ERP fields if not set
    UPDATE public.products
    SET
      erp_type = CASE
        WHEN name ILIKE '%buildarya%' THEN 'ERP'
        WHEN name ILIKE '%marketing%' OR name ILIKE '%crm%' THEN 'CRM'
        ELSE 'CRM'
      END,
      pricing_type = 'subscription',
      billing_cycle = 'monthly',
      is_active = (status = 'active')
    WHERE erp_type IS NULL OR erp_type = 'CRM';

    -- Create company subscriptions for existing active client_subscriptions
    INSERT INTO public.company_subscriptions (company_id, product_id, start_date, end_date, status, amount)
    SELECT DISTINCT
      default_company_id,
      cs.product_id,
      MIN(cs.start_date),
      MAX(cs.expiry_date),
      CASE WHEN MAX(cs.status::text) = 'active' THEN 'active' ELSE 'trial' END,
      MAX(cs.amount)
    FROM public.client_subscriptions cs
    WHERE cs.product_id IS NOT NULL
    GROUP BY cs.product_id
    ON CONFLICT DO NOTHING;

  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data error: %', SQLERRM;
END $$;
