import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // LinkedIn Lead Gen Forms webhook payload structure
    // https://learn.microsoft.com/en-us/linkedin/marketing/integrations/lead-generation/lead-sync-api
    const {
      leadId,
      formId,
      formName,
      campaignId,
      campaignName,
      creativeId,
      creativeName,
      accountId,
      accountName,
      submittedAt,
      // Lead field values
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      company,
      title,
      linkedInProfileUrl,
      // Alternative nested structure
      fieldValues = [],
    } = body;

    // Support both flat and nested field_values structures
    const extractFieldValue = (fieldName: string): string | null => {
      const field = fieldValues.find(
        (f: { name?: string; questionId?: string; values?: string[] }) =>
          f.name === fieldName || f.questionId === fieldName
      );
      return field?.values?.[0] ?? null;
    };

    const resolvedFirstName = firstName || extractFieldValue('firstName') || extractFieldValue('first_name');
    const resolvedLastName = lastName || extractFieldValue('lastName') || extractFieldValue('last_name');
    const resolvedEmail = emailAddress || extractFieldValue('emailAddress') || extractFieldValue('email');
    const resolvedPhone = phoneNumber || extractFieldValue('phoneNumber') || extractFieldValue('phone');
    const resolvedCompany = company || extractFieldValue('company') || accountName || null;
    const resolvedTitle = title || extractFieldValue('title') || null;

    const fullName =
      [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ') ||
      `LinkedIn Lead ${leadId || 'Unknown'}`;

    if (!fullName && !resolvedEmail && !resolvedPhone) {
      return NextResponse.json(
        { error: 'No identifiable lead data received' },
        { status: 400 }
      );
    }

    const notesArr = [
      `Captured via LinkedIn Lead Gen Form.`,
      formName ? `Form: ${formName}` : null,
      resolvedTitle ? `Title: ${resolvedTitle}` : null,
      linkedInProfileUrl ? `LinkedIn: ${linkedInProfileUrl}` : null,
    ].filter(Boolean);

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        full_name: fullName,
        email: resolvedEmail || null,
        phone: resolvedPhone || null,
        company_name: resolvedCompany,
        status: 'new',
        notes: notesArr.join(' | '),
        ad_platform: 'linkedin_ads',
        ad_campaign_id: campaignId ? String(campaignId) : null,
        ad_campaign_name: campaignName || null,
        ad_set_id: null,
        ad_set_name: null,
        ad_id: creativeId ? String(creativeId) : null,
        ad_name: creativeName || null,
        utm_source: 'linkedin',
        utm_medium: 'paid_social',
        utm_campaign: campaignName || null,
        utm_content: creativeName || null,
        utm_term: null,
        webhook_source: 'linkedin_lead_gen',
        webhook_received_at: new Date().toISOString(),
        raw_webhook_payload: body,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[LinkedIn Webhook] DB insert error:', error);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    console.log('[LinkedIn Webhook] Lead captured:', lead?.id, '| Campaign:', campaignName);
    return NextResponse.json({ success: true, lead_id: lead?.id }, { status: 200 });
  } catch (err) {
    console.error('[LinkedIn Webhook] Parse error:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// LinkedIn may send a GET challenge for webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challengeCode');
  if (challenge) {
    return NextResponse.json({ challengeCode: challenge }, { status: 200 });
  }
  return NextResponse.json({ status: 'LinkedIn Ads webhook endpoint active' }, { status: 200 });
}
