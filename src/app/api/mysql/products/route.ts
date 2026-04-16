import { NextRequest, NextResponse } from 'next/server';
import { listActiveProducts } from '@/lib/mysql-crm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const products = await listActiveProducts();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
