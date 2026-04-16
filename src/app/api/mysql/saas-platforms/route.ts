import { NextRequest, NextResponse } from 'next/server';

import {
  createSaasPlatform,
  listSaasPlatforms,
} from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const platforms = await listSaasPlatforms();
    return NextResponse.json(platforms);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load platforms.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Platform name is required.' },
        { status: 400 }
      );
    }

    const platform = await createSaasPlatform({
      name,
      logoUrl: body?.logoUrl ?? null,
      description: body?.description ?? null,
      serverType: body?.serverType ?? 'same_server',
      apiBaseUrl: body?.apiBaseUrl ?? null,
    });

    return NextResponse.json(platform);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create platform.' },
      { status: 500 }
    );
  }
}
