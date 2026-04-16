import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getAuthUserByIdentifier, verifyPassword } from '@/lib/auth/mysql-auth';
import {
  createSessionToken,
  getSessionCookieName,
  getSessionDurationMs,
} from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.email || body?.username || '').trim();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email or username and password are required.' },
        { status: 400 }
      );
    }

    const user = await getAuthUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email, username, or password.' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email, username, or password.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      sub: String(user.id),
      email: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      role: user.role || 'staff',
      companyId: user.companyId ? String(user.companyId) : null,
    });

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.floor(getSessionDurationMs() / 1000),
    });

    return NextResponse.json({
      user: {
        id: String(user.id),
        email: user.email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: user.fullName || user.email.split('@')[0],
          role: user.role || 'staff',
          company_id: user.companyId ? String(user.companyId) : null,
        },
      },
      session: {
        user: {
          id: String(user.id),
          email: user.email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            full_name: user.fullName || user.email.split('@')[0],
            role: user.role || 'staff',
            company_id: user.companyId ? String(user.companyId) : null,
          },
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
