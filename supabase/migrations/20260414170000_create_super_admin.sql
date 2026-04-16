-- Create super admin user: Sachin.635@gmail.com / Password Bingo
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
BEGIN
    -- Insert into auth.users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES (
        admin_uuid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'Sachin.635@gmail.com',
        crypt('Password Bingo', gen_salt('bf', 10)),
        now(),
        now(),
        now(),
        jsonb_build_object('full_name', 'Super Admin', 'role', 'super_admin'),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
        false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    )
    ON CONFLICT (email) DO UPDATE
        SET encrypted_password = crypt('Password Bingo', gen_salt('bf', 10)),
            email_confirmed_at = now(),
            updated_at = now(),
            raw_user_meta_data = jsonb_build_object('full_name', 'Super Admin', 'role', 'super_admin');

    -- Get the actual UUID (in case of conflict, fetch existing)
    SELECT id INTO admin_uuid FROM auth.users WHERE email = 'Sachin.635@gmail.com' LIMIT 1;

    -- Upsert into public.profiles with super_admin role
    INSERT INTO public.profiles (id, email, full_name, role, company_id)
    VALUES (admin_uuid, 'Sachin.635@gmail.com', 'Super Admin', 'super_admin', NULL)
    ON CONFLICT (id) DO UPDATE
        SET role = 'super_admin',
            email = 'Sachin.635@gmail.com',
            full_name = 'Super Admin',
            company_id = NULL;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Super admin creation failed: %', SQLERRM;
END $$;
