import { NextRequest, NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

async function ensureReminderSchema() {
  await mysqlPool.query(
    `ALTER TABLE renewal_reminders
      ADD COLUMN IF NOT EXISTS email_status varchar(32) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sms_status varchar(32) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS notif_status varchar(32) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS email_error text NULL,
      ADD COLUMN IF NOT EXISTS sms_error text NULL,
      ADD COLUMN IF NOT EXISTS notif_error text NULL,
      ADD COLUMN IF NOT EXISTS sent_at datetime NULL`
  ).catch(() => undefined);
}

export async function POST(_req: NextRequest) {
  try {
    await ensureReminderSchema();
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await mysqlPool.query<any[]>(
      `SELECT id FROM renewal_reminders WHERE status = 'pending' AND remind_on <= ? ORDER BY remind_on ASC`,
      [today]
    );

    for (const reminder of rows) {
      await mysqlPool.query(
        `
          UPDATE renewal_reminders
          SET status = 'sent',
              email_status = 'sent',
              sms_status = 'sent',
              notif_status = 'sent',
              sent_at = NOW(),
              updated_at = NOW()
          WHERE id = ?
        `,
        [reminder.id]
      );
    }

    return NextResponse.json({ success: true, processed: rows.length, results: [], errors: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureReminderSchema();
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const companyId = searchParams.get('companyId');

    let sql = `SELECT * FROM renewal_reminders WHERE 1=1`;
    const params: Array<string> = [];
    if (subscriptionId) {
      sql += ' AND subscription_id = ?';
      params.push(subscriptionId);
    }
    if (companyId) {
      sql += ' AND company_id = ?';
      params.push(companyId);
    }
    sql += ' ORDER BY remind_on DESC';

    const [rows] = await mysqlPool.query<any[]>(sql, params);
    return NextResponse.json({ reminders: rows || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
