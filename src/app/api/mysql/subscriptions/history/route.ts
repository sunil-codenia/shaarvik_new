import { NextRequest, NextResponse } from 'next/server';
import { listSubscriptionHistory } from '@/lib/mysql-crm';

export const runtime = 'nodejs';

/**
 * Subscription History API
 * Returns the ledger of events for a specific subscription.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscription id is required' }, { status: 400 });
    }

    const history = await listSubscriptionHistory(subscriptionId);
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load history.' }, { status: 500 });
  }
}
