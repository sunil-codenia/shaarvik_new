import { NextRequest, NextResponse } from 'next/server';

import { getProjectsByCompanyId } from '@/lib/mysql-service';

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

    const projects = await getProjectsByCompanyId(companyId);
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load projects.' },
      { status: 500 }
    );
  }
}
