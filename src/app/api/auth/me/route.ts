import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getAuthUserById } from '@/lib/auth/mysql-auth';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const user = await getAuthUserById(session.sub);
    if (!user) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        full_name: user.fullName || user.email.split('@')[0],
        role: user.role || 'staff',
        company_id: user.companyId ?? null,
      },
      app_metadata: {
        role: user.role || 'staff',
      },
    };

    return NextResponse.json({
      user: authUser,
      session: {
        user: authUser,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load session.' },
      { status: 500 }
    );
  }
}
