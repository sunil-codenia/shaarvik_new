import { NextRequest, NextResponse } from 'next/server';

import { createRole, listRoles } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const roles = await listRoles();
    return NextResponse.json(roles);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load roles.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = String(body?.description || '').trim() || null;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
    }

    const role = await createRole({ name, description });
    return NextResponse.json(role);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create role.' },
      { status: 500 }
    );
  }
}
