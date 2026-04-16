-- ============================================================
-- SaaS Platform Registry: saas_platforms + saas_modules
-- Foundation for Plans and Subscriptions
-- ============================================================

-- 1. SAAS PLATFORMS TABLE
CREATE TABLE IF NOT EXISTS public.saas_platforms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  logo_url      TEXT,
  description   TEXT,
  server_type   TEXT NOT NULL DEFAULT 'same_server'
                  CHECK (server_type IN ('same_server', 'external')),
  api_base_url  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SAAS MODULES TABLE
CREATE TABLE IF NOT EXISTS public.saas_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id     UUID NOT NULL REFERENCES public.saas_platforms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  api_endpoint    TEXT,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_saas_platforms_is_active ON public.saas_platforms(is_active);
CREATE INDEX IF NOT EXISTS idx_saas_modules_platform_id ON public.saas_modules(platform_id);
CREATE INDEX IF NOT EXISTS idx_saas_modules_is_active ON public.saas_modules(is_active);

-- 4. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_saas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.saas_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_modules ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "authenticated_manage_saas_platforms" ON public.saas_platforms;
CREATE POLICY "authenticated_manage_saas_platforms"
ON public.saas_platforms FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_saas_modules" ON public.saas_modules;
CREATE POLICY "authenticated_manage_saas_modules"
ON public.saas_modules FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS set_saas_platforms_updated_at ON public.saas_platforms;
CREATE TRIGGER set_saas_platforms_updated_at
  BEFORE UPDATE ON public.saas_platforms
  FOR EACH ROW EXECUTE FUNCTION public.set_saas_updated_at();

DROP TRIGGER IF EXISTS set_saas_modules_updated_at ON public.saas_modules;
CREATE TRIGGER set_saas_modules_updated_at
  BEFORE UPDATE ON public.saas_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_saas_updated_at();

-- 8. SAMPLE DATA
DO $$
DECLARE
  platform1_id UUID := gen_random_uuid();
  platform2_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.saas_platforms (id, name, description, server_type, api_base_url, is_active)
  VALUES
    (platform1_id, 'Shaarvik ERP', 'Enterprise Resource Planning platform for manufacturing and distribution businesses', 'same_server', 'https://api.shaarvik.com/v1', true),
    (platform2_id, 'Buildarya CRM', 'Customer Relationship Management platform for real estate and construction', 'external', 'https://api.buildarya.com/v2', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.saas_modules (platform_id, name, api_endpoint, description, is_active)
  VALUES
    (platform1_id, 'HR Management', '/hr', 'Employee records, payroll, attendance and leave management', true),
    (platform1_id, 'Accounts & Finance', '/accounts', 'General ledger, invoicing, payments and financial reporting', true),
    (platform1_id, 'Inventory', '/inventory', 'Stock management, purchase orders and warehouse tracking', true),
    (platform1_id, 'Sales', '/sales', 'Sales orders, quotations and customer management', true),
    (platform2_id, 'Lead Management', '/leads', 'Lead capture, tracking and pipeline management', true),
    (platform2_id, 'Project Tracking', '/projects', 'Construction project milestones and task management', true),
    (platform2_id, 'Client Portal', '/portal', 'Client-facing portal for document sharing and updates', true)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample data insertion failed: %', SQLERRM;
END $$;
