import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, staffRoleId, status } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: service role key missing.' },
        { status: 500 }
      );
    }

    // Admin client with service role — bypasses RLS and can create auth users
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Check if user already exists in profiles
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email already exists.' }, { status: 409 });
    }

    // 2. Create auth user with a random temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role: 'staff',
      },
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        // Auth user exists — fetch their profile
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find((u) => u.email === email.trim());
        if (!existingAuthUser) {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        // Upsert profile for existing auth user using only id and email
        const { error: upsertError } = await adminClient.from('profiles').upsert({
          id: existingAuthUser.id,
          email: email.trim(),
        }, { onConflict: 'id' });
        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, id: existingAuthUser.id });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const authUserId = authData.user.id;

    // 3. The handle_new_user trigger already created the profiles row.
    //    Wait a brief moment to ensure the trigger has completed.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // profiles table only has id and email — no extra fields to update
    // The trigger handles profile creation; nothing more to do here.

    return NextResponse.json({ success: true, id: authUserId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
