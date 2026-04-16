import { NextRequest, NextResponse } from 'next/server';
import { syncExternalModules } from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platformId = String(body?.platformId || '').trim();
    const modules = body?.modules;

    if (!platformId || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'platformId and modules array are required.' },
        { status: 400 }
      );
    }

    const linkedModuleIds = await syncExternalModules(platformId, modules);
    return NextResponse.json(linkedModuleIds);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to sync modules.' },
      { status: 500 }
    );
  }
}
