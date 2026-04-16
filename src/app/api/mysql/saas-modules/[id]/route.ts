import { NextRequest, NextResponse } from 'next/server';

import {
  deleteSaasModule,
  toggleSaasModule,
  updateSaasModule,
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
      return NextResponse.json({ error: 'Module id is required.' }, { status: 400 });
    }

    if (typeof body?.isActive === 'boolean' && Object.keys(body).length === 1) {
      await toggleSaasModule(id, body.isActive);
      return NextResponse.json({ success: true });
    }

    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Module name is required.' }, { status: 400 });
    }

    await updateSaasModule(id, {
      name,
      apiEndpoint: body?.apiEndpoint ?? null,
      description: body?.description ?? null,
      isActive: body?.isActive,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update module.' },
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
      return NextResponse.json({ error: 'Module id is required.' }, { status: 400 });
    }

    await deleteSaasModule(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete module.' },
      { status: 500 }
    );
  }
}
