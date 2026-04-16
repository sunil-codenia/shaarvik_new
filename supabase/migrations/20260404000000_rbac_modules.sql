-- ============================================================
-- RBAC: Modules, Roles, RolePermissions
-- ============================================================

-- 1. TABLES

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, module_id)
);

-- Add role_id column to user_profiles if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module_id ON public.role_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);

-- 3. FUNCTIONS

CREATE OR REPLACE FUNCTION public.set_roles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 4. ENABLE RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- modules: all authenticated can view
DROP POLICY IF EXISTS "authenticated_view_modules" ON public.modules;
CREATE POLICY "authenticated_view_modules"
ON public.modules FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_modules" ON public.modules;
CREATE POLICY "admin_manage_modules"
ON public.modules FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- roles: all authenticated can view
DROP POLICY IF EXISTS "authenticated_view_roles" ON public.roles;
CREATE POLICY "authenticated_view_roles"
ON public.roles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_roles" ON public.roles;
CREATE POLICY "admin_manage_roles"
ON public.roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- role_permissions: all authenticated can view
DROP POLICY IF EXISTS "authenticated_view_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_view_role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "admin_manage_role_permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. TRIGGERS
DROP TRIGGER IF EXISTS set_roles_updated_at ON public.roles;
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_roles_updated_at();

DROP TRIGGER IF EXISTS set_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER set_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_roles_updated_at();

-- 7. SEED DATA

DO $$
DECLARE
  mod_products UUID;
  mod_marketing UUID;
  mod_leads UUID;
  mod_clients UUID;
  mod_subscriptions UUID;
  mod_billing UUID;
  mod_support UUID;
  mod_staff UUID;
  mod_dashboard UUID;

  role_admin UUID;
  role_sales UUID;
  role_support UUID;
  role_accounts UUID;
BEGIN
  -- Insert modules
  INSERT INTO public.modules (id, name, description, status, sort_order) VALUES
    (gen_random_uuid(), 'Dashboard',      'Main dashboard and KPIs',              'active', 1),
    (gen_random_uuid(), 'Clients',        'Client management',                    'active', 2),
    (gen_random_uuid(), 'Leads',          'Lead pipeline management',             'active', 3),
    (gen_random_uuid(), 'Products',       'Product catalog management',           'active', 4),
    (gen_random_uuid(), 'Subscriptions',  'Subscription management',              'active', 5),
    (gen_random_uuid(), 'Billing',        'Invoices and payments',                'active', 6),
    (gen_random_uuid(), 'Support',        'Support ticket management',            'active', 7),
    (gen_random_uuid(), 'Marketing',      'Marketing campaigns and analytics',    'active', 8),
    (gen_random_uuid(), 'Staff',          'Staff and user management',            'active', 9)
  ON CONFLICT (name) DO NOTHING;

  -- Fetch module IDs
  SELECT id INTO mod_dashboard     FROM public.modules WHERE name = 'Dashboard'     LIMIT 1;
  SELECT id INTO mod_clients       FROM public.modules WHERE name = 'Clients'       LIMIT 1;
  SELECT id INTO mod_leads         FROM public.modules WHERE name = 'Leads'         LIMIT 1;
  SELECT id INTO mod_products      FROM public.modules WHERE name = 'Products'      LIMIT 1;
  SELECT id INTO mod_subscriptions FROM public.modules WHERE name = 'Subscriptions' LIMIT 1;
  SELECT id INTO mod_billing       FROM public.modules WHERE name = 'Billing'       LIMIT 1;
  SELECT id INTO mod_support       FROM public.modules WHERE name = 'Support'       LIMIT 1;
  SELECT id INTO mod_marketing     FROM public.modules WHERE name = 'Marketing'     LIMIT 1;
  SELECT id INTO mod_staff         FROM public.modules WHERE name = 'Staff'         LIMIT 1;

  -- Insert default roles
  INSERT INTO public.roles (id, name, description, is_system) VALUES
    (gen_random_uuid(), 'Admin',    'Full system access',                    true),
    (gen_random_uuid(), 'Sales',    'Access to Leads and Clients modules',   true),
    (gen_random_uuid(), 'Support',  'Access to Support Tickets module',      true),
    (gen_random_uuid(), 'Accounts', 'Access to Billing module',              true)
  ON CONFLICT (name) DO NOTHING;

  -- Fetch role IDs
  SELECT id INTO role_admin    FROM public.roles WHERE name = 'Admin'    LIMIT 1;
  SELECT id INTO role_sales    FROM public.roles WHERE name = 'Sales'    LIMIT 1;
  SELECT id INTO role_support  FROM public.roles WHERE name = 'Support'  LIMIT 1;
  SELECT id INTO role_accounts FROM public.roles WHERE name = 'Accounts' LIMIT 1;

  -- Admin: full access to all modules
  INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
  SELECT role_admin, id, true, true, true, true
  FROM public.modules
  ON CONFLICT (role_id, module_id) DO NOTHING;

  -- Sales: Leads + Clients (view/create/edit, no delete)
  INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete) VALUES
    (role_sales, mod_dashboard,  true,  false, false, false),
    (role_sales, mod_leads,      true,  true,  true,  false),
    (role_sales, mod_clients,    true,  true,  true,  false)
  ON CONFLICT (role_id, module_id) DO NOTHING;

  -- Support: Support tickets + Dashboard
  INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete) VALUES
    (role_support, mod_dashboard, true,  false, false, false),
    (role_support, mod_support,   true,  true,  true,  false)
  ON CONFLICT (role_id, module_id) DO NOTHING;

  -- Accounts: Billing + Dashboard
  INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete) VALUES
    (role_accounts, mod_dashboard, true,  false, false, false),
    (role_accounts, mod_billing,   true,  true,  true,  false)
  ON CONFLICT (role_id, module_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RBAC seed data error: %', SQLERRM;
END $$;
