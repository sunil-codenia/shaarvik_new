import { NextRequest, NextResponse } from 'next/server';

import {
  deleteSaasPlan,
  getSaasPlan,
  toggleSaasPlan,
  updateSaasPlan,
} from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Plan id is required.' }, { status: 400 });
    }

    const plan = await getSaasPlan(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load plan.' },
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

    if (!id) {
      return NextResponse.json({ error: 'Plan id is required.' }, { status: 400 });
    }

    if (typeof body?.isActive === 'boolean' && Object.keys(body).length === 1) {
      await toggleSaasPlan(id, body.isActive);
      return NextResponse.json({ success: true });
    }

    const name = String(body?.name || '').trim();
    const price = Number(body?.price);
    const billingCycle = (body?.billingCycle || 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly';

    if (!name || !Number.isFinite(price)) {
      return NextResponse.json(
        { error: 'Plan name and price are required.' },
        { status: 400 }
      );
    }

    const plan = await updateSaasPlan(id, {
      platformId: body?.platformId ? String(body.platformId).trim() : undefined,
      name,
      price,
      billingCycle,
      trialDays: body?.trialDays == null || body?.trialDays === ''
        ? null
        : Number(body.trialDays),
      description: body?.description ?? null,
      isActive: body?.isActive,
      moduleIds: Array.isArray(body?.moduleIds) ? body.moduleIds.map(String) : undefined,
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update plan.' },
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
      return NextResponse.json({ error: 'Plan id is required.' }, { status: 400 });
    }

    await deleteSaasPlan(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete plan.' },
      { status: 500 }
    );
  }
}
