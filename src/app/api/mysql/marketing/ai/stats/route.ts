import { NextRequest, NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required.' }, { status: 400 });
    }

    // 1. Fetch campaigns with budget and revenue
    // Using the attribution logic (campaign -> leads -> clients -> invoices)
    const [campaigns] = await mysqlPool.query<RowDataPacket[]>(
      `
        SELECT 
          c.id, c.name, c.status, c.budget, c.spent_amount,
          (SELECT COALESCE(SUM(i.paid_amount), 0) 
           FROM invoices i 
           JOIN clients cl ON i.client_id = cl.id 
           JOIN leads l ON l.converted_to_client_id = cl.id 
           WHERE l.campaign_id = c.id AND i.status = 'paid') as revenue
        FROM campaigns c
        WHERE c.company_id = ?
        ORDER BY c.createdAt DESC
        LIMIT 10
      `,
      [companyId]
    );

    // 2. Fetch AI Autonomous Actions
    const [actions] = await mysqlPool.query<RowDataPacket[]>(
      `
        SELECT id, action_type, reasoning, confidence_score, status, createdAt as created_at
        FROM ai_autonomous_actions
        WHERE company_id = ?
        ORDER BY createdAt DESC
        LIMIT 50
      `,
      [companyId]
    );

    return NextResponse.json({
      campaigns,
      actions
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load AI performance stats.' },
      { status: 500 }
    );
  }
}
