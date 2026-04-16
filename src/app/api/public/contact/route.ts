import { NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const phone = String(body?.phone || '').trim();
    const message = String(body?.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const [companyRows] = await mysqlPool.query<CompanyRow[]>(
      `
        SELECT id, name
        FROM companies
        ORDER BY createdAt ASC
        LIMIT 1
      `
    );

    const company = companyRows[0];
    const [leadResult] = await mysqlPool.query<any>(
      `
        INSERT INTO leads (
          title,
          name,
          email,
          phone,
          company_name,
          status,
          notes,
          is_converted,
          company_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        `Website Inquiry - ${name}`,
        name,
        email,
        phone || null,
        company?.name || 'Website',
        'new',
        `Source: website_contact_form\n\n${message}`,
        0,
        company?.id || null,
      ]
    );

    return NextResponse.json({ ok: true, leadId: String(leadResult.insertId) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to submit contact form.' },
      { status: 500 }
    );
  }
}
