-- ============================================================
-- Staff Departments & Roles
-- ============================================================

-- 1. Departments table
CREATE TABLE IF NOT EXISTS public.staff_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Roles table (separate from RBAC roles)
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  department_id UUID REFERENCES public.staff_departments(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add columns to user_profiles if not exist
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS staff_role_id UUID REFERENCES public.staff_roles(id) ON DELETE SET NULL;

-- Rename role_id to staff_role_id in user_profiles if role_id already exists pointing to staff_roles
-- We keep role_id for RBAC roles, add staff_role_id for staff roles
-- Update the staff page to use staff_role_id

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_staff_roles_department_id ON public.staff_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_role_id ON public.user_profiles(staff_role_id);

-- 5. RLS
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_view_departments" ON public.staff_departments;
CREATE POLICY "authenticated_view_departments"
ON public.staff_departments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_departments" ON public.staff_departments;
CREATE POLICY "admin_manage_departments"
ON public.staff_departments FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_view_staff_roles" ON public.staff_roles;
CREATE POLICY "authenticated_view_staff_roles"
ON public.staff_roles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_staff_roles" ON public.staff_roles;
CREATE POLICY "admin_manage_staff_roles"
ON public.staff_roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Seed default departments
INSERT INTO public.staff_departments (name, description, status) VALUES
  ('Engineering', 'Technical development team', 'active'),
  ('Sales', 'Sales and business development', 'active'),
  ('Support', 'Customer support team', 'active'),
  ('Accounts', 'Finance and billing team', 'active'),
  ('Management', 'Leadership and administration', 'active')
ON CONFLICT (name) DO NOTHING;

-- 7. Seed default staff roles linked to departments
INSERT INTO public.staff_roles (name, description, department_id, is_system, status)
SELECT 'Admin', 'Full system access', d.id, true, 'active'
FROM public.staff_departments d WHERE d.name = 'Management'
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.staff_roles (name, description, department_id, is_system, status)
SELECT 'Sales Executive', 'Handles leads and clients', d.id, true, 'active'
FROM public.staff_departments d WHERE d.name = 'Sales'
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.staff_roles (name, description, department_id, is_system, status)
SELECT 'Support Engineer', 'Handles support tickets', d.id, true, 'active'
FROM public.staff_departments d WHERE d.name = 'Support'
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.staff_roles (name, description, department_id, is_system, status)
SELECT 'Accounts Manager', 'Manages billing and invoices', d.id, true, 'active'
FROM public.staff_departments d WHERE d.name = 'Accounts'
ON CONFLICT (name) DO NOTHING;

-- 8. Add Staff module to modules table if not exists
INSERT INTO public.modules (name, description, status, sort_order) VALUES
  ('Staff', 'Staff management module', 'active', 9)
ON CONFLICT (name) DO NOTHING;
