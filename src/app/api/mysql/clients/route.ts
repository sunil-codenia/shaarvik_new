import { NextRequest, NextResponse } from 'next/server';
import { listClients } from '@/lib/mysql-clients';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    const clients = await listClients(companyId || null);
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('[API Clients GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch clients.' },
      { status: 500 }
    );
  }
}
