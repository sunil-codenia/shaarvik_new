import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { getAuthUserById, updateUserPassword, verifyPassword } from '@/lib/auth/mysql-auth';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const user = await getAuthUserById(session.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid current password.' },
        { status: 401 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(session.sub, newPasswordHash);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to change password.' },
      { status: 500 }
    );
  }
}
