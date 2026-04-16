import { NextRequest, NextResponse } from 'next/server';

import { deleteSubscription, getSubscriptionById, updateSubscription } from '@/lib/mysql-crm';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Subscription id is required.' }, { status: 400 });
    }

    const subscription = await getSubscriptionById(id);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch subscription.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await updateSubscription(id, {
      saasPlanId: body?.saasPlanId == null || body?.saasPlanId === '' ? null : String(body.saasPlanId),
      billingCycle: body?.billingCycle ? String(body.billingCycle) : undefined,
      startDate: body?.startDate ?? undefined,
      endDate: body?.endDate ?? undefined,
      status: body?.status ?? undefined,
      paymentMode: body?.paymentMode ?? undefined,
      amount: body?.amount == null || body?.amount === '' ? undefined : Number(body.amount),
      amountPaid: body?.amountPaid == null || body?.amountPaid === '' ? undefined : Number(body.amountPaid),
      notes: body?.notes == null ? undefined : String(body.notes),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update subscription.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSubscription(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete subscription.' }, { status: 500 });
  }
}
