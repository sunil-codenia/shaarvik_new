import { mysqlPool } from '@/lib/mysql';
import { logSystem } from '@/lib/mysql-logger';

/**
 * Centrally triggers the external company registration API.
 * Consolidates payload construction and background fetch.
 */
export async function triggerExternalCompanyRegistration(input: {
  companyName: string;
  planId: string | number | null;
  amount: number;
  endDate: string | null;
  user: {
    name: string;
    username: string;
    pass: string;
    role_id?: number;
    site_id?: number | string;
    status?: string;
    mobile_only?: string;
  };
}) {
  const registrationUrl = process.env.COMPANY_REGISTRATION_URL || 'http://127.0.0.1:8000';

  try {
    let planName = 'Standard Plan';
    let platformName = input.companyName; // Fallback
    let externalModuleIds: number[] = [];

    // 1. Fetch Plan, Platform, and Modules if planId exists
    if (input.planId) {
      const [planRows] = await mysqlPool.query<any[]>(
        `
          SELECT sp.name as plan_name, spl.name as platform_name
          FROM saas_plans sp
          JOIN saas_platforms spl ON sp.platform_id = spl.id
          WHERE sp.id = ?
        `,
        [input.planId]
      );

      if (planRows[0]) {
        planName = planRows[0].plan_name;
        platformName = planRows[0].platform_name;
      }

      const [moduleRows] = await mysqlPool.query<any[]>(
        `
          SELECT sm.external_id 
          FROM saas_modules sm
          JOIN saas_plan_modules spm ON spm.module_id = sm.id
          WHERE spm.plan_id = ?
        `,
        [input.planId]
      );
      externalModuleIds = moduleRows
        .map(m => m.external_id)
        .filter(id => id != null) as number[];
    }

    // 2. Format Expiry Date (DD-MM-YYYY)
    let formattedExpiry = '00-00-0000';
    if (input.endDate) {
      const date = new Date(input.endDate);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        formattedExpiry = `${day}-${month}-${year}`;
      }
    }

    // 3. Construct Payload
    const payload = {
      company: {
        name: input.companyName,
        status: 'Active',
        db_conn_name: 'mysql'
      },
      subscription_plaatform_name: platformName,
      plan_name: planName,
      plan_amount: input.amount,
      Expired: formattedExpiry,
      modules: externalModuleIds,
      user: {
        name: input.user.name || 'Client User',
        username: input.user.username,
        role_id: input.user.role_id ?? 1,
        site_id: input.user.site_id ?? 45,
        status: input.user.status ?? 'Active',
        mobile_only: input.user.mobile_only ?? 'no',
        ...(input.user.pass !== '********' && { pass: input.user.pass })
      }
    };

    console.log(`[External Registration] Triggering for ${input.companyName} (${planName})`, { userPayload: payload.user });
    
    // Perform fetch (don't wait for response since it's background/async in routes)
    const extRes = await fetch(`${registrationUrl}/api/register_company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!extRes.ok) {
      const errorText = await extRes.text();
      console.error(`[External Registration] API failed: ${extRes.status} ${errorText}`);
      await logSystem('error', `External registration failed for ${input.companyName}: ${extRes.status}`);
    } else {
      console.log(`[External Registration] Successful for ${input.companyName}`);
    }
  } catch (err: any) {
    console.error(`[External Registration] Error: ${err.message}`);
    await logSystem('error', `External registration error for ${input.companyName}: ${err.message}`);
  }
}
