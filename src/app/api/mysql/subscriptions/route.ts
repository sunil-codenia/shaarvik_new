import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, listSubscriptionsByClientId, listSubscriptionsByCompanyId } from '@/lib/mysql-crm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const clientId = searchParams.get('clientId');

    const subscriptions = clientId
      ? await listSubscriptionsByClientId(clientId, companyId)
      : await listSubscriptionsByCompanyId(companyId);
    return NextResponse.json(subscriptions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientId = String(body?.clientId || '').trim();
    const companyId = body?.companyId == null || body?.companyId === '' ? null : Number(body.companyId);
    const saasPlanId = body?.saasPlanId == null || body?.saasPlanId === '' ? null : Number(body.saasPlanId);
    const startDate = body?.startDate ? String(body.startDate) : null;
    const endDate = body?.endDate ? String(body.endDate) : null;
    const billingCycle = String(body?.billingCycle || 'monthly');
    const paymentMode = String(body?.paymentMode || 'online');
    const amount = Number(body?.amount || 0);
    const amountPaid = Number(body?.amountPaid || 0);
    const status = String(body?.status || 'active');
    const notes = body?.notes == null || body?.notes === '' ? null : String(body.notes);

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const subscription = await createSubscription({
      clientId,
      companyId,
      saasPlanId,
      startDate,
      endDate,
      status,
      billingCycle,
      paymentMode,
      amount,
      amountPaid,
      notes,
    });

    // --- Log Creation in History ---
    try {
      const { createSubscriptionHistory } = await import('@/lib/mysql-crm');
      await createSubscriptionHistory({
        subscriptionId: subscription.id,
        clientId,
        companyId,
        newPlanId: saasPlanId,
        eventType: 'CREATION',
        amount,
        startDate,
        endDate,
        notes: 'Initial subscription creation',
      });
    } catch (historyErr) {
      console.error('Failed to log subscription creation history:', historyErr);
    }

    return NextResponse.json(subscription);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create subscription.' }, { status: 500 });
  }
}
