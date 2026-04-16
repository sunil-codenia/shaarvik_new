import { NextResponse } from 'next/server';

import { listProfiles } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const profiles = await listProfiles();
    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load profiles.' },
      { status: 500 }
    );
  }
}
