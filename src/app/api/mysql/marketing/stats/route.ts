import { NextRequest, NextResponse } from 'next/server';
import { listCampaignsWithPerformance } from '@/lib/mysql-leads';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required.' },
        { status: 400 }
      );
    }

    const campaigns = await listCampaignsWithPerformance(companyId);

    // Calculate global stats
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsCount, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spentAmount, 0);
    const blendedROI = totalSpent > 0 ? totalRevenue / totalSpent : 0;

    return NextResponse.json({
      campaigns,
      stats: {
        activeCampaigns,
        totalLeads,
        totalRevenue,
        blendedROI
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load marketing stats.' },
      { status: 500 }
    );
  }
}
