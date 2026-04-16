import { NextRequest, NextResponse } from 'next/server';
import { listTicketsByCompanyId } from '@/lib/mysql-crm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const tickets = await listTicketsByCompanyId(companyId);
    return NextResponse.json(tickets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
