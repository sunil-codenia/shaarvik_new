import { NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { getLeadById } from '@/lib/mysql-leads';
import { createNewInvoice, getFullInvoiceForEmail } from '@/lib/mysql-crm-invoices';
import { sendInvoiceEmail } from '@/lib/mail-service';
import { logSystem } from '@/lib/mysql-logger';
import { ResultSetHeader } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const connection = await mysqlPool.getConnection();

  try {
    const body = await request.json();
    const leadId = String(body?.leadId || '').trim();
    const address = String(body?.address || '').trim() || null;
    const gstNumber = String(body?.gstNumber || '').trim() || null;
    const billingEmail = String(body?.billingEmail || '').trim() || null;
    const saasPlanId = body?.saasPlanId == null || body?.saasPlanId === '' ? null : Number(body.saasPlanId);
    const billingCycle = String(body?.billingCycle || 'monthly').trim();
    const paymentMode = String(body?.paymentMode || 'online').trim();
    const amount = body?.amount == null || body?.amount === '' ? 0 : Number(body.amount);
    const notes = String(body?.notes || '').trim() || null;
    const transactionId = body?.transactionId || null;
    const gateway = body?.gateway || null;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 });
    }

    await connection.beginTransaction();

    const lead = await getLeadById(leadId);
    if (!lead) {
      await connection.rollback();
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.is_converted && lead.converted_to_client_id) {
      await connection.rollback();
      return NextResponse.json({ error: 'Lead already converted' }, { status: 409 });
    }

    const clientDisplayName = lead.company_name || lead.full_name || 'Client';
    const [clientResult] = await connection.query<any>(
      `
        INSERT INTO clients (
          name,
          display_name,
          company_name,
          phone,
          email,
          address,
          gst_number,
          billing_email,
          status,
          source,
          company_id,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'lead_conversion', ?, NULL)
      `,
      [
        lead.full_name || 'Unknown',
        clientDisplayName,
        lead.company_name || null,
        lead.phone || null,
        lead.email || null,
        address,
        gstNumber,
        billingEmail,
        lead.company_id || null,
      ]
    );

    const clientId = Number(clientResult.insertId);
    const companyId = lead.company_id == null ? null : Number(lead.company_id);
    const today = new Date().toISOString().slice(0, 10);
    let endDate: string | null = null;
    let subscriptionId: string | null = null;
    if (saasPlanId) {
      const end = new Date(today);
      if (billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
      else if (billingCycle === 'quarterly') end.setMonth(end.getMonth() + 3);
      else end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString().slice(0, 10);

      const [subResult] = await connection.query<any>(
        `
          INSERT INTO subscriptions (
            client_id, company_id, saas_plan_id, billing_cycle, start_date, end_date,
            status, payment_mode, amount, amount_paid, notes, transaction_id, gateway
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          clientId,
          companyId,
          saasPlanId,
          billingCycle || 'monthly',
          today,
          endDate,
          'active',
          paymentMode || 'online',
          amount || 0,
          amount || 0,
          notes,
          transactionId,
          gateway || 'manual',
        ]
      );
      subscriptionId = String(subResult.insertId);

      // --- NEW: Generate Invoice Automatically and Send Email ---
      (async () => {
        try {
          await logSystem('info', `Lead convert invoicing started`, { clientId, companyId });

          // Ensure we have a valid companyId for the invoice
          // Fallback to Company 1 (the primary Admin company) if everything else fails
          const finalCompanyId = lead.company_id || companyId || 1;
          
          if (!lead.company_id && !companyId) {
            await logSystem('warn', 'Conversion triggered with fallback companyId (1)', { leadId });
          }

          const { id: invoiceId, invoiceNumber } = await createNewInvoice({
            clientId,
            subscriptionId,
            companyId: finalCompanyId, // Strict enforcement
            amount: amount || 0,
            finalAmount: amount || 0,
            paidAmount: amount || 0,
            status: 'paid',
            gateway,
            transactionId,
            notes: 'Created via Lead Conversion'
          });

          await logSystem('info', `Invoice ${invoiceNumber} created via conversion`, { invoiceId });

          const fullInvoice = await getFullInvoiceForEmail(invoiceId);
          if (fullInvoice) {
            // Attach credentials from lead for the onboarding email
            await sendInvoiceEmail({
              ...fullInvoice,
              username: lead.username,
              password: lead.password
            });
            await logSystem('info', `Invoice ${invoiceNumber} emailed safely with credentials`, { to: fullInvoice.client_email });
          } else {
            await logSystem('error', `Failed to fetch details for converted invoice ${invoiceId}`);
          }
        } catch (err: any) {
          console.error(`[Lead Convert] Invoicing/Email failed: ${err.message}`);
          await logSystem('error', `Conversion Invoicing/Email failed: ${err.message}`, { clientId });
        }
      })();
    }

    // --- NEW: Log Creation in History ---
    if (subscriptionId) {
      try {
        const [historyResult] = await connection.query(
          `
            INSERT INTO subscription_history (
              subscription_id, client_id, company_id, new_plan_id,
              event_type, amount, start_date, end_date, notes, transaction_id, gateway
            )
            VALUES (?, ?, ?, ?, 'CREATION', ?, ?, ?, 'Subscription created via lead conversion', ?, ?)
          `,
          [
            subscriptionId,
            clientId,
            companyId,
            saasPlanId,
            amount || 0,
            today,
            endDate,
            transactionId,
            gateway,
          ]
        );
      } catch (historyErr) {
        console.error('Failed to log lead conversion subscription history:', historyErr);
      }
    }

    await connection.query(
      `
        UPDATE leads
        SET
          is_converted = 1,
          converted_to_client_id = ?,
          status = 'won'
        WHERE id = ?
      `,
      [clientId, leadId]
    );

    await connection.commit();

    // 2. Trigger External Company Registration in background
    const { triggerExternalCompanyRegistration } = await import('@/lib/external-registration');
    (async () => {
      try {
        await triggerExternalCompanyRegistration({
          companyName: lead.company_name || clientDisplayName,
          planId: saasPlanId,
          amount: amount || 0,
          endDate: endDate,
          user: {
            name: lead.full_name || 'Client User',
            username: lead.username || lead.email,
            pass: lead.password || 'admin123'
          }
        });
      } catch (err: any) {
        console.error(`[Background] Error during conversion registration trigger: ${err.message}`);
      }
    })();

    return NextResponse.json({ success: true, clientId: String(clientId), subscriptionId, displayName: clientDisplayName });
  } catch (err: any) {
    await connection.rollback();
    return NextResponse.json({ error: err?.message || 'Conversion failed.' }, { status: 500 });
  } finally {
    connection.release();
  }
}
