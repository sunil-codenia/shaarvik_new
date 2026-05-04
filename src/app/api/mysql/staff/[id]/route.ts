import { NextRequest, NextResponse } from 'next/server';
import { updateProfile } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    
    await updateProfile(id, body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update staff profile.' },
      { status: 500 }
    );
  }
}
