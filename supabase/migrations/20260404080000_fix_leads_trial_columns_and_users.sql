-- ============================================================
-- Fix: Add missing trial columns to leads table
-- Create admin and staff user accounts
-- ============================================================

-- 1. Add trial columns to leads table (safe, idempotent)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_product_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_plan_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_started_by UUID DEFAULT NULL;

-- 2. Add foreign key constraints only if columns were just added and referenced tables exist
DO $$
BEGIN
  -- trial_product_id FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'leads' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'trial_product_id'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_trial_product_id_fkey
      FOREIGN KEY (trial_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;

  -- trial_plan_id FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'leads' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'trial_plan_id'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_trial_plan_id_fkey
      FOREIGN KEY (trial_plan_id) REFERENCES public.product_plans(id) ON DELETE SET NULL;
  END IF;

  -- trial_started_by FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'leads' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'trial_started_by'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_trial_started_by_fkey
      FOREIGN KEY (trial_started_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'FK constraint error (non-fatal): %', SQLERRM;
END $$;

-- 3. Indexes for trial columns
CREATE INDEX IF NOT EXISTS idx_leads_trial_status ON public.leads(trial_status);
CREATE INDEX IF NOT EXISTS idx_leads_trial_end_date ON public.leads(trial_end_date);

-- 4. Create admin and staff user accounts
DO $$
DECLARE
  admin_uuid UUID := 'a1000000-0000-0000-0000-000000000001'::UUID;
  staff_uuid UUID := 'b2000000-0000-0000-0000-000000000002'::UUID;
BEGIN
  -- Create admin auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, reauthentication_token, phone, phone_change,
    phone_change_token
  ) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@clientflow.com',
    crypt('Admin@1234', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Admin User', 'role', 'admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    false, false, '', '', '', '', '', 0, '', null, '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = now();

  -- Create staff auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, reauthentication_token, phone, phone_change,
    phone_change_token
  ) VALUES (
    staff_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'staff@clientflow.com',
    crypt('Staff@1234', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Staff User', 'role', 'staff'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'staff'),
    false, false, '', '', '', '', '', 0, '', null, '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = now();

  -- Upsert admin user_profile
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (admin_uuid, 'admin@clientflow.com', 'Admin User', 'admin'::public.user_role, 'active')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();

  -- Upsert staff user_profile
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (staff_uuid, 'staff@clientflow.com', 'Staff User', 'staff'::public.user_role, 'active')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();

  -- Also upsert by email in case id conflicts
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  SELECT admin_uuid, 'admin@clientflow.com', 'Admin User', 'admin'::public.user_role, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'admin@clientflow.com');

  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  SELECT staff_uuid, 'staff@clientflow.com', 'Staff User', 'staff'::public.user_role, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'staff@clientflow.com');

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'User creation error (non-fatal): %', SQLERRM;
END $$;
