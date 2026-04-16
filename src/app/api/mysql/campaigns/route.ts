import { NextResponse } from 'next/server';

import { listCampaignsForLeads } from '@/lib/mysql-leads';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const campaigns = await listCampaignsForLeads();
    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load campaigns.' },
      { status: 500 }
    );
  }
}
