import { NextRequest, NextResponse } from 'next/server';
import { listActivitiesByCompanyId, createActivity, listActivitiesByLeadId } from '@/lib/mysql-crm';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const leadId = searchParams.get('leadId');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

    if (!companyId && !leadId) {
      return NextResponse.json({ error: 'companyId or leadId is required' }, { status: 400 });
    }

    const activities = leadId 
      ? await listActivitiesByLeadId(leadId, limit)
      : await listActivitiesByCompanyId(companyId!, limit);
    return NextResponse.json(activities);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.summary) {
      return NextResponse.json({ error: 'summary is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const session = await verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value || null
    );

    const activity = await createActivity({
      ...body,
      logged_by: session?.sub || null
    });

    return NextResponse.json(activity);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
