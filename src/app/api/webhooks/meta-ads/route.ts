import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Meta Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'meta_verify_clientflow';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Meta Lead Ads Webhook (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends: { object: "page", entry: [{ changes: [{ value: { leadgen_id, page_id, form_id, ad_id, campaign_id, ... } }] }] }
    const entries = body?.entry ?? [];

    const results: { lead_id: string }[] = [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        if (change?.field !== 'leadgen') continue;

        const val = change?.value ?? {};
        const {
          leadgen_id,
          page_id,
          form_id,
          ad_id,
          adgroup_id,
          campaign_id,
          campaign_name,
          ad_name,
          adset_name,
          // field_data is present when Meta sends full lead data
          field_data = [],
        } = val;

        // Extract fields from field_data array
        // Meta sends: [{ name: "full_name", values: ["John Doe"] }, ...]
        const extractField = (fieldName: string): string | null => {
          const field = field_data.find(
            (f: { name: string; values?: string[] }) => f.name === fieldName
          );
          return field?.values?.[0] ?? null;
        };

        const fullName =
          extractField('full_name') ||
          [extractField('first_name'), extractField('last_name')]
            .filter(Boolean)
            .join(' ') ||
          `Meta Lead ${leadgen_id || 'Unknown'}`;

        const email = extractField('email');
        const phone = extractField('phone_number') || extractField('phone');
        const companyName = extractField('company_name');

        const { data: lead, error } = await supabase
          .from('leads')
          .insert({
            full_name: fullName,
            email: email,
            phone: phone,
            company_name: companyName,
            status: 'new',
            notes: `Captured via Meta Lead Ads. Form ID: ${form_id || 'Unknown'}. Lead ID: ${leadgen_id || 'Unknown'}`,
            ad_platform: 'meta_ads',
            ad_campaign_id: campaign_id ? String(campaign_id) : null,
            ad_campaign_name: campaign_name || null,
            ad_set_id: adgroup_id ? String(adgroup_id) : null,
            ad_set_name: adset_name || null,
            ad_id: ad_id ? String(ad_id) : null,
            ad_name: ad_name || null,
            utm_source: 'facebook',
            utm_medium: 'paid_social',
            utm_campaign: campaign_name || null,
            utm_content: ad_name || null,
            utm_term: null,
            webhook_source: 'meta_lead_ads',
            webhook_received_at: new Date().toISOString(),
            raw_webhook_payload: val,
          })
          .select('id')
          .single();

        if (error) {
          console.error('[Meta Webhook] DB insert error:', error);
        } else if (lead) {
          results.push({ lead_id: lead.id });
          console.log('[Meta Webhook] Lead captured:', lead.id, '| Campaign:', campaign_name);
        }
      }
    }

    return NextResponse.json({ success: true, leads_captured: results.length, leads: results }, { status: 200 });
  } catch (err) {
    console.error('[Meta Webhook] Parse error:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
