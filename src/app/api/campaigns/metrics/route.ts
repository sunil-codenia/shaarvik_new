import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');

    // Build campaign query — plain SELECT with no company/user filter
    let campaignQuery = supabase
      .from('campaigns')
      .select('id, name, platform, status, budget, spent_amount, start_date, mode')
      .order('created_at', { ascending: false });

    if (campaignId) campaignQuery = campaignQuery.eq('id', campaignId);

    const { data: campaigns, error } = await campaignQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich each campaign with real calculated metrics
    const enriched = await Promise.all(
      (campaigns || []).map(async (c: any) => {
        const [leadsRes, conversionsRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', c.id),
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', c.id)
            .eq('is_converted', true),
        ]);

        const leadsCount = leadsRes.count || 0;
        const conversions = conversionsRes.count || 0;
        const spent = Number(c.spent_amount || 0);
        const cpl = leadsCount > 0 && spent > 0 ? spent / leadsCount : 0;

        return {
          id: c.id,
          name: c.name,
          platform: c.platform,
          status: c.status,
          budget: Number(c.budget || 0),
          spentAmount: spent,
          startDate: c.start_date || '',
          mode: c.mode || 'manual',
          leadsCount,
          conversions,
          revenue: 0,
          cpl,
          roi: 0,
        };
      })
    );

    // Aggregate totals
    const totals = {
      totalBudget: enriched.reduce((s, c) => s + c.budget, 0),
      totalSpent: enriched.reduce((s, c) => s + c.spentAmount, 0),
      totalLeads: enriched.reduce((s, c) => s + c.leadsCount, 0),
      totalConversions: enriched.reduce((s, c) => s + c.conversions, 0),
      totalRevenue: 0,
      activeCampaigns: enriched.filter(c => c.status === 'active').length,
      overallROI: 0,
    };

    return NextResponse.json({ campaigns: enriched, totals });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
