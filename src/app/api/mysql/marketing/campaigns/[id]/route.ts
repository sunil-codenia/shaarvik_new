import { NextRequest, NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
    }

    // 1. Fetch Campaign Info
    const [campaignRows] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, name, platform, status, budget, spent_amount, start_date FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if (!campaignRows || campaignRows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    const campaign = campaignRows[0];

    // 2. Fetch leads for this campaign
    const [leads] = await mysqlPool.query<RowDataPacket[]>(
      `
        SELECT 
          l.id, l.name, l.status, l.email, l.phone, l.company_name, 
          l.creative_id, cc.title as creative_title, cc.type as creative_type
        FROM leads l
        LEFT JOIN campaign_creatives cc ON l.creative_id = cc.id
        WHERE l.campaign_id = ?
        ORDER BY l.createdAt DESC
      `,
      [campaignId]
    );

    // 3. Fetch creatives
    const [creatives] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, file_url, type, title, description, file_name, createdAt FROM campaign_creatives WHERE campaign_id = ? ORDER BY createdAt DESC',
      [campaignId]
    );

    // 4. Fetch revenue (Paid invoices linked to conversions)
    const [invoices] = await mysqlPool.query<RowDataPacket[]>(
      `
        SELECT 
          i.id, i.invoice_number, i.invoice_date, i.amount, i.paid_amount, i.final_amount, i.status,
          cl.name as client_name
        FROM invoices i
        JOIN clients cl ON i.client_id = cl.id
        JOIN leads l ON l.converted_to_client_id = cl.id
        WHERE l.campaign_id = ? AND i.status = 'paid'
      `,
      [campaignId]
    );

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

    return NextResponse.json({
      campaign,
      leads,
      creatives,
      invoices,
      stats: {
        leadsCount: leads.length,
        totalRevenue
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load campaign details.' },
      { status: 500 }
    );
  }
}
