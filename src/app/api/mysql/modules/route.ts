import { NextResponse } from 'next/server';

import { listModules } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const modules = await listModules();
    return NextResponse.json(modules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load modules.' },
      { status: 500 }
    );
  }
}
