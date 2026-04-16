import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSessionCookieName } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
