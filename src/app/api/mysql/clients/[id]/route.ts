import { NextRequest, NextResponse } from 'next/server';

import { deleteClient, getClientById, updateClient, updateClientStatus } from '@/lib/mysql-clients';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Client id is required.' }, { status: 400 });
    }

    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: String(client.id),
      name: client.name,
      displayName: client.display_name || null,
      companyName: client.company_name || null,
      address: client.address || null,
      gstNumber: client.gst_number || null,
      billingEmail: client.billing_email || null,
      phone: client.phone || null,
      email: client.email || null,
      status: client.status || 'active',
      source: client.source || null,
      companyId: client.company_id == null ? null : String(client.company_id),
      createdAt:
        client.created_at instanceof Date
          ? client.created_at.toISOString()
          : client.created_at,
      updatedAt:
        client.updated_at instanceof Date
          ? client.updated_at.toISOString()
          : client.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch client.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body && Object.keys(body).length === 1 && body.status) {
      await updateClientStatus(id, body.status);
    } else {
      const name = String(body?.name || '').trim();
      if (!name) {
        return NextResponse.json({ error: 'Client name is required.' }, { status: 400 });
      }

      await updateClient(id, {
        name,
        displayName: body?.displayName ?? null,
        phone: body?.phone ?? null,
        email: body?.email ?? null,
        address: body?.address ?? null,
        gstNumber: body?.gstNumber ?? null,
        billingEmail: body?.billingEmail ?? null,
        status: body?.status ?? null,
        source: body?.source ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update client.' },
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
    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete client.' },
      { status: 500 }
    );
  }
}
