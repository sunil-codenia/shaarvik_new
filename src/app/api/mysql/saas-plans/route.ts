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

    // 2. Trigger External Company Registration in background
    // We don't 'await' the external API call because the user mentioned it takes 10-12 minutes
    (async () => {
      try {
        const registrationUrl = process.env.COMPANY_REGISTRATION_URL || 'http://127.0.0.1:8000';
        
        // Fetch platform name and external IDs for modules
        const [platformRows] = await mysqlPool.query<RowDataPacket[]>(
          'SELECT name FROM saas_platforms WHERE id = ?',
          [platformId]
        );
        const platformName = platformRows[0]?.name || 'Unknown Company';

        const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.map(String) : [];
        let externalModuleIds: number[] = [];
        
        if (moduleIds.length > 0) {
          const [moduleRows] = await mysqlPool.query<RowDataPacket[]>(
            'SELECT external_id FROM saas_modules WHERE id IN (?)',
            [moduleIds]
          );
          externalModuleIds = moduleRows
            .map(m => m.external_id)
            .filter(id => id != null) as number[];
        }

        console.log(`[Background] Registering company: ${platformName} on ${registrationUrl}`);
        
        const payload = {
          company: {
            name: platformName,
            status: 'Active',
            db_conn_name: 'mysql'
          },
          plan_name: name,
          modules: externalModuleIds
        };

        const extRes = await fetch(`${registrationUrl}/api/register_company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!extRes.ok) {
          console.error(`[Background] Registration API failed: ${extRes.status} ${extRes.statusText}`);
        } else {
          console.log(`[Background] Registration API successful for ${platformName}`);
        }
      } catch (err: any) {
        console.error(`[Background] Error during company registration: ${err.message}`);
      }
    })();

    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create plan.' },
      { status: 500 }
    );
  }
}
