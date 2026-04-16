import { NextRequest, NextResponse } from 'next/server';

import { listRolePermissions, upsertRolePermissions } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const permissions = await listRolePermissions();
    return NextResponse.json(permissions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load permissions.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const permissions = Array.isArray(body?.permissions) ? body.permissions : [];

    await upsertRolePermissions(
      permissions.map((perm) => ({
        role_id: String(perm.role_id || '').trim(),
        module_id: String(perm.module_id || '').trim(),
        can_view: Boolean(perm.can_view),
        can_create: Boolean(perm.can_create),
        can_edit: Boolean(perm.can_edit),
        can_delete: Boolean(perm.can_delete),
      }))
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save permissions.' },
      { status: 500 }
    );
  }
}
