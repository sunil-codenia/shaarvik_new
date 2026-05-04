import { NextRequest, NextResponse } from 'next/server';
import { listApiKeys, upsertApiKey } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const keys = await listApiKeys();
    return NextResponse.json(keys);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load API keys.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key_id, value } = body;

    if (!key_id) {
      return NextResponse.json({ error: 'Key ID is required.' }, { status: 400 });
    }

    await upsertApiKey(key_id, String(value || ''));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save API key.' },
      { status: 500 }
    );
  }
}
