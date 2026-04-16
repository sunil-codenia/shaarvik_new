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

// POST /api/reminders/schedule
// Body: { subscriptionId, companyId, clientId?, endDate }
export async function POST(req: NextRequest) {
  try {
    await ensureReminderSchema();
    const body = await req.json();
    const { subscriptionId, companyId, endDate } = body;

    if (!subscriptionId || !companyId || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const remindOn = new Date(endDate);
    remindOn.setDate(remindOn.getDate() - 30);

    const [existingRows] = await mysqlPool.query<any[]>(
      `SELECT id FROM renewal_reminders WHERE subscription_id = ? LIMIT 1`,
      [subscriptionId]
    );

    if (existingRows[0]?.id) {
      await mysqlPool.query(
        `
          UPDATE renewal_reminders
          SET company_id = ?, remind_on = ?, status = 'pending',
              email_status = 'pending', sms_status = 'pending', notif_status = 'pending',
              email_error = NULL, sms_error = NULL, notif_error = NULL, sent_at = NULL
          WHERE subscription_id = ?
        `,
        [companyId, remindOn.toISOString().slice(0, 10), subscriptionId]
      );
      return NextResponse.json({ success: true, reminderId: String(existingRows[0].id) });
    }

    const [result] = await mysqlPool.query<any>(
      `
        INSERT INTO renewal_reminders (
          subscription_id, company_id, remind_on, status,
          email_status, sms_status, notif_status
        )
        VALUES (?, ?, ?, 'pending', 'pending', 'pending', 'pending')
      `,
      [subscriptionId, companyId, remindOn.toISOString().slice(0, 10)]
    );

    return NextResponse.json({ success: true, reminderId: String(result.insertId) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
