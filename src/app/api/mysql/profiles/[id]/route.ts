import { NextRequest, NextResponse } from 'next/server';

import { assignProfileRole } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const roleId = body?.roleId == null || body?.roleId === '' ? null : String(body.roleId);
    const roleName = body?.roleName == null || body?.roleName === '' ? null : String(body.roleName);

    if (!id) {
      return NextResponse.json({ error: 'Profile id is required.' }, { status: 400 });
    }

    await assignProfileRole(id, { roleId, roleName });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
