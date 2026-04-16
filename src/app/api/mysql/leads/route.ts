import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RowDataPacket } from 'mysql2/promise';

import { createLead, listLeads, listLeadsByClientOrCompanyId } from '@/lib/mysql-leads';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body?.fullName || body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const companyName = String(body?.companyName || '').trim();
    const campaignId = String(body?.campaignId || '').trim() || null;
    const dealValue = body?.dealValue === '' || body?.dealValue == null ? null : Number(body?.dealValue);
    const followUpDate = String(body?.followUpDate || '').trim() || null;
    const notes = String(body?.notes || '').trim() || null;
    const source = String(body?.source || 'Website').trim();
    const password = String(body?.password || '').trim();

    if (!fullName || !phone || !email || !companyName) {
      return NextResponse.json(
        { error: 'Full name, phone, email, and company name are required.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const session = await verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value || null
    );

    let createdBy: string | null = null;
    if (session?.sub) {
      const [profileRows] = await mysqlPool.query<(RowDataPacket & { id: number })[]>(
        `
          SELECT id
          FROM profiles
          WHERE userId = ?
          LIMIT 1
        `,
        [session.sub]
      );
      createdBy = profileRows[0]?.id == null ? null : String(profileRows[0].id);
    }

    const lead = await createLead({
      fullName,
      phone,
      email,
      companyName,
      campaignId,
      dealValue: Number.isFinite(dealValue as number) ? Number(dealValue) : null,
      followUpDate,
      notes,
      createdBy,
      source,
      password: password || null,
    });

    return NextResponse.json({ success: true, leadId: lead.id, companyId: lead.companyId });
  } catch (error: any) {
    console.error('[API Leads POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create lead.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const clientId = searchParams.get('clientId');
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const leads = clientId
      ? await listLeadsByClientOrCompanyId(clientId, companyId)
      : await listLeads({ status, limit, offset });
    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch leads.' },
      { status: 500 }
    );
  }
}
