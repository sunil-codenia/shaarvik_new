import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Google Ads Lead Form Extension payload structure
    // https://developers.google.com/google-ads/api/docs/lead-form-extensions
    const {
      lead_id,
      user_column_data = [],
      campaign_id,
      campaign_name,
      adgroup_id,
      adgroup_name,
      creative_id,
      creative_name,
      form_id,
      form_name,
      gcl_id,
      api_version,
      // UTM params may be passed via custom questions
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    } = body;

    // Extract lead fields from user_column_data array
    // Google sends: [{ column_id: "FULL_NAME", string_value: "..." }, ...]
    const extractField = (columnId: string): string | null => {
      const col = user_column_data.find(
        (c: { column_id: string; string_value?: string }) =>
          c.column_id === columnId
      );
      return col?.string_value ?? null;
    };

    const fullName =
      extractField('FULL_NAME') ||
      [extractField('FIRST_NAME'), extractField('LAST_NAME')]
        .filter(Boolean)
        .join(' ') ||
      null;
    const email = extractField('EMAIL');
    const phone = extractField('PHONE_NUMBER');
    const companyName = extractField('COMPANY_NAME');

    if (!fullName && !email && !phone) {
      return NextResponse.json(
        { error: 'No identifiable lead data received' },
        { status: 400 }
      );
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        full_name: fullName,
        email: email,
        phone: phone,
        company_name: companyName,
        status: 'new',
        notes: `Captured via Google Ads Lead Form. Form: ${form_name || form_id || 'Unknown'}`,
        ad_platform: 'google_ads',
        ad_campaign_id: campaign_id ? String(campaign_id) : null,
        ad_campaign_name: campaign_name || null,
        ad_set_id: adgroup_id ? String(adgroup_id) : null,
        ad_set_name: adgroup_name || null,
        ad_id: creative_id ? String(creative_id) : null,
        ad_name: creative_name || null,
        utm_source: utm_source || 'google',
        utm_medium: utm_medium || 'cpc',
        utm_campaign: utm_campaign || campaign_name || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        webhook_source: 'google_ads_lead_form',
        webhook_received_at: new Date().toISOString(),
        raw_webhook_payload: body,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Google Ads Webhook] DB insert error:', error);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    console.log('[Google Ads Webhook] Lead captured:', lead?.id, '| Campaign:', campaign_name);
    return NextResponse.json({ success: true, lead_id: lead?.id }, { status: 200 });
  } catch (err) {
    console.error('[Google Ads Webhook] Parse error:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// Google Ads sends a GET request to verify the webhook endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'Google Ads webhook endpoint active' }, { status: 200 });
}
