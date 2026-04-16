import { NextRequest, NextResponse } from 'next/server';

import {
  deleteSaasPlatform,
  toggleSaasPlatform,
  updateSaasPlatform,
} from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Platform id is required.' }, { status: 400 });
    }

    if (typeof body?.isActive === 'boolean' && Object.keys(body).length === 1) {
      await toggleSaasPlatform(id, body.isActive);
      return NextResponse.json({ success: true });
    }

    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Platform name is required.' }, { status: 400 });
    }

    const platform = await updateSaasPlatform(id, {
      name,
      logoUrl: body?.logoUrl ?? null,
      description: body?.description ?? null,
      serverType: body?.serverType ?? 'same_server',
      apiBaseUrl: body?.apiBaseUrl ?? null,
      isActive: body?.isActive,
    });

    return NextResponse.json(platform);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update platform.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Platform id is required.' }, { status: 400 });
    }

    await deleteSaasPlatform(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete platform.' },
      { status: 500 }
    );
  }
}
