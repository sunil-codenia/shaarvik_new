-- ============================================================
-- Fix Demo User Passwords
-- Ensure admin and staff auth users exist with correct passwords
-- matching the demo credentials shown on the login page
-- ============================================================

DO $$
DECLARE
  admin_uuid UUID := 'a1000000-0000-0000-0000-000000000001'::UUID;
  staff_uuid UUID := 'b2000000-0000-0000-0000-000000000002'::UUID;
BEGIN

  -- ── Admin user ──────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous,
    confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, reauthentication_token,
    phone, phone_change, phone_change_token
  ) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@clientflow.com',
    crypt('admin123', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Admin User', 'role', 'admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    false, false, '', '', '', '', '', 0, '', null, '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('admin123', gen_salt('bf', 10)),
    email              = 'admin@clientflow.com',
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    raw_user_meta_data = jsonb_build_object('full_name', 'Admin User', 'role', 'admin'),
    raw_app_meta_data  = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    updated_at         = now();

  -- Also handle email-based conflict (in case id differs)
  UPDATE auth.users
  SET
    encrypted_password = crypt('admin123', gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at         = now()
  WHERE email = 'admin@clientflow.com'
    AND id != admin_uuid;

  -- ── Staff user ───────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous,
    confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, reauthentication_token,
    phone, phone_change, phone_change_token
  ) VALUES (
    staff_uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'staff@clientflow.com',
    crypt('staff123', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Staff User', 'role', 'staff'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'staff'),
    false, false, '', '', '', '', '', 0, '', null, '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('staff123', gen_salt('bf', 10)),
    email              = 'staff@clientflow.com',
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    raw_user_meta_data = jsonb_build_object('full_name', 'Staff User', 'role', 'staff'),
    raw_app_meta_data  = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'staff'),
    updated_at         = now();

  -- Also handle email-based conflict (in case id differs)
  UPDATE auth.users
  SET
    encrypted_password = crypt('staff123', gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at         = now()
  WHERE email = 'staff@clientflow.com'
    AND id != staff_uuid;

  -- ── Ensure user_profiles exist ───────────────────────────────
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (admin_uuid, 'admin@clientflow.com', 'Admin User', 'admin'::public.user_role, 'active')
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    status    = EXCLUDED.status,
    updated_at = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (staff_uuid, 'staff@clientflow.com', 'Staff User', 'staff'::public.user_role, 'active')
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    status    = EXCLUDED.status,
    updated_at = now();

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Demo user password fix error (non-fatal): %', SQLERRM;
END $$;
