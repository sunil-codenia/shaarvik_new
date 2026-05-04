import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

import {
  createSaasPlan,
  listSaasPlans,
} from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const plans = await listSaasPlans();
    return NextResponse.json(plans);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load plans.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platformId = String(body?.platformId || '').trim();
    const name = String(body?.name || '').trim();
    const price = Number(body?.price);
    const billingCycle = (body?.billingCycle || 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly';

    if (!platformId || !name || !Number.isFinite(price)) {
      return NextResponse.json(
        { error: 'platformId, name, and price are required.' },
        { status: 400 }
      );
    }

    // 1. Create the plan locally first
    const plan = await createSaasPlan({
      platformId,
      name,
      price,
      billingCycle,
      trialDays: body?.trialDays == null || body?.trialDays === ''
        ? null
        : Number(body.trialDays),
      description: body?.description ?? null,
      isActive: body?.isActive,
      moduleIds: Array.isArray(body?.moduleIds) ? body.moduleIds.map(String) : [],
    });


    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create plan.' },
      { status: 500 }
    );
  }
}
