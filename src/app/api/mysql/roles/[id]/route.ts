import { NextResponse } from 'next/server';

import { deleteRole } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Role id is required.' }, { status: 400 });
    }

    await deleteRole(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete role.' },
      { status: 500 }
    );
  }
}
