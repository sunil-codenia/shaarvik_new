import { NextResponse } from 'next/server';

import { listSaasPlanModules } from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const planModules = await listSaasPlanModules();
    return NextResponse.json(planModules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load plan modules.' },
      { status: 500 }
    );
  }
}
