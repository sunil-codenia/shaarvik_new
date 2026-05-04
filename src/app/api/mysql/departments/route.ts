import { NextRequest, NextResponse } from 'next/server';
import { listDepartments, createDepartment } from '@/lib/mysql-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const departments = await listDepartments();
    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load departments.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const description = String(body?.description || '').trim() || null;

    if (!name) {
      return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
    }

    const department = await createDepartment({ name, description });
    return NextResponse.json(department);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create department.' },
      { status: 500 }
    );
  }
}
