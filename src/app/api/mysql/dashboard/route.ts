import { NextRequest, NextResponse } from 'next/server';

import { getDashboardMetricsByCompanyId } from '@/lib/mysql-service';

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

    const metrics = await getDashboardMetricsByCompanyId(companyId);
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load dashboard metrics.' },
      { status: 500 }
    );
  }
}
