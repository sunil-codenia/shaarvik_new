import { NextResponse } from 'next/server';

import { createAuthUserWithCompany } from '@/lib/auth/mysql-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body?.name || '').trim();
    const companyName = String(body?.companyName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!fullName || !companyName || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, company name, email, and password are required.' },
        { status: 400 }
      );
    }

    const created = await createAuthUserWithCompany({
      email,
      password,
      fullName,
      companyName,
      role: 'admin',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: created.userId,
        email: created.email,
        user_metadata: {
          full_name: fullName,
          role: 'admin',
          company_id: created.companyId,
        },
      },
      companyId: created.companyId,
      profileId: created.profileId,
    });
  } catch (error: any) {
    const message = error?.message || 'Signup failed.';
    const status = message.toLowerCase().includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
