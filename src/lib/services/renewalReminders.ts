/**
 * Renewal Reminder Service
 *
 * Handles scheduling and dispatching of renewal reminders:
 *  - Email via Resend (fires when RESEND_API_KEY is configured)
 *  - SMS via Twilio (fires when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER are configured)
 *  - Internal notification record (always fires)
 *
 * API keys are read from the `api_keys` Supabase table (stored via Settings → API Keys).
 * If a key is missing, that channel is skipped gracefully.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderSubscription {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  planName: string | null;
  platformName: string | null;
  endDate: string;
  rmName: string | null;
  rmEmail: string | null;
  amount: number;
}

export interface ReminderResult {
  subscriptionId: string;
  reminderId: string;
  emailStatus: 'sent' | 'failed' | 'skipped';
  smsStatus: 'sent' | 'failed' | 'skipped';
  notifStatus: 'sent' | 'failed' | 'skipped';
  emailError?: string;
  smsError?: string;
  notifError?: string;
}

// ─── Supabase admin client ────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// ─── Fetch stored API keys from Supabase ──────────────────────────────────────

async function getStoredApiKey(keyId: string): Promise<string | null> {
  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from('api_keys')
      .select('value')
      .eq('key_id', keyId)
      .single();
    return data?.value || null;
  } catch {
    return null;
  }
}

// ─── Email via Resend ─────────────────────────────────────────────────────────

async function sendReminderEmail(
  sub: ReminderSubscription,
  resendApiKey: string
): Promise<{ status: 'sent' | 'failed'; error?: string }> {
  if (!sub.clientEmail) {
    return { status: 'failed', error: 'No client email address on record' };
  }

  const expiryDate = new Date(sub.endDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const planLabel = [sub.platformName, sub.planName].filter(Boolean).join(' — ') || 'your subscription';

  const emailBody = {
    from: 'ClientFlow <noreply@clientflow.app>',
    to: [sub.clientEmail],
    subject: `Renewal Reminder: ${planLabel} expires on ${expiryDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="margin-bottom:8px">Subscription Renewal Reminder</h2>
        <p style="color:#555;margin-bottom:20px">Hi ${sub.clientName},</p>
        <p>This is a friendly reminder that <strong>${planLabel}</strong> is due for renewal on <strong>${expiryDate}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
          <tr style="background:#f5f5f5">
            <td style="padding:10px 14px;font-weight:600">Plan</td>
            <td style="padding:10px 14px">${planLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600">Expiry Date</td>
            <td style="padding:10px 14px">${expiryDate}</td>
          </tr>
          ${sub.amount ? `<tr style="background:#f5f5f5"><td style="padding:10px 14px;font-weight:600">Amount</td><td style="padding:10px 14px">₹${sub.amount.toLocaleString('en-IN')}</td></tr>` : ''}
          ${sub.rmName ? `<tr><td style="padding:10px 14px;font-weight:600">Your Account Manager</td><td style="padding:10px 14px">${sub.rmName}</td></tr>` : ''}
        </table>
        <p>Please get in touch with us to renew your subscription and avoid any service interruption.</p>
        ${sub.rmEmail ? `<p style="margin-top:16px">Contact your account manager: <a href="mailto:${sub.rmEmail}">${sub.rmEmail}</a></p>` : ''}
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#999">This is an automated reminder from ClientFlow.</p>
      </div>
    `,
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!res.ok) {
      const err = await res.text();
      return { status: 'failed', error: `Resend API error ${res.status}: ${err}` };
    }

    return { status: 'sent' };
  } catch (err: any) {
    return { status: 'failed', error: err.message || 'Unknown Resend error' };
  }
}

// ─── SMS via Twilio ───────────────────────────────────────────────────────────

async function sendReminderSms(
  sub: ReminderSubscription,
  accountSid: string,
  authToken: string,
  fromNumber: string
): Promise<{ status: 'sent' | 'failed'; error?: string }> {
  if (!sub.clientPhone) {
    return { status: 'failed', error: 'No client phone number on record' };
  }

  const expiryDate = new Date(sub.endDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const planLabel = [sub.platformName, sub.planName].filter(Boolean).join(' - ') || 'your subscription';
  const body = `Hi ${sub.clientName}, your ${planLabel} expires on ${expiryDate}. Please contact us to renew. - ClientFlow`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: sub.clientPhone,
      From: fromNumber,
      Body: body,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      return { status: 'failed', error: `Twilio API error ${res.status}: ${err}` };
    }

    return { status: 'sent' };
  } catch (err: any) {
    return { status: 'failed', error: err.message || 'Unknown Twilio error' };
  }
}

// ─── Internal notification (always fires) ────────────────────────────────────

async function createInternalNotification(
  sub: ReminderSubscription
): Promise<{ status: 'sent' | 'failed'; error?: string }> {
  try {
    const supabase = getAdminClient();
    const expiryDate = new Date(sub.endDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const planLabel = [sub.platformName, sub.planName].filter(Boolean).join(' — ') || 'subscription';

    // Insert into activities as a system notification
    const { error } = await supabase.from('activities').insert({
      company_id: sub.companyId,
      client_id: sub.clientId,
      type: 'note',
      title: `Renewal Reminder: ${sub.clientName}`,
      description: `Auto-reminder: ${planLabel} for ${sub.clientName} expires on ${expiryDate}. Please follow up for renewal.`,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { status: 'sent' };
  } catch (err: any) {
    return { status: 'failed', error: err.message || 'Failed to create notification' };
  }
}

// ─── Schedule reminders for a subscription ───────────────────────────────────

export async function scheduleRenewalReminder(
  sub: Pick<ReminderSubscription, 'id' | 'companyId' | 'clientId' | 'endDate'>
): Promise<{ reminderId: string | null; error?: string }> {
  if (!sub.endDate) return { reminderId: null, error: 'No end date' };

  const endDate = new Date(sub.endDate);
  const remindOn = new Date(endDate);
  remindOn.setDate(remindOn.getDate() - 30); // 1 month before

  const supabase = getAdminClient();

  // Upsert: one reminder per subscription (replace if already exists)
  const { data, error } = await supabase
    .from('renewal_reminders')
    .upsert(
      {
        company_id: sub.companyId,
        subscription_id: sub.id,
        client_id: sub.clientId,
        remind_on: remindOn.toISOString().split('T')[0],
        status: 'pending',
        email_status: 'pending',
        sms_status: 'pending',
        notif_status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subscription_id' }
    )
    .select('id')
    .single();

  if (error) return { reminderId: null, error: error.message };
  return { reminderId: data.id };
}

// ─── Fire a single reminder ───────────────────────────────────────────────────

export async function fireReminder(
  reminder: { id: string; subscription_id: string; company_id: string; client_id: string },
  sub: ReminderSubscription
): Promise<ReminderResult> {
  // Fetch API keys from settings
  const [resendKey, twilioSid, twilioToken, twilioFrom] = await Promise.all([
    getStoredApiKey('resend'),
    getStoredApiKey('twilio_account_sid'),
    getStoredApiKey('twilio_auth_token'),
    getStoredApiKey('twilio_from_number'),
  ]);

  // ── Email ──────────────────────────────────────────────────────────────────
  let emailResult: { status: 'sent' | 'failed' | 'skipped'; error?: string };
  if (resendKey) {
    emailResult = await sendReminderEmail(sub, resendKey);
  } else {
    emailResult = { status: 'skipped', error: 'Resend API key not configured' };
  }

  // ── SMS ────────────────────────────────────────────────────────────────────
  let smsResult: { status: 'sent' | 'failed' | 'skipped'; error?: string };
  if (twilioSid && twilioToken && twilioFrom) {
    smsResult = await sendReminderSms(sub, twilioSid, twilioToken, twilioFrom);
  } else {
    smsResult = { status: 'skipped', error: 'Twilio credentials not configured' };
  }

  // ── Internal notification ──────────────────────────────────────────────────
  const notifResult = await createInternalNotification(sub);

  // ── Determine overall status ───────────────────────────────────────────────
  const allSkipped = emailResult.status === 'skipped' && smsResult.status === 'skipped';
  const anyFailed = emailResult.status === 'failed' || smsResult.status === 'failed' || notifResult.status === 'failed';
  const overallStatus = allSkipped ? 'skipped' : anyFailed ? 'failed' : 'sent';

  // ── Persist result ─────────────────────────────────────────────────────────
  const supabase = getAdminClient();
  await supabase
    .from('renewal_reminders')
    .update({
      status: overallStatus,
      email_status: emailResult.status,
      sms_status: smsResult.status,
      notif_status: notifResult.status,
      email_error: emailResult.error || null,
      sms_error: smsResult.error || null,
      notif_error: notifResult.error || null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminder.id);

  return {
    subscriptionId: reminder.subscription_id,
    reminderId: reminder.id,
    emailStatus: emailResult.status,
    smsStatus: smsResult.status,
    notifStatus: notifResult.status,
    emailError: emailResult.error,
    smsError: smsResult.error,
    notifError: notifResult.error,
  };
}

// ─── Process all due reminders ────────────────────────────────────────────────

export async function processDueReminders(): Promise<{
  processed: number;
  results: ReminderResult[];
  errors: string[];
}> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch all pending reminders due today or earlier
  const { data: reminders, error } = await supabase
    .from('renewal_reminders')
    .select(`
      id, subscription_id, company_id, client_id, remind_on,
      subscriptions(
        id, end_date, amount,
        clients(id, name, display_name, email, phone),
        saas_plans(name, saas_platforms(name))
      )
    `)
    .eq('status', 'pending')
    .lte('remind_on', today);

  if (error) {
    return { processed: 0, results: [], errors: [error.message] };
  }

  const results: ReminderResult[] = [];
  const errors: string[] = [];

  for (const reminder of reminders || []) {
    try {
      const s = reminder.subscriptions as any;
      const client = s?.clients;
      const plan = s?.saas_plans;

      const sub: ReminderSubscription = {
        id: reminder.subscription_id,
        companyId: reminder.company_id,
        clientId: reminder.client_id,
        clientName: client?.display_name || client?.name || 'Client',
        clientEmail: client?.email || null,
        clientPhone: client?.phone || null,
        planName: plan?.name || null,
        platformName: plan?.saas_platforms?.name || null,
        endDate: s?.end_date || '',
        rmName: null,
        rmEmail: null,
        amount: Number(s?.amount || 0),
      };

      const result = await fireReminder(reminder, sub);
      results.push(result);
    } catch (err: any) {
      errors.push(`Reminder ${reminder.id}: ${err.message}`);
    }
  }

  return { processed: results.length, results, errors };
}
