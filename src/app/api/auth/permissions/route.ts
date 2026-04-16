import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getPermissionsForUser } from '@/lib/auth/mysql-auth';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { isAdmin: false, permissions: [] },
        { status: 200 }
      );
    }

    const permissions = await getPermissionsForUser(session.sub);
    return NextResponse.json(permissions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load permissions.' },
      { status: 500 }
    );
  }
}
