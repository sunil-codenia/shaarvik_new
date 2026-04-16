import { NextRequest, NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch campaigns for this company
    const [campaigns] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, name FROM campaigns WHERE company_id = ?',
      [companyId]
    );

    // 2. Fetch products for this company
    const [products] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, name FROM products WHERE company_id = ?',
      [companyId]
    );

    // 3. Fetch paid invoices with attribution
    // Attribution logic: invoice -> client -> lead -> campaign
    const [invoices] = await mysqlPool.query<RowDataPacket[]>(
      `
        SELECT 
          i.id, 
          i.paid_amount, 
          i.final_amount, 
          i.product_id, 
          l.campaign_id,
          p.name as product_name,
          c.name as campaign_name
        FROM invoices i
        JOIN clients cl ON i.client_id = cl.id
        LEFT JOIN leads l ON l.converted_to_client_id = cl.id
        LEFT JOIN products p ON i.product_id = p.id
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE i.company_id = ? AND i.status = 'paid'
      `,
      [companyId]
    );

    // Calculate aggregations
    const campaignRevenue: Record<string, number> = {};
    const productRevenue: Record<string, number> = {};
    const crossTable: Record<string, any> = {};
    let totalRevenue = 0;

    invoices.forEach((inv: any) => {
      const rev = Number(inv.paid_amount || inv.final_amount || 0);
      totalRevenue += rev;

      const cName = inv.campaign_name || 'Organic';
      const pName = inv.product_name || 'Generic Service';

      campaignRevenue[cName] = (campaignRevenue[cName] || 0) + rev;
      productRevenue[pName] = (productRevenue[pName] || 0) + rev;

      if (!crossTable[cName]) {
        crossTable[cName] = { campaign: cName, products: {}, total: 0 };
      }
      crossTable[cName].products[pName] = (crossTable[cName].products[pName] || 0) + rev;
      crossTable[cName].total += rev;
    });

    const campaignData = Object.entries(campaignRevenue).map(([campaign, revenue]) => ({ campaign, revenue }));
    const productData = Object.entries(productRevenue).map(([product, revenue]) => ({ product, revenue }));
    const crossTableData = Object.values(crossTable).map((row: any) => ({
      ...row,
      products: Object.entries(row.products).map(([name, revenue]) => ({ name, revenue }))
    }));

    return NextResponse.json({
      campaignData,
      productData,
      crossTable: crossTableData,
      totalRevenue,
      topCampaign: campaignData.sort((a,b) => b.revenue - a.revenue)[0]?.campaign || '—',
      topProduct: productData.sort((a,b) => b.revenue - a.revenue)[0]?.product || '—'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load revenue stats.' },
      { status: 500 }
    );
  }
}
