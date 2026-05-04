import { NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Fetch active platforms
    const [platforms] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, name FROM saas_platforms WHERE is_active = 1 ORDER BY name ASC'
    );

    // Fetch active plans
    const [plans] = await mysqlPool.query<RowDataPacket[]>(
      'SELECT id, platform_id, name, price, billing_cycle FROM saas_plans WHERE is_active = 1 ORDER BY price ASC'
    );

    return NextResponse.json({
      platforms,
      plans
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch configuration.' },
      { status: 500 }
    );
  }
}
