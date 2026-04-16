import { NextRequest, NextResponse } from 'next/server';

import {
  createSaasModule,
  listSaasModules,
} from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const platformId = request.nextUrl.searchParams.get('platform_id') ?? undefined;
    const modules = await listSaasModules(platformId);
    return NextResponse.json(modules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load modules.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const platformId = String(body?.platformId || '').trim();
    const name = String(body?.name || '').trim();

    if (!platformId || !name) {
      return NextResponse.json(
        { error: 'platformId and module name are required.' },
        { status: 400 }
      );
    }

    const module = await createSaasModule({
      platformId,
      name,
      apiEndpoint: body?.apiEndpoint ?? null,
      description: body?.description ?? null,
    });

    return NextResponse.json(module);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create module.' },
      { status: 500 }
    );
  }
}
