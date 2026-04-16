-- ============================================================
-- Full CRM Schema: user_profiles, leads, activities, tasks
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'staff');

DROP TYPE IF EXISTS public.lead_status CASCADE;
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

DROP TYPE IF EXISTS public.activity_type CASCADE;
CREATE TYPE public.activity_type AS ENUM ('call', 'meeting', 'message', 'email', 'note');

DROP TYPE IF EXISTS public.task_status CASCADE;
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

DROP TYPE IF EXISTS public.task_priority CASCADE;
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- 2. CORE TABLES

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'staff'::public.user_role,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.lead_status NOT NULL DEFAULT 'new'::public.lead_status,
  value NUMERIC(12,2),
  follow_up_date DATE,
  notes TEXT,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  type public.activity_type NOT NULL DEFAULT 'note'::public.activity_type,
  summary TEXT NOT NULL,
  notes TEXT,
  logged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'pending'::public.task_status,
  priority public.task_priority NOT NULL DEFAULT 'medium'::public.task_priority,
  due_date DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON public.activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON public.activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

-- 4. FUNCTIONS

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- handle new auth user → create user_profiles row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- is_admin helper (reads from auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
  );
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: own row + admin sees all
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_view_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_view_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_admin() OR id = auth.uid());

-- leads: authenticated users can manage
DROP POLICY IF EXISTS "authenticated_manage_leads" ON public.leads;
CREATE POLICY "authenticated_manage_leads"
ON public.leads FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- activities: authenticated users can manage
DROP POLICY IF EXISTS "authenticated_manage_activities" ON public.activities;
CREATE POLICY "authenticated_manage_activities"
ON public.activities FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- tasks: authenticated users can manage
DROP POLICY IF EXISTS "authenticated_manage_tasks" ON public.tasks;
CREATE POLICY "authenticated_manage_tasks"
ON public.tasks FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 7. TRIGGERS

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. MOCK DATA
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  staff_uuid UUID := gen_random_uuid();
  client1_id UUID;
  client2_id UUID;
  lead1_id UUID := gen_random_uuid();
  lead2_id UUID := gen_random_uuid();
  lead3_id UUID := gen_random_uuid();
BEGIN
  -- Create auth users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@clientflow.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Arjun Rao', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (staff_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'staff@clientflow.com', crypt('staff123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Riya Nair', 'role', 'staff'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Get existing clients if any
  SELECT id INTO client1_id FROM public.clients ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO client2_id FROM public.clients ORDER BY created_at DESC LIMIT 1;

  -- Insert sample clients if none exist
  IF client1_id IS NULL THEN
    client1_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, company_name, phone, email, status, source, created_by)
    VALUES (client1_id, 'Meera Krishnaswamy', 'Vertex Pharma Pvt Ltd', '+91 98200 11234', 'meera@vertexpharma.com', 'active', 'reference', admin_uuid)
    ON CONFLICT (id) DO NOTHING;
    client2_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, company_name, phone, email, status, source, created_by)
    VALUES (client2_id, 'Saurabh Joshi', 'BlueSky Logistics', '+91 97100 44567', 'saurabh@bluesky.com', 'active', 'website', admin_uuid)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF client2_id IS NULL OR client2_id = client1_id THEN
    client2_id := gen_random_uuid();
    INSERT INTO public.clients (id, name, company_name, phone, email, status, source, created_by)
    VALUES (client2_id, 'Saurabh Joshi', 'BlueSky Logistics', '+91 97100 44567', 'saurabh@bluesky.com', 'active', 'website', admin_uuid)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Leads
  INSERT INTO public.leads (id, client_id, title, status, value, follow_up_date, notes, assigned_to, created_by)
  VALUES
    (lead1_id, client1_id, 'Q2 Product Supply Deal', 'contacted'::public.lead_status, 250000, CURRENT_DATE + 1, 'Discussed Q2 requirements. Needs formal proposal.', admin_uuid, admin_uuid),
    (lead2_id, client2_id, 'Logistics Software License', 'proposal'::public.lead_status, 180000, CURRENT_DATE + 3, 'Proposal sent. Awaiting sign-off from their CFO.', staff_uuid, admin_uuid),
    (lead3_id, client1_id, 'Annual Maintenance Contract', 'qualified'::public.lead_status, 75000, CURRENT_DATE + 7, 'Qualified lead. Budget confirmed.', admin_uuid, admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- Activities
  INSERT INTO public.activities (client_id, lead_id, type, summary, notes, logged_by, activity_date)
  VALUES
    (client1_id, lead1_id, 'call'::public.activity_type, 'Discussed Q2 product requirements', 'Client is interested in bulk pricing.', admin_uuid, now() - interval '1 hour'),
    (client2_id, lead2_id, 'meeting'::public.activity_type, 'Proposal walkthrough — 45 min call', 'Covered all modules. They liked the dashboard.', staff_uuid, now() - interval '3 hours'),
    (client1_id, lead1_id, 'email'::public.activity_type, 'Sent revised pricing sheet', 'Attached updated Q2 pricing PDF.', admin_uuid, now() - interval '1 day'),
    (client2_id, lead2_id, 'message'::public.activity_type, 'WhatsApp follow-up on pending PO', 'They said decision by Friday.', staff_uuid, now() - interval '2 days');

  -- Tasks
  INSERT INTO public.tasks (title, description, status, priority, due_date, client_id, lead_id, assigned_to, created_by)
  VALUES
    ('Send updated proposal to Vertex Pharma', 'Include revised pricing and delivery timeline.', 'pending'::public.task_status, 'high'::public.task_priority, CURRENT_DATE - 2, client1_id, lead1_id, admin_uuid, admin_uuid),
    ('Follow up on GST verification — BlueSky', 'Request GST certificate from accounts team.', 'pending'::public.task_status, 'high'::public.task_priority, CURRENT_DATE - 1, client2_id, lead2_id, staff_uuid, admin_uuid),
    ('Schedule demo with Nexus Tech team', 'Book 1-hour slot for product demo.', 'in_progress'::public.task_status, 'medium'::public.task_priority, CURRENT_DATE + 2, client1_id, null, admin_uuid, admin_uuid),
    ('Collect signed NDA from Greenlane Agro', 'NDA template already sent. Follow up.', 'pending'::public.task_status, 'medium'::public.task_priority, CURRENT_DATE + 5, client2_id, null, staff_uuid, admin_uuid);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
