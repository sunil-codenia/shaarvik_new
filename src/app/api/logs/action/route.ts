import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';

import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

type TableExistsRow = RowDataPacket & {
  table_name: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || '').trim();
    const moduleName = String(body?.module || '').trim();
    const description = String(body?.description || '').trim();
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!action || !moduleName || !description) {
      return NextResponse.json(
        { error: 'action, module, and description are required.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const session = await verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value || null
    );

    const [tableRows] = await mysqlPool.query<TableExistsRow[]>(
      `
        SELECT TABLE_NAME AS table_name
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'audit_logs'
        LIMIT 1
      `
    );

    if (tableRows.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'audit_logs table not found' });
    }

    try {
      await mysqlPool.query(
        `
          INSERT INTO audit_logs (
            action,
            module,
            description,
            metadata,
            user_id,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          action,
          moduleName,
          description,
          JSON.stringify(metadata),
          body?.user_id || session?.sub || null,
          new Date(),
        ]
      );
    } catch {
      // Logging should never block app flows if the table shape differs.
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to log action.' },
      { status: 500 }
    );
  }
}
