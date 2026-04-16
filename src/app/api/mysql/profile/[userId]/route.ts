import { NextResponse } from 'next/server';

import { getProfileByUserId } from '@/lib/mysql-service';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load profile.' },
      { status: 500 }
    );
  }
}
