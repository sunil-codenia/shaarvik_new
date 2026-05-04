import { NextRequest, NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { 
  getSubscriptionById, 
  updateSubscription, 
  createSubscriptionHistory 
} from '@/lib/mysql-crm';
import { createNewInvoice, getFullInvoiceForEmail } from '@/lib/mysql-crm-invoices';
import { sendInvoiceEmail } from '@/lib/mail-service';
import { logSystem } from '@/lib/mysql-logger';
import { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

/**
 * Subscription Renewal/Upgrade API
 * 
 * Handles:
 * 1. Updating the subscription record.
 * 2. Logging the change in subscription_history (ledger).
 * 3. Syncing with external company registration API if plan changes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subId = String(body?.subscriptionId || '').trim();
    const newPlanId = body?.newPlanId ? Number(body.newPlanId) : null;
    const startDate = body?.startDate ? String(body.startDate) : null; // "YYYY-MM-DD"
    const endDate = body?.endDate ? String(body.endDate) : null;     // "YYYY-MM-DD"
    const amount = Number(body?.amount || 0);
    const amountPaid = Number(body?.amountPaid || 0);
    const billingCycle = String(body?.billingCycle || 'monthly');
    const paymentMode = String(body?.paymentMode || 'online');
    const notes = body?.notes || 'Subscription renewed/updated';
    const transactionId = body?.transactionId || null;
    const gateway = body?.gateway || null;

    if (!subId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
    }

    // 1. Get current subscription
    const currentSub = await getSubscriptionById(subId);
    if (!currentSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const oldPlanId = currentSub.saas_plan_id;
    const isPlanChanged = newPlanId !== null && Number(oldPlanId) !== Number(newPlanId);
    const eventType = isPlanChanged 
      ? (Number(amount) >= Number(currentSub.amount) ? 'UPGRADE' : 'DOWNGRADE')
      : 'RENEWAL';

    // 2. Insert record into Ledger (BEFORE updating current sub)
    await createSubscriptionHistory({
      subscriptionId: subId,
      clientId: currentSub.client_id,
      companyId: currentSub.company_id,
      previousPlanId: oldPlanId,
      newPlanId: newPlanId || oldPlanId,
      eventType: eventType,
      amount: amount,
      startDate: startDate || currentSub.start_date,
      endDate: endDate || currentSub.end_date,
      notes: notes,
      transactionId,
      gateway,
    });

    // 3. Update active subscription
    await updateSubscription(subId, {
      saasPlanId: newPlanId ? String(newPlanId) : null,
      billingCycle,
      startDate,
      endDate,
      amount,
      amountPaid,
      paymentMode,
      notes: `Updated via ${eventType}: ${notes}`,
      status: 'active',
      transactionId,
      gateway,
    });

    // 4. Generate Invoice and Send Email (Background)
    (async () => {
      try {
        await logSystem('info', `Background invoicing started for ${eventType}`, { subId, companyId: currentSub.company_id });

        // Create Invoice Record
        const { id: invoiceId, invoiceNumber } = await createNewInvoice({
          clientId: currentSub.client_id,
          subscriptionId: subId,
          companyId: currentSub.company_id,
          amount: amount,
          finalAmount: amount,
          paidAmount: amountPaid,
          status: amountPaid >= amount ? 'paid' : 'pending',
          gateway: gateway,
          transactionId: transactionId,
          notes: `${eventType}: ${notes}`
        });

        await logSystem('info', `Invoice ${invoiceNumber} created for ${eventType}`, { invoiceId });

        // Fetch enriched details and Email PDF
        const fullInvoice = await getFullInvoiceForEmail(invoiceId);
        if (fullInvoice) {
          await sendInvoiceEmail(fullInvoice);
          await logSystem('info', `Invoice ${invoiceNumber} emailed successfully`, { to: fullInvoice.client_email });
        } else {
          await logSystem('error', `Failed to fetch enriched details for invoice ${invoiceId}`);
        }
      } catch (err: any) {
        console.error(`[Renewal API] Invoicing/Email failed: ${err.message}`);
        await logSystem('error', `Renewal Invoicing/Email failed: ${err.message}`, { subId });
      }
    })();

    // 5. Sync with External API
    const { triggerExternalCompanyRegistration } = await import('@/lib/external-registration');
    (async () => {
      try {
        // Fetch Admin user for this company
        const [userRows] = await mysqlPool.query<any[]>(
          `
            SELECT fullName, email 
            FROM profiles 
            WHERE companyId = ? AND (role = 'admin' OR role = 'staff')
            ORDER BY (role = 'admin') DESC, createdAt ASC
            LIMIT 1
          `,
          [currentSub.company_id]
        );

        const adminUser = userRows[0] || { fullName: 'Client', email: currentSub.client_email };

        await triggerExternalCompanyRegistration({
          companyName: currentSub.company_name || currentSub.client_display_name,
          planId: newPlanId || currentSub.saas_plan_id,
          amount: amount,
          endDate: endDate || currentSub.end_date,
          user: {
            name: adminUser.fullName,
            username: adminUser.email,
            pass: '********' // Placeholder for existing users
          }
        });
        console.log(`[Renewal API] External sync triggered for ${currentSub.company_name} due to ${eventType}`);
      } catch (err: any) {
        console.error(`[Renewal API] External sync failed: ${err.message}`);
      }
    })();

    return NextResponse.json({ 
      success: true, 
      message: `Subscription ${eventType.toLowerCase()} successful. History logged.`,
      eventType 
    });

  } catch (error: any) {
    console.error('Subscription Renewal Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to renew subscription.' }, { status: 500 });
  }
}
