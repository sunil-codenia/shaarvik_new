import { NextResponse } from 'next/server';
import { mysqlPool } from '@/lib/mysql';
import { getLeadById } from '@/lib/mysql-leads';

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
            client_id,
            company_id,
            saas_plan_id,
            billing_cycle,
            payment_mode,
            amount,
            amount_paid,
            start_date,
            end_date,
            status,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `,
        [
          clientId,
          companyId,
          saasPlanId,
          billingCycle || 'monthly',
          paymentMode || 'online',
          amount || 0,
          amount || 0,
          today,
          endDate,
          notes,
        ]
      );
      subscriptionId = String(subResult.insertId);
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
    (async () => {
      try {
        const registrationUrl = process.env.COMPANY_REGISTRATION_URL || 'http://127.0.0.1:8000';
        
        // Fetch Plan Name and Platform Name (Subscription Planner)
        let planName = 'Standard Plan';
        let platformName = clientDisplayName; // Fallback
        let externalModuleIds: number[] = [];

        if (saasPlanId) {
          const [planRows] = await mysqlPool.query<any[]>(
            `
              SELECT sp.name as plan_name, spl.name as platform_name
              FROM saas_plans sp
              JOIN saas_platforms spl ON sp.platform_id = spl.id
              WHERE sp.id = ?
            `,
            [saasPlanId]
          );
          if (planRows[0]) {
            planName = planRows[0].plan_name;
            platformName = planRows[0].platform_name;
          }

          // Fetch External Module IDs
          const [moduleRows] = await mysqlPool.query<any[]>(
            `
              SELECT sm.external_id 
              FROM saas_modules sm
              JOIN saas_plan_modules spm ON spm.module_id = sm.id
              WHERE spm.plan_id = ?
            `,
            [saasPlanId]
          );
          externalModuleIds = moduleRows
            .map(m => m.external_id)
            .filter(id => id != null) as number[];
        }

        const payload = {
          company: {
            name: platformName, // Using Subscription Planner / Platform Name
            status: 'Active',
            db_conn_name: 'mysql'
          },
          plan_name: planName,
          modules: externalModuleIds,
          user: {
            name: lead.full_name || 'Client User',
            username: lead.username || lead.email,
            pass: lead.password || 'admin123',
            role_id: 1,
            site_id: 45,
            status: 'Active',
            mobile_only: 'no'
          }
        };

        console.log(`[Background] Registering company on conversion (Platform: ${platformName}): ${clientDisplayName}`);
        
        const extRes = await fetch(`${registrationUrl}/api/register_company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!extRes.ok) {
          console.error(`[Background] Conversion Registration API failed: ${extRes.status} ${extRes.statusText}`);
        } else {
          console.log(`[Background] Conversion Registration API successful for ${clientDisplayName}`);
        }
      } catch (err: any) {
        console.error(`[Background] Error during conversion registration: ${err.message}`);
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
