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
    const companyName = String(body?.company || '').trim();
    const phone = String(body?.phone || '').trim();
    const message = String(body?.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const platformId = body?.platformId ? Number(body.platformId) : null;
    const saasPlanId = body?.saasPlanId ? Number(body.saasPlanId) : null;

    const [companyRows] = await mysqlPool.query<CompanyRow[]>(
      `
        SELECT id, name
        FROM companies
        ORDER BY createdAt ASC
        LIMIT 1
      `
    );

    const company = companyRows[0];
    
    // Generate unique password
    const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const [leadResult] = await mysqlPool.query<any>(
      `
        INSERT INTO leads (
          title,
          name,
          full_name,
          email,
          phone,
          company_name,
          source,
          username,
          password_hash,
          password,
          status,
          notes,
          is_converted,
          company_id,
          platform_id,
          saas_plan_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        `Website Inquiry - ${name}`,
        name,
        name,
        email,
        phone || null,
        companyName || company?.name || 'Website',
        'website',
        email,
        passwordHash,
        generatedPassword,
        'new',
        `Source: Website Contact Form\n\nPlatform Request: ${platformId || 'None'}\nPlan Request: ${saasPlanId || 'None'}\n\n${message}`,
        0,
        company?.id || null,
        platformId,
        saasPlanId,
      ]
    );

    // Send Background Email (Async)
    (async () => {
      try {
        const { sendEmail } = await import('@/lib/mail-service');
        const { logSystem } = await import('@/lib/mysql-logger');
        
        let platformName = '';
        let planName = '';

        if (platformId) {
          const [rows] = await mysqlPool.query<any>('SELECT name FROM saas_platforms WHERE id = ?', [platformId]);
          if (rows?.[0]) platformName = rows[0].name;
        }
        if (saasPlanId) {
          const [rows] = await mysqlPool.query<any>('SELECT name FROM saas_plans WHERE id = ?', [saasPlanId]);
          if (rows?.[0]) planName = rows[0].name;
        }

        const interestText = platformName 
          ? `You are interested in our <strong>${platformName}</strong> platform ${planName ? `with the <strong>${planName}</strong> plan` : ''}.`
          : 'Thank you for reaching out to us.';

        const html = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 25px; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-bottom: 20px;">Hi ${name},</h2>
            <p style="font-size: 16px; line-height: 1.6;">Thank you for getting in touch with us! We have received your inquiry regarding our services.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 15px; color: #1e293b;">
                ${interestText}
              </p>
            </div>

            <p style="font-size: 15px; line-height: 1.6;">Our team is currently reviewing your message and we will get back to you within the next 24 hours to discuss how we can help you get started.</p>
            
            <p style="font-size: 15px; margin-top: 30px;">Best Regards,<br/><strong>Shaarvik Technologies Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">This is an automated confirmation of your request. No reply is needed.</p>
          </div>
        `;

        await sendEmail({
          to: email,
          subject: 'Thank you for your inquiry - Shaarvik Technologies',
          text: `Hi ${name}, thank you for your interest in ${platformName || 'our services'}. Our team will get back to you shortly.`,
          html
        });

        await logSystem('info', 'Automated inquiry response sent', { to: email, platform: platformName });
      } catch (err: any) {
        console.error('Failed to send automated inquiry response:', err);
      }
    })();

    return NextResponse.json({ ok: true, leadId: String(leadResult.insertId) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to submit contact form.' },
      { status: 500 }
    );
  }
}
