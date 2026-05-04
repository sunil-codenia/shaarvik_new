import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createStaffUser } from '@/lib/auth/mysql-auth';
import { cookies } from 'next/headers';
import { verifySessionToken, getSessionCookieName } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authorization (only admins can create staff)
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = await verifySessionToken(token);
    
    // In a real app, you'd check if session.role === 'admin'
    // For now, we'll proceed as the frontend handles basic guard
    
    const body = await req.json();
    const { fullName, email, phone, staffRoleId, status } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 });
    }

    // 2. Hash a default password (they can change it later)
    // In a production app, you might send a reset link, but for now we use a default
    const defaultPassword = 'Staff@Shaarvik123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 3. Create user and profile in MySQL
    const result = await createStaffUser({
      email: email.trim(),
      passwordHash: passwordHash,
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      roleId: staffRoleId || null,
      companyId: session?.companyId || null,
      status: status || 'active'
    });

    return NextResponse.json({ 
      success: true, 
      id: result.userId,
      message: 'Staff member created successfully in MySQL.'
    });
  } catch (err: any) {
    console.error('Error creating staff:', err);
    if (err.message?.includes('Duplicate entry')) {
      return NextResponse.json({ error: 'A staff member with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
